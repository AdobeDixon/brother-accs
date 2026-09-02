import fs from 'node:fs';
import path from 'node:path';

const here = path.dirname(new URL(import.meta.url).pathname);
for (const line of fs.readFileSync(path.resolve(here, '../../.env'), 'utf8').split(/\r?\n/)) {
  const equals = line.indexOf('=');
  if (equals > 0 && !line.startsWith('#')) process.env[line.slice(0, equals)] ??= line.slice(equals + 1);
}

const csv = fs.readFileSync(path.join(here, 'aem-commerce-metadata.csv'), 'utf8').trim().split(/\r?\n/);
const queue = csv.slice(1).map((line) => line.split(',')[0]);
const unpublished = [];
let checked = 0;

async function worker() {
  while (queue.length) {
    const assetPath = queue.shift();
    const relative = assetPath.replace(/^\/content\/dam\//, '').split('/').map(encodeURIComponent).join('/');
    const response = await fetch(`${process.env.AEM_AUTHOR_BASE}/content/dam/${relative}/jcr:content.json`, {
      headers: { Authorization: `Bearer ${process.env.AEM_BEARER_TOKEN}`, Accept: 'application/json' },
    });
    if (!response.ok) {
      unpublished.push({ assetPath, reason: `HTTP ${response.status}` });
    } else {
      const status = await response.json();
      if (status['cq:lastReplicationAction_publish'] !== 'Activate') {
        unpublished.push({ assetPath, reason: status['cq:lastReplicationAction_publish'] ?? 'not published' });
      }
    }
    checked += 1;
  }
}

await Promise.all(Array.from({ length: 8 }, () => worker()));
console.log(`Checked ${checked} assets.`);
console.log(unpublished.length ? JSON.stringify(unpublished, null, 2) : 'All assets are published to AEM.');
if (unpublished.length) process.exitCode = 2;
