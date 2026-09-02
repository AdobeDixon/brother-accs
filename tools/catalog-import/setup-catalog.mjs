#!/usr/bin/env node
/**
 * Automated Brother catalog setup for Adobe Commerce (ACCS) via the REST API.
 *
 * Runs in strict dependency order so attributes exist before products:
 *   1. custom attributes (+ select/multiselect options)
 *   2. attribute sets (cloned from Default) + attribute assignment
 *   3. category tree (from each product's category path)
 *   4. products (custom values resolved to option IDs, categories linked)
 *
 * Idempotent: existing attributes/sets/options/categories/products are detected
 * and reused/updated, so it is safe to re-run.
 *
 * Usage:
 *   COMMERCE_REST_BASE="https://<host>/rest/all/V1" \
 *   COMMERCE_TOKEN="<admin-bearer-token>" \
 *   node tools/catalog-import/setup-catalog.mjs [--dry-run] [--skip-products]
 *
 * Env:
 *   COMMERCE_REST_BASE  REST base incl. /V1 (e.g. https://host/rest/all/V1)  (required)
 *   COMMERCE_TOKEN      Admin/integration bearer token                       (required)
 *   ROOT_CATEGORY_ID    Root to build the tree under (default 2 = Default Category)
 */
import { attributes, attributeSets, products, configurableProducts } from './catalog-data.mjs';

const rawBase = (process.env.COMMERCE_REST_BASE || '').replace(/\/$/, '');
const BASE = rawBase.endsWith('/V1') ? rawBase : `${rawBase}/V1`;
const TOKEN = process.env.COMMERCE_TOKEN || '';
const ROOT_ID = Number(process.env.ROOT_CATEGORY_ID || 2);
const DRY = process.argv.includes('--dry-run');
const SKIP_PRODUCTS = process.argv.includes('--skip-products');

if (!BASE || !TOKEN) {
  console.error('ERROR: set COMMERCE_REST_BASE and COMMERCE_TOKEN environment variables.');
  process.exit(1);
}

const attrByCode = Object.fromEntries(attributes.map((a) => [a.code, a]));
const log = (...a) => console.log(...a);
const plan = { attrCreate: 0, attrExists: 0, optAdd: 0, setCreate: 0, setExists: 0, assign: 0, catCreate: 0, catExists: 0, prod: 0 };

function fmtErr(data, text) {
  if (data && data.message) {
    let m = data.message;
    if (data.parameters) Object.entries(data.parameters).forEach(([k, v]) => { m = m.replace(`%${k}`, v).replace(`%fieldName`, v); });
    return m;
  }
  return text;
}

