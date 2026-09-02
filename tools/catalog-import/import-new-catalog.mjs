#!/usr/bin/env node
import { readFile } from 'node:fs/promises';

function parseCsv(text) {
  const rows = []; let row = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false; else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field.replace(/\r$/, '')); rows.push(row); row = []; field = ''; }
    else field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const headers = rows.shift();
  return rows.filter((r) => r.some(Boolean)).map((r) => Object.fromEntries(headers.map((h, i) => [h, r[i] || ''])));
}

const envText = await readFile(new URL('../../.env', import.meta.url), 'utf8');
const env = Object.fromEntries(envText.split(/\r?\n/).filter((line) => line && !line.startsWith('#')).map((line) => {
  const i = line.indexOf('='); return [line.slice(0, i), line.slice(i + 1)];
}));
const rows = parseCsv(await readFile(new URL('./brother-products-new-import.csv', import.meta.url), 'utf8').then((s) => s.replace(/^\uFEFF/, '')));
const base = env.COMMERCE_REST_BASE.replace(/\/$/, '');
const auth = await fetch(env.COMMERCE_TOKEN_URL || 'https://ims-na1.adobelogin.com/ims/token/v3', { method: 'POST',
  headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({
    grant_type: 'client_credentials', client_id: env.COMMERCE_CLIENT_ID, client_secret: env.COMMERCE_CLIENT_SECRET,
    scope: env.COMMERCE_SCOPES || 'openid,AdobeID,additional_info.projectedProductContext,email,org.read,additional_info.roles,profile,commerce.accs',
  }) });
if (!auth.ok) throw new Error(`IMS token request failed: ${auth.status}`);
const token = (await auth.json()).access_token;
async function api(method, path, body, allow404 = false) {
  const response = await fetch(`${base}/V1${path}`, { method, headers: { authorization: `Bearer ${token}`,
    'content-type': 'application/json', accept: 'application/json', store: 'default', 'user-agent': 'Mozilla/5.0' },
    body: body ? JSON.stringify(body) : undefined });
  const text = await response.text(); let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (allow404 && response.status === 404) return null;
  if (!response.ok) throw new Error(`${method} ${path}: ${response.status} ${data?.message || text}`);
  return data;
}

const sets = (await api('GET', '/products/attribute-sets/sets/list?searchCriteria[pageSize]=200')).items || [];
const setId = sets.find((s) => s.attribute_set_name === 'Default')?.attribute_set_id;
if (!setId) throw new Error('Default attribute set not found');
const colorAttribute = await api('GET', '/products/attributes/color');
const colorOptions = await api('GET', '/products/attributes/color/options');
const colorIds = Object.fromEntries(colorOptions.filter((o) => o.label && o.value !== '').map((o) => [o.label.trim(), Number(o.value)]));

const parents = rows.filter((r) => r.product_type === 'configurable');
const childParent = new Map();
for (const parent of parents) for (const variant of parent.configurable_variations.split('|')) {
  const values = Object.fromEntries(variant.split(',').map((part) => part.split('=', 2)));
  childParent.set(values.sku, parent);
}

const categoryIds = new Map();
function indexCategories(node) { for (const child of node.children_data || []) { categoryIds.set(`${node.id}/${child.name}`, child.id); indexCategories(child); } }
indexCategories(await api('GET', '/categories'));
async function ensureCategory(path) {
  let parentId = 2;
  for (const name of path.split('/').slice(1)) {
    const key = `${parentId}/${name}`; let id = categoryIds.get(key);
    if (!id) { id = (await api('POST', '/categories', { category: { name, parent_id: parentId, is_active: true, include_in_menu: true } })).id; categoryIds.set(key, id); }
    parentId = id;
  }
  return parentId;
}
const categoryForSku = {};
for (const row of rows) {
  const path = row.categories || childParent.get(row.sku)?.categories;
  if (path) categoryForSku[row.sku] = await ensureCategory(path);
}

