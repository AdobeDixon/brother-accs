#!/usr/bin/env node
import { readFile } from 'node:fs/promises';

const envText = await readFile(new URL('../../.env', import.meta.url), 'utf8');
const env = Object.fromEntries(envText.split(/\r?\n/)
  .filter((line) => line && !line.startsWith('#'))
  .map((line) => {
    const i = line.indexOf('=');
    return [line.slice(0, i), line.slice(i + 1)];
  }));

const base = env.COMMERCE_REST_BASE.replace(/\/$/, '');
const auth = await fetch(env.COMMERCE_TOKEN_URL || 'https://ims-na1.adobelogin.com/ims/token/v3', {
  method: 'POST',
  headers: { 'content-type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: env.COMMERCE_CLIENT_ID,
    client_secret: env.COMMERCE_CLIENT_SECRET,
    scope: env.COMMERCE_SCOPES || 'openid,AdobeID,additional_info.projectedProductContext,email,org.read,additional_info.roles,profile,commerce.accs',
  }),
});
if (!auth.ok) throw new Error(`IMS token request failed: ${auth.status}`);
const token = (await auth.json()).access_token;

async function api(method, path, body) {
  const response = await fetch(`${base}/V1${path}`, {
    method,
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      accept: 'application/json',
      store: 'default',
      'user-agent': 'Mozilla/5.0',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!response.ok) throw new Error(`${method} ${path}: ${response.status} ${data?.message || text}`);
  return data;
}

const parentSkus = ['LC223-CONF', 'TN421-CONF', 'TZE12-CONF'];
const results = [];
for (const sku of parentSkus) {
  const product = await api('GET', `/products/${encodeURIComponent(sku)}`);
  const item = product.extension_attributes?.stock_item;
  if (!item?.item_id) throw new Error(`No stock item found for ${sku}`);

  await api('PUT', `/products/${encodeURIComponent(sku)}/stockItems/${item.item_id}`, {
    stockItem: {
      qty: 0,
      is_in_stock: true,
      manage_stock: false,
      use_config_manage_stock: false,
    },
  });

  const updated = await api('GET', `/products/${encodeURIComponent(sku)}`);
  const stock = updated.extension_attributes?.stock_item;
  results.push({
    sku,
    qty: stock?.qty,
    isInStock: stock?.is_in_stock,
    manageStock: stock?.manage_stock,
    useConfigManageStock: stock?.use_config_manage_stock,
  });
}

console.log(JSON.stringify(results, null, 2));
