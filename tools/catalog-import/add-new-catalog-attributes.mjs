#!/usr/bin/env node
import { readFile } from 'node:fs/promises';

const envText = await readFile(new URL('../../.env', import.meta.url), 'utf8');
const env = Object.fromEntries(envText.split(/\r?\n/).filter((line) => line && !line.startsWith('#')).map((line) => {
  const i = line.indexOf('='); return [line.slice(0, i), line.slice(i + 1)];
}));
const base = env.COMMERCE_REST_BASE.replace(/\/$/, '');
const tokenBody = new URLSearchParams({
  grant_type: 'client_credentials', client_id: env.COMMERCE_CLIENT_ID,
  client_secret: env.COMMERCE_CLIENT_SECRET,
  scope: env.COMMERCE_SCOPES || 'openid,AdobeID,additional_info.projectedProductContext,email,org.read,additional_info.roles,profile,commerce.accs',
});
const tokenResponse = await fetch(env.COMMERCE_TOKEN_URL || 'https://ims-na1.adobelogin.com/ims/token/v3', {
  method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: tokenBody,
});
if (!tokenResponse.ok) throw new Error(`IMS token request failed: ${tokenResponse.status}`);
const token = (await tokenResponse.json()).access_token;

async function api(method, path, body, allow404 = false) {
  const response = await fetch(`${base}/V1${path}`, { method, headers: {
    authorization: `Bearer ${token}`, 'content-type': 'application/json', accept: 'application/json',
    store: 'default', 'user-agent': 'Mozilla/5.0',
  }, body: body ? JSON.stringify(body) : undefined });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (allow404 && response.status === 404) return null;
  if (!response.ok) throw new Error(`${method} ${path}: ${response.status} ${data?.message || text}`);
  return data;
}

const definitions = [
  ['print_speed', 'Print Speed'], ['resolution', 'Resolution'], ['connectivity', 'Connectivity'],
  ['page_yield', 'Page Yield'], ['tape_width', 'Tape Width'],
];
const colorLabels = ['Black', 'Cyan', 'Magenta', 'Yellow', 'Black on White', 'Black on Clear', 'Black on Red', 'Black on Blue', 'Black on Yellow', 'Black on Green'];
const created = [], existing = [], addedColors = [];

for (const [code, label] of definitions) {
  const found = await api('GET', `/products/attributes/${code}`, null, true);
  if (found) { existing.push(code); continue; }
  await api('POST', '/products/attributes', { attribute: {
    attribute_code: code, frontend_input: 'text', backend_type: 'varchar', default_frontend_label: label,
    frontend_labels: [{ store_id: 0, label }], is_required: false, scope: 'global', is_user_defined: true,
    is_unique: false, is_filterable: 0, is_filterable_in_search: false, is_searchable: '1',
    is_comparable: '1', is_visible_on_front: '1', used_in_product_listing: '1', is_html_allowed_on_front: false,
  }});
  created.push(code);
}

const colorOptions = await api('GET', '/products/attributes/color/options');
const haveColors = new Set(colorOptions.map((option) => (option.label || '').trim()));
for (const label of colorLabels) if (!haveColors.has(label)) {
  await api('POST', '/products/attributes/color/options', { option: {
    label, sort_order: 0, is_default: false, store_labels: [{ store_id: 0, label }],
  }});
  addedColors.push(label);
}

const sets = (await api('GET', '/products/attribute-sets/sets/list?searchCriteria[pageSize]=200')).items || [];
const defaultSet = sets.find((set) => set.attribute_set_name === 'Default');
if (!defaultSet) throw new Error('Default attribute set was not found');
const setId = defaultSet.attribute_set_id;
const groups = (await api('GET', `/products/attribute-sets/groups/list?searchCriteria[filterGroups][0][filters][0][field]=attribute_set_id&searchCriteria[filterGroups][0][filters][0][value]=${setId}&searchCriteria[filterGroups][0][filters][0][conditionType]=eq&searchCriteria[pageSize]=200`)).items || [];
const group = groups.find((item) => /general/i.test(item.attribute_group_name)) || groups[0];
if (!group) throw new Error('No attribute group exists in Default');
for (const [code] of definitions) {
  try { await api('POST', '/products/attribute-sets/attributes', {
    attributeSetId: setId, attributeGroupId: group.attribute_group_id, attributeCode: code, sortOrder: 100,
  }); } catch (error) { if (!/already|assigned/i.test(error.message)) throw error; }
}

const verified = {};
for (const [code] of definitions) {
  const attribute = await api('GET', `/products/attributes/${code}`);
  verified[code] = { input: attribute.frontend_input, backend: attribute.backend_type, set: 'Default' };
}
const finalColors = await api('GET', '/products/attributes/color/options');
verified.color_options = colorLabels.filter((label) => finalColors.some((option) => option.label === label));
console.log(JSON.stringify({ created, existing, addedColors, verified }, null, 2));