const customCodes = ['color', 'print_speed', 'resolution', 'connectivity', 'page_yield', 'tape_width'];
function payload(row) {
  const custom = [
    { attribute_code: 'description', value: row.description }, { attribute_code: 'short_description', value: row.short_description },
    { attribute_code: 'url_key', value: row.url_key }, { attribute_code: 'tax_class_id', value: '2' },
  ];
  for (const code of customCodes) if (row[code]) custom.push({ attribute_code: code, value: code === 'color' ? String(colorIds[row[code]]) : row[code] });
  return { product: { sku: row.sku, name: row.name, attribute_set_id: setId, type_id: row.product_type,
    price: row.price ? Number(row.price) : 0, status: row.product_online === '1' ? 1 : 2,
    visibility: row.visibility === 'Not Visible Individually' ? 1 : 4, weight: Number(row.weight || 0),
    extension_attributes: { category_links: categoryForSku[row.sku] ? [{ category_id: String(categoryForSku[row.sku]), position: 0 }] : [],
      stock_item: row.product_type === 'configurable'
        ? { qty: 0, is_in_stock: row.is_in_stock === '1', manage_stock: false, use_config_manage_stock: false }
        : { qty: Number(row.qty || 0), is_in_stock: row.is_in_stock === '1' } },
    custom_attributes: custom } };
}

const existing = [], created = [];
for (const row of rows.filter((r) => r.product_type === 'simple')) {
  (await api('GET', `/products/${encodeURIComponent(row.sku)}`, null, true) ? existing : created).push(row.sku);
  await api('PUT', `/products/${encodeURIComponent(row.sku)}`, payload(row));
  console.log(`simple ${row.sku}`);
}
for (const parent of parents) {
  (await api('GET', `/products/${encodeURIComponent(parent.sku)}`, null, true) ? existing : created).push(parent.sku);
  await api('PUT', `/products/${encodeURIComponent(parent.sku)}`, payload(parent));
  const variants = parent.configurable_variations.split('|').map((item) => Object.fromEntries(item.split(',').map((part) => part.split('=', 2))));
  const wantedValues = variants.map((v) => ({ value_index: colorIds[v.color] }));
  const currentOptions = await api('GET', `/configurable-products/${encodeURIComponent(parent.sku)}/options/all`);
  if (!currentOptions.some((o) => Number(o.attribute_id) === Number(colorAttribute.attribute_id))) {
    await api('POST', `/configurable-products/${encodeURIComponent(parent.sku)}/options`, { option: {
      attribute_id: colorAttribute.attribute_id, label: 'Color', position: 0, is_use_default: true, values: wantedValues,
    }});
  }
  const currentChildren = await api('GET', `/configurable-products/${encodeURIComponent(parent.sku)}/children`);
  const have = new Set(currentChildren.map((child) => child.sku));
  for (const variant of variants) if (!have.has(variant.sku)) await api('POST', `/configurable-products/${encodeURIComponent(parent.sku)}/child`, { childSku: variant.sku });
  console.log(`configurable ${parent.sku} -> ${variants.map((v) => v.sku).join(', ')}`);
}

const verified = [];
for (const row of rows) {
  const product = await api('GET', `/products/${encodeURIComponent(row.sku)}`);
  verified.push({ sku: product.sku, type: product.type_id, visibility: product.visibility });
}
const links = {};
for (const parent of parents) links[parent.sku] = (await api('GET', `/configurable-products/${encodeURIComponent(parent.sku)}/children`)).map((c) => c.sku);
const sharedCatalogs = (await api('GET', '/sharedCatalog?searchCriteria[pageSize]=100')).items || [];
const publicCatalog = sharedCatalogs.find((catalog) => catalog.type === 1);
if (!publicCatalog) throw new Error('Public shared catalog not found');
const assignedSkus = new Set(await api('GET', `/sharedCatalog/${publicCatalog.id}/products`));
const missingSkus = rows.map((row) => row.sku).filter((sku) => !assignedSkus.has(sku));
if (missingSkus.length) {
  await api('POST', `/sharedCatalog/${publicCatalog.id}/assignProducts`, { products: missingSkus.map((sku) => ({ sku })) });
}
console.log(JSON.stringify({
  created: created.length,
  updated: existing.length,
  verified: verified.length,
  sharedCatalogAssigned: missingSkus.length,
  links,
}, null, 2));
