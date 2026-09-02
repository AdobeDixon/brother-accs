import { readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = new URL('./product-images/new-catalog/', import.meta.url);
const files = (await readdir(root)).filter((name) => name.endsWith('.png')).sort();
const rows = ['sku,image_file,position,is_primary'];

for (const name of files) {
  const match = name.match(/^(.*)-(\d{2})\.png$/);
  if (!match) throw new Error(`Unexpected image filename: ${name}`);
  const [, sku, position] = match;
  rows.push(`${sku},${name},${Number(position)},${position === '01' ? 1 : 0}`);
}

const output = new URL('./brother-products-image-manifest.csv', import.meta.url);
await writeFile(output, `${rows.join('\n')}\n`);
console.log(`Wrote ${files.length} images to ${path.basename(output.pathname)}`);
