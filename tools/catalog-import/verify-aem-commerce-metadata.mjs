import fs from 'node:fs';
import path from 'node:path';

const here = path.dirname(new URL(import.meta.url).pathname);
for (const line of fs.readFileSync(path.resolve(here, '../../.env'), 'utf8').split(/\r?\n/)) {
  const equals = line.indexOf('=');
  if (equals > 0 && !line.startsWith('#')) process.env[line.slice(0, equals)] ??= line.slice(equals + 1);
}

const author = process.env.AEM_AUTHOR_BASE;
const token = process.env.AEM_BEARER_TOKEN;
const lines = fs.readFileSync(path.join(here, 'aem-commerce-metadata.csv'), 'utf8').trim().split(/\r?\n/);
const rows = lines.slice(1).map((line) => {
  const [assetPath, positions, isCommerce, skus, roles] = line.split(',');
  return {
    assetPath,
    expected: {
      'commerce:isCommerce': isCommerce,
      'commerce:positions': positions.split('|').map(Number),
      'commerce:skus': skus.split('|'),
      'commerce:roles': roles.split('|'),
    },
  };
});

const normalize = (value) => Array.isArray(value) ? value : [value];
const failures = [];
const queue = [...rows];
let verified = 0;

async function worker() {
  while (queue.length) {
    const row = queue.shift();
    const relative = row.assetPath.replace(/^\/content\/dam\//, '').split('/').map(encodeURIComponent).join('/');
    const response = await fetch(`${author}/content/dam/${relative}/jcr:content/metadata.json`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });
    if (!response.ok) {
      failures.push(`${row.assetPath}: HTTP ${response.status}`);
      continue;
    }
    const actual = await response.json();
    for (const [key, expectedValue] of Object.entries(row.expected)) {
      const actualValue = key === 'commerce:isCommerce' ? actual[key] : normalize(actual[key]);
      if (JSON.stringify(actualValue) !== JSON.stringify(expectedValue)) {
        failures.push(`${row.assetPath}: ${key} expected ${JSON.stringify(expectedValue)}, got ${JSON.stringify(actualValue)}`);
      }
    }
    verified += 1;
    if (verified % 20 === 0 || verified === rows.length) console.log(`Verified ${verified}/${rows.length}`);
  }
}

await Promise.all(Array.from({ length: 8 }, () => worker()));
if (failures.length) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`All ${verified} assets match the expected Commerce metadata.`);
}
