#!/usr/bin/env node
/**
 * Verifies that every local href/src reference in the root HTML pages resolves to
 * a file that actually exists. This is the safety net for the folder structure:
 * if an asset or script path is wrong, CI fails before it ever reaches production.
 *
 * Skips external URLs, mailto/tel, in-page anchors, and data: URIs.
 * Zero dependencies — runs on plain Node 18+.
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = process.cwd();
const htmlFiles = readdirSync(root).filter((f) => f.endsWith('.html'));

const attrRe = /(?:href|src)\s*=\s*"([^"]+)"/g;
const skip = /^(https?:)?\/\/|^mailto:|^tel:|^#|^data:|^javascript:/i;

const missing = [];
let checked = 0;

for (const file of htmlFiles) {
  const html = readFileSync(join(root, file), 'utf8');
  let m;
  while ((m = attrRe.exec(html)) !== null) {
    let ref = m[1].trim();
    if (!ref || skip.test(ref)) continue;
    // Skip dynamic references built inside <script> template literals
    // (e.g. src="${esc(t.photo_url)}") — these are runtime values, not files.
    if (ref.includes('${')) continue;
    ref = ref.split('#')[0].split('?')[0];
    if (!ref) continue;
    checked++;
    if (!existsSync(resolve(root, ref))) missing.push(`${file}  ->  ${ref}`);
  }
}

if (missing.length) {
  console.error(`✗ ${missing.length} broken local reference(s):`);
  for (const x of missing) console.error('   ' + x);
  process.exit(1);
}

console.log(`✓ All ${checked} local asset/page references across ${htmlFiles.length} pages resolve.`);
