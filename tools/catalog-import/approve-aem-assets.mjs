import fs from 'node:fs';
import path from 'node:path';

const here = path.dirname(new URL(import.meta.url).pathname);
for (const line of fs.readFileSync(path.resolve(here, '../../.env'), 'utf8').split(/\r?\n/)) {
  const equals = line.indexOf('=');
  if (equals > 0 && !line.startsWith('#')) process.env[line.slice(0, equals)] ??= line.slice(equals + 1);
}

const author = process.env.AEM_AUTHOR_BASE;
const token = process.env.AEM_BEARER_TOKEN;
const csv = fs.readFileSync(path.join(here, 'aem-commerce-metadata.csv'), 'utf8').trim().split(/\r?\n/);
const paths = csv.slice(1).map((line) => line.split(',')[0]);
const queue = [...paths];
const failures = [];
let approved = 0;

const relativePath = (assetPath) => assetPath
  .replace(/^\/content\/dam\//, '')
  .split('/')
  .map(encodeURIComponent)
  .join('/');

async function worker() {
  while (queue.length) {
    const assetPath = queue.shift();
    const relative = relativePath(assetPath);
    try {
      const update = await fetch(`${author}/api/assets/${relative}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          class: 'asset',
          properties: {
            'metadata/dam:status': 'approved',
            'metadata/dam:activationTarget': 'delivery',
          },
        }),
      });
      if (!update.ok) throw new Error(`PUT HTTP ${update.status}: ${(await update.text()).slice(0, 200)}`);

      const verify = await fetch(`${author}/content/dam/${relative}/jcr:content/metadata.json`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      });
      if (!verify.ok) throw new Error(`verify HTTP ${verify.status}`);
      const metadata = await verify.json();
      if (metadata['dam:status'] !== 'approved' || metadata['dam:activationTarget'] !== 'delivery') {
        throw new Error(`verification mismatch: ${JSON.stringify({ status: metadata['dam:status'], target: metadata['dam:activationTarget'] })}`);
      }
      approved += 1;
      if (approved % 20 === 0 || approved === paths.length) console.log(`Approved ${approved}/${paths.length}`);
    } catch (error) {
      failures.push(`${assetPath}: ${error.message}`);
    }
  }
}

await Promise.all(Array.from({ length: 6 }, () => worker()));
if (failures.length) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`All ${approved} assets are approved for delivery.`);
}