async function api(method, path, body, { allow404 = false } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Store: 'default',
      'User-Agent': 'Mozilla/5.0',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data; try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (res.status === 404 && allow404) return null;
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${fmtErr(data, text)}`);
  return data;
}

// ---- 1. Attributes ---------------------------------------------------------
const TYPE_MAP = {
  text: { frontend_input: 'text', backend_type: 'varchar' },
  textarea: { frontend_input: 'textarea', backend_type: 'text' },
  select: { frontend_input: 'select', backend_type: 'int' },
  multiselect: { frontend_input: 'multiselect', backend_type: 'varchar' },
  boolean: { frontend_input: 'boolean', backend_type: 'int' },
  decimal: { frontend_input: 'text', backend_type: 'decimal' },
  integer: { frontend_input: 'text', backend_type: 'int' },
};

function attrPayload(def) {
  const { frontend_input, backend_type } = TYPE_MAP[def.type];
  const a = {
    attribute_code: def.code,
    frontend_input,
    backend_type,
    default_frontend_label: def.label,
    frontend_labels: [{ store_id: 0, label: def.label }],
    is_required: false,
    scope: 'global',
    is_user_defined: true,
    is_unique: false,
    is_filterable: def.filterable ? 1 : 0,
    is_filterable_in_search: !!def.filterable,
    is_searchable: def.searchable ? '1' : '0',
    is_comparable: def.comparable ? '1' : '0',
    is_visible_on_front: '1',
    used_in_product_listing: (def.filterable || def.comparable) ? '1' : '0',
    is_html_allowed_on_front: false,
  };
  if (def.type === 'select' || def.type === 'multiselect') {
    a.options = def.options.map((label, i) => ({ label, value: '', sort_order: i, is_default: false }));
  }
  return { attribute: a };
}

async function ensureAttribute(def) {
  const existing = await api('GET', `/products/attributes/${def.code}`, null, { allow404: true });
  if (!existing) {
    log(`  + attribute ${def.code} (${def.type})`);
    plan.attrCreate += 1;
    if (!DRY) await api('POST', '/products/attributes', attrPayload(def));
    return;
  }
  plan.attrExists += 1;
  // Ensure any newly-added select/multiselect options exist.
  if (def.type === 'select' || def.type === 'multiselect') {
    const opts = (await api('GET', `/products/attributes/${def.code}/options`)) || [];
    const have = new Set(opts.map((o) => (o.label || '').trim()).filter(Boolean));
    for (const label of def.options) {
      if (!have.has(label)) {
        log(`  + option ${def.code} = "${label}"`);
        plan.optAdd += 1;
        if (!DRY) await api('POST', `/products/attributes/${def.code}/options`, { option: { label, sort_order: 0, is_default: false, store_labels: [{ store_id: 0, label }] } });
      }
    }
  }
}

async function buildOptionMaps() {
  const maps = {};
  for (const def of attributes) {
    if (def.type !== 'select' && def.type !== 'multiselect') continue;
    const opts = (await api('GET', `/products/attributes/${def.code}/options`)) || [];
    maps[def.code] = Object.fromEntries(opts.filter((o) => o.label && o.value !== '').map((o) => [o.label.trim(), o.value]));
  }
  return maps;
}

// ---- 2. Attribute sets -----------------------------------------------------
async function listSets() {
  const r = await api('GET', '/products/attribute-sets/sets/list?searchCriteria[pageSize]=200');
  return r.items || [];
}

async function ensureAttributeSet(setDef, defaultSetId, sets) {
  let set = sets.find((s) => s.attribute_set_name === setDef.name);
  if (!set) {
    log(`  + attribute set "${setDef.name}"`);
    plan.setCreate += 1;
    if (DRY) return null;
    set = await api('POST', '/products/attribute-sets', {
      attributeSet: { attribute_set_name: setDef.name, sort_order: 10 },
      skeletonId: defaultSetId,
    });
  } else {
    plan.setExists += 1;
  }
  if (DRY) return set ? set.attribute_set_id : null;

  const setId = set.attribute_set_id;
  // Ensure a dedicated group for our specs.
  const groups = (await api('GET', `/products/attribute-sets/groups/list?searchCriteria[filterGroups][0][filters][0][field]=attribute_set_id&searchCriteria[filterGroups][0][filters][0][value]=${setId}&searchCriteria[filterGroups][0][filters][0][conditionType]=eq&searchCriteria[pageSize]=200`)).items || [];
  let group = groups.find((g) => g.attribute_group_name === setDef.group);
  if (!group) {
    group = await api('POST', '/products/attribute-sets/groups', { group: { attribute_group_name: setDef.group, attribute_set_id: setId } });
  }
  // Assign attributes (assigning an already-present attribute throws — ignore).
  let sort = 10;
  for (const code of setDef.attributeCodes) {
    try {
      await api('POST', '/products/attribute-sets/attributes', {
        attributeSetId: setId, attributeGroupId: group.attribute_group_id, attributeCode: code, sortOrder: sort,
      });
      plan.assign += 1;
    } catch (e) {
      if (!/already|assigned/i.test(e.message)) throw e;
    }
    sort += 10;
  }
  return setId;
}

// ---- 3. Categories ---------------------------------------------------------
const catCache = new Map(); // "parentId/name" -> id

function walkTree(node) {
  (node.children_data || []).forEach((c) => { catCache.set(`${node.id}/${c.name}`, c.id); walkTree(c); });
}

async function primeCategories() {
  const tree = await api('GET', '/categories');
  walkTree(tree);
}

async function ensureCategoryPath(path) {
  const parts = path.split('/').slice(1); // drop "Default Category"
  let parentId = ROOT_ID;
  for (const name of parts) {
    const key = `${parentId}/${name}`;
    let id = catCache.get(key);
    if (id == null) {
      log(`  + category "${name}" under ${parentId}`);
      plan.catCreate += 1;
      if (DRY) { id = -1; } else {
        const created = await api('POST', '/categories', { category: { name, parent_id: parentId, is_active: true, include_in_menu: true } });
        id = created.id;
      }
      catCache.set(key, id);
    } else {
      plan.catExists += 1;
    }
    parentId = id;
  }
  return parentId;
}

// ---- 4. Products -----------------------------------------------------------
function buildCustomAttributes(prod, optionMaps) {
  const ca = [
    { attribute_code: 'description', value: prod.description },
    { attribute_code: 'short_description', value: prod.shortDescription },
    { attribute_code: 'url_key', value: prod.sku.toLowerCase() },
  ];
  const custom = { brand: prod.brand, ...prod.custom };
  for (const [code, val] of Object.entries(custom)) {
    const def = attrByCode[code];
    if (!def) { ca.push({ attribute_code: code, value: String(val) }); continue; }
    if (def.type === 'select') {
      const id = optionMaps[code]?.[val];
      if (id != null) ca.push({ attribute_code: code, value: String(id) });
      else log(`    ! ${prod.sku}: no option "${val}" for ${code}`);
    } else if (def.type === 'multiselect') {
      const ids = (val || []).map((v) => optionMaps[code]?.[v]).filter((x) => x != null);
      if (ids.length) ca.push({ attribute_code: code, value: ids.join(',') });
    } else if (def.type === 'boolean') {
      ca.push({ attribute_code: code, value: val ? '1' : '0' });
    } else {
      ca.push({ attribute_code: code, value: String(val) });
    }
  }
  return ca;
}

async function ensureProduct(prod, setIdByName, optionMaps) {
  const categoryId = await ensureCategoryPath(prod.categoryPath);
  const payload = {
    product: {
      sku: prod.sku,
      name: prod.name,
      price: prod.price,
      attribute_set_id: setIdByName[prod.set],
      type_id: prod.type || 'simple',
      status: 1,
      visibility: 4, // Catalog, Search
      weight: prod.weight,
      extension_attributes: {
        stock_item: { qty: 100, is_in_stock: true },
        category_links: categoryId > 0 ? [{ category_id: String(categoryId), position: 0 }] : [],
      },
      custom_attributes: buildCustomAttributes(prod, optionMaps),
    },
  };
  log(`  · ${prod.sku} -> "${prod.set}" / ${prod.categoryPath.split('/').slice(1).join(' > ')}`);
  plan.prod += 1;
  if (!DRY) await api('PUT', `/products/${encodeURIComponent(prod.sku)}`, payload);
}

async function ensureConfigurableProduct(prod, setIdByName, optionMaps) {
  const categoryId = await ensureCategoryPath(prod.categoryPath);
  const payload = {
    product: {
      sku: prod.sku, name: prod.name, price: prod.price,
      attribute_set_id: setIdByName[prod.set], type_id: 'configurable', status: 1,
      visibility: 4, weight: 0,
      extension_attributes: { category_links: categoryId > 0 ? [{ category_id: String(categoryId), position: 0 }] : [] },
      custom_attributes: buildCustomAttributes({ ...prod, brand: 'Brother', custom: {} }, optionMaps),
    },
  };
  log(`  · ${prod.sku} (configurable) -> ${prod.children.join(', ')}`);
  plan.prod += 1;
  if (DRY) return;
  await api('PUT', `/products/${encodeURIComponent(prod.sku)}`, payload);
  for (const childSku of prod.children) {
    try { await api('POST', `/configurable-products/${encodeURIComponent(prod.sku)}/child`, { childSku }); } catch (e) {
      if (!/already|exists/i.test(e.message)) throw e;
    }
  }
}

// ---- Orchestration ---------------------------------------------------------
async function main() {
  log(`\nBrother catalog setup ${DRY ? '(DRY RUN)' : ''}\n  base: ${BASE}\n`);

  log('1) Attributes');
  for (const def of attributes) await ensureAttribute(def);

  log('\n2) Attribute sets');
  const sets = await listSets();
  const defaultSet = sets.find((s) => s.attribute_set_name === 'Default');
  if (!defaultSet && !DRY) throw new Error('Could not find the "Default" product attribute set to clone from.');
  const defaultSetId = defaultSet ? defaultSet.attribute_set_id : null;
  const setIdByName = {};
  for (const setDef of attributeSets) setIdByName[setDef.name] = await ensureAttributeSet(setDef, defaultSetId, sets);

  if (SKIP_PRODUCTS) { summary(); return; }

  log('\n3) Categories + 4) Products');
  await primeCategories();
  const optionMaps = DRY ? {} : await buildOptionMaps();
  for (const prod of products) await ensureProduct(prod, setIdByName, optionMaps);
  for (const prod of configurableProducts) await ensureConfigurableProduct(prod, setIdByName, optionMaps);

  summary();
}

function summary() {
  log(`\nSummary${DRY ? ' (dry run — nothing written)' : ''}:`);
  log(`  attributes:  ${plan.attrCreate} created, ${plan.attrExists} existing, ${plan.optAdd} options added`);
  log(`  sets:        ${plan.setCreate} created, ${plan.setExists} existing, ${plan.assign} attribute assignments`);
  log(`  categories:  ${plan.catCreate} created, ${plan.catExists} existing`);
  log(`  products:    ${plan.prod} upserted`);
}

main().catch((e) => { console.error('\nFAILED:', e.message); process.exit(1); });
