/**
 * IndexNow Automated URL Submission Script (ESM)
 * Submits all canonical URLs to Bing / Yandex / IndexNow for instant crawling & indexing.
 */

import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const HOST = 'jichangzhinan.co';
const KEY = process.env.INDEXNOW_KEY || '955295c2400545a89ecee22f232f0137';
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`;
const DRY_RUN = process.argv.includes('--dry-run');

// Read all markdown post IDs to construct URL list
const postsDir = path.join(__dirname, '..', 'src', 'content', 'posts');
const postFiles = fs.readdirSync(postsDir).filter(f => f.endsWith('.md') || f.endsWith('.mdx'));

// Read all deep-review airport slugs from src/data/airports.ts
const airportsSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'data', 'airports.ts'), 'utf8');
const airportBlocks = airportsSource.split(/(?=\{\s*\n\s*id:\s*['"])/);
const deepAirportSlugs = [];
for (const block of airportBlocks) {
  if (/hasDeepReview:\s*true/.test(block)) {
    const slugMatch = block.match(/slug:\s*['"]([^'"]+)['"]/);
    if (slugMatch) {
      deepAirportSlugs.push(slugMatch[1]);
    }
  }
}

const urlList = [
  `https://${HOST}/`,
  `https://${HOST}/airports/`,
  `https://${HOST}/guides/`,
  `https://${HOST}/topics/`,
  `https://${HOST}/tools/`,
  `https://${HOST}/archive/`,
  `https://${HOST}/about/`,
  `https://${HOST}/topics/recommendations/`,
  `https://${HOST}/topics/lines/`,
  `https://${HOST}/topics/scenarios/`,
  `https://${HOST}/topics/clients/`,
  `https://${HOST}/topics/routing/`,
  `https://${HOST}/topics/security/`,
  `https://${HOST}/topics/beginner/`,
  `https://${HOST}/topics/protocols/`
];

deepAirportSlugs.forEach(slug => {
  urlList.push(`https://${HOST}/airports/${slug}/`);
});

postFiles.forEach(file => {
  const slug = file.replace(/\.(md|mdx)$/, '');
  urlList.push(`https://${HOST}/articles/${slug}/`);
});

const payload = JSON.stringify({
  host: HOST,
  key: KEY,
  keyLocation: KEY_LOCATION,
  urlList: urlList
});

const options = {
  hostname: 'api.indexnow.org',
  port: 443,
  path: '/indexnow',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload)
  }
};

console.log(`[IndexNow] Preparing to submit ${urlList.length} canonical URLs for ${HOST}...`);
console.log(`[IndexNow] Key location: ${KEY_LOCATION}`);

if (DRY_RUN) {
  console.log('[IndexNow] Dry run enabled, skipping HTTP POST to api.indexnow.org.');
  console.log(JSON.stringify({ host: HOST, key: KEY, keyLocation: KEY_LOCATION, urlCount: urlList.length }, null, 2));
  process.exit(0);
}

const req = https.request(options, (res) => {
  console.log(`[IndexNow] Response Status Code: ${res.statusCode} (${res.statusMessage})`);
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    if (res.statusCode === 200 || res.statusCode === 202) {
      console.log(`[IndexNow] ✓ Success: ${urlList.length} URLs submitted to Bing / IndexNow search index!`);
    } else {
      console.log(`[IndexNow] Server response: ${data || '(Status received)'}`);
    }
  });
});

req.on('error', (e) => {
  console.error(`[IndexNow] Request error: ${e.message}`);
});

req.write(payload);
req.end();
