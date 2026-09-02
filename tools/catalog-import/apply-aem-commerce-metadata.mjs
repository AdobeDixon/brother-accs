import fs from 'node:fs';
import path from 'node:path';

const here = path.dirname(new URL(import.meta.url).pathname);
const csvPath = path.join(here, 'aem-commerce-metadata.csv');

function loadEnv(file) {
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    if (!line || line.startsWith('#')) continue;
    const equals = line.indexOf('=');
    if (equals < 1) continue;
    const key = line.slice(0, equals);
    if (!(key in process.env)) process.env[key] = line.slice(equals + 1);
  }
}

loadEnv(path.resolve(here, '../../.env'));

const author = process.env.AEM_AUTHOR_BASE;
const token = process.env.AEM_BEARER_TOKEN;
if (!author || !token) throw new Error('AEM_AUTHOR_BASE and AEM_BEARER_TOKEN are required');

const encodeDamPath = (assetPath) => assetPath
  .replace(/^\/content\/dam\//, '')
  .split('/')
  .map(encodeURIComponent)
  .join('/');

const parseMulti = (value) => value.split('|');
const lines = fs.readFileSync(csvPath, 'utf8').trim().split(/\r?\n/);
const rows = lines.slice(1).map((line) => {
  const [assetPath, positions, isCommerce, skus, roles] = line.split(',');
  return {
    assetPath,
    apiPath: encodeDamPath(assetPath),
    properties: {
      'metadata/commerce:isCommerce': isCommerce,
      'metadata/commerce:positions': parseMulti(positions).map(Number),
      'metadata/commerce:skus': parseMulti(skus),
      'metadata/commerce:roles': parseMulti(roles),
    },
  };
});

async function request(url, options = {}, attempts = 3) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        ...options.headers,
      },
    });
    if (response.ok) return response;
    const body = await response.text();
    if (attempt === attempts || response.status < 500) {
      throw new Error(`${response.status} ${url}: ${body.slice(0, 300)}`);
    }
    await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
  }
}

let completed = 0;
const failures = [];
const queue = [...rows];

async function worker() {
  while (queue.length) {
    const row = queue.shift();
    try {
      await request(`${author}/api/assets/${row.apiPath}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ class: 'asset', properties: row.properties }),
      });
      completed += 1;
      if (completed % 10 === 0 || completed === rows.length) {
        console.log(`Updated ${completed}/${rows.length}`);
      }
    } catch (error) {
      failures.push({ assetPath: row.assetPath, error: error.message });
    }
  }
}

await Promise.all(Array.from({ length: 5 }, () => worker()));
if (failures.length) {
  console.error(JSON.stringify(failures, null, 2));
  process.exitCode = 1;
} else {
  console.log(`Successfully updated all ${completed} assets.`);
}
