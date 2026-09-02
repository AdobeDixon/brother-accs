import fs from 'node:fs';
import path from 'node:path';

const here = path.dirname(new URL(import.meta.url).pathname);
const manifestPath = path.join(here, 'brother-products-image-manifest.csv');
const outputPath = path.join(here, 'aem-commerce-metadata.csv');
const damFolder = '/content/dam/Customer/Alex D/brother';

const parentByChild = new Map([
  ['LC223BK', 'LC223-CONF'], ['LC223C', 'LC223-CONF'],
  ['LC223M', 'LC223-CONF'], ['LC223Y', 'LC223-CONF'],
  ['TN421BK', 'TN421-CONF'], ['TN421C', 'TN421-CONF'],
  ['TN421M', 'TN421-CONF'], ['TN421Y', 'TN421-CONF'],
  ['TZE131', 'TZE12-CONF'], ['TZE231', 'TZE12-CONF'],
  ['TZE431', 'TZE12-CONF'], ['TZE531', 'TZE12-CONF'],
  ['TZE631', 'TZE12-CONF'], ['TZE731', 'TZE12-CONF'],
]);

const parentPrimaryChild = new Map([
  ['LC223-CONF', 'LC223BK'],
  ['TN421-CONF', 'TN421BK'],
  ['TZE12-CONF', 'TZE231'],
]);

const csvEscape = (value) => {
  const string = String(value);
  return /[",\r\n]/.test(string) ? `"${string.replaceAll('"', '""')}"` : string;
};

const lines = fs.readFileSync(manifestPath, 'utf8').trim().split(/\r?\n/);
const records = lines.slice(1).map((line) => {
  const [sku, imageFile, position, isPrimary] = line.split(',');
  return { sku, imageFile, position: Number(position), isPrimary: isPrimary === '1' };
});

const parentPosition = new Map();
const parentCounters = new Map();
for (const record of records) {
  const parent = parentByChild.get(record.sku);
  if (!parent) continue;
  const next = (parentCounters.get(parent) ?? 0) + 1;
  parentCounters.set(parent, next);
  parentPosition.set(record.imageFile, next);
}

const header = [
  'assetPath',
  'commerce:positions{{Number: multi}}',
  'commerce:isCommerce{{String}}',
  'commerce:skus{{String: multi}}',
  'commerce:roles{{String: multi}}',
];

const rows = records.map((record) => {
  const childRoles = record.isPrimary
    ? 'thumbnail;image;small_image;swatch_image'
    : 'image';
  const parent = parentByChild.get(record.sku);
  if (!parent) {
    return [
      `${damFolder}/${record.imageFile}`,
      record.position,
      'Yes',
      record.sku,
      childRoles,
    ];
  }

  const parentRoles = record.isPrimary && parentPrimaryChild.get(parent) === record.sku
    ? 'thumbnail;image;small_image'
    : 'image';
  return [
    `${damFolder}/${record.imageFile}`,
    `${record.position}|${parentPosition.get(record.imageFile)}`,
    'Yes',
    `${record.sku}|${parent}`,
    `${childRoles}|${parentRoles}`,
  ];
});

const csv = [header, ...rows]
  .map((row) => row.map(csvEscape).join(','))
  .join('\n') + '\n';

fs.writeFileSync(outputPath, csv);
console.log(`Wrote ${rows.length} metadata rows to ${outputPath}`);
