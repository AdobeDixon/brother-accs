#!/usr/bin/env node
/**
 * Derive the flat CSVs from catalog-data.mjs (the single source of truth), so
 * they never drift from the automation input. Regenerate with:
 *   node tools/catalog-import/export-csv.mjs
 *
 * Outputs (next to this file):
 *   brother-products-accs-import.csv  — Adobe Commerce Admin product-import CSV
 *                                       (manual alternative to setup-catalog.mjs)
 *   brother-products-sources.csv      — provenance: SKU -> source URL, price flag
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { products, provenance } from './catalog-data.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const csv = (rows) => rows.map((r) => r.map((v) => {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}).join(',')).join('\n');

// --- Adobe Commerce product import CSV --------------------------------------
const cols = ['sku', 'attribute_set_code', 'product_type', 'categories', 'product_websites',
  'name', 'description', 'short_description', 'weight', 'product_online', 'tax_class_name',
  'visibility', 'price', 'url_key', 'qty', 'is_in_stock', 'additional_attributes',
  'base_image', 'small_image', 'thumbnail'];

const addl = (p) => {
  const pairs = [];
  const custom = { brand: p.brand, ...p.custom };
  for (const [k, v] of Object.entries(custom)) {
    if (Array.isArray(v)) { if (v.length) pairs.push(`${k}=${v.join('|')}`); } // multiselect uses |
    else if (typeof v === 'boolean') pairs.push(`${k}=${v ? 1 : 0}`);
    else pairs.push(`${k}=${v}`);
  }
  return pairs.join(',');
};

const importRows = [cols];
for (const p of products) {
  importRows.push([p.sku, p.set, 'simple', p.categoryPath, 'base', p.name, p.description,
    p.shortDescription, p.weight, 1, 'Taxable Goods', 'Catalog, Search', p.price.toFixed(2),
    p.sku.toLowerCase(), 100, 1, addl(p), '', '', '']);
}
writeFileSync(join(here, 'brother-products-accs-import.csv'), csv(importRows) + '\n');

// --- Provenance CSV ----------------------------------------------------------
const srcRows = [['sku', 'name', 'attribute_set', 'category', 'price_gbp_ex_vat', 'price_source', 'source_url']];
for (const p of products) {
  const pr = provenance[p.sku] || {};
  srcRows.push([p.sku, p.name, p.set, p.categoryPath.split('/').slice(1).join(' > '),
    p.price.toFixed(2), pr.priceSource || 'representative', pr.sourceUrl || '']);
}
writeFileSync(join(here, 'brother-products-sources.csv'), csv(srcRows) + '\n');

console.log(`Wrote brother-products-accs-import.csv and brother-products-sources.csv (${products.length} products).`);
