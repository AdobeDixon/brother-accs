#!/usr/bin/env node
import { readFile } from 'node:fs/promises';

function parseCsv(text) {
  const rows = []; let row = []; let field = ''; let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i += 1; }
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
const auth = await fetch(env.COMMERCE_TOKEN_URL || 'https://ims-na1.adobelogin.com/ims/token/v3', {
  method: 'POST',
  headers: { 'content-type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    grant_type: 'client_credentials', client_id: env.COMMERCE_CLIENT_ID, client_secret: env.COMMERCE_CLIENT_SECRET,
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

const catalogs = (await api('GET', '/sharedCatalog?searchCriteria[pageSize]=100')).items || [];
const publicCatalog = catalogs.find((catalog) => catalog.type === 1);
if (!publicCatalog) throw new Error('Public shared catalog not found');

const wanted = rows.map((row) => row.sku);
const assigned = new Set(await api('GET', `/sharedCatalog/${publicCatalog.id}/products`));
const missing = wanted.filter((sku) => !assigned.has(sku));
if (missing.length) {
  await api('POST', `/sharedCatalog/${publicCatalog.id}/assignProducts`, {
    products: missing.map((sku) => ({ sku })),
  });
}

const verified = new Set(await api('GET', `/sharedCatalog/${publicCatalog.id}/products`));
const stillMissing = wanted.filter((sku) => !verified.has(sku));
if (stillMissing.length) throw new Error(`Shared catalog assignment failed for: ${stillMissing.join(', ')}`);

console.log(JSON.stringify({
  sharedCatalog: publicCatalog.name,
  requested: wanted.length,
  assignedNow: missing.length,
  verified: wanted.length,
}, null, 2));
