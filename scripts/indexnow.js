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
const KEY = 'd8b5c92e7f1a4e6b8c3d5a2f9e1b7c4a';
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`;

// Read all markdown post IDs to construct URL list
const postsDir = path.join(__dirname, '..', 'src', 'content', 'posts');
const postFiles = fs.readdirSync(postsDir).filter(f => f.endsWith('.md') || f.endsWith('.mdx'));

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
  `https://${HOST}/topics/beginner/`
];

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
