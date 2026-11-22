#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST_DIR = path.join(ROOT_DIR, 'dist');

const args = new Set(process.argv.slice(2));
const strictPoki = args.has('--strict-poki');
const strictCrazy = args.has('--strict-crazygames');

const MB = 1024 * 1024;
const MIB = 1024 * 1024;

function walkFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walkFiles(full));
    } else if (entry.isFile()) {
      const stat = fs.statSync(full);
      out.push({ path: path.relative(DIST_DIR, full), bytes: stat.size });
    }
  }
  return out;
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < MB) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / MB).toFixed(2)} MB`;
}

if (!fs.existsSync(DIST_DIR)) {
  console.error('dist/ directory not found. Run `npm run build` first.');
  process.exit(1);
}

const files = walkFiles(DIST_DIR);
const totalBytes = files.reduce((sum, f) => sum + f.bytes, 0);
const largestFile = files.reduce(
  (max, f) => (f.bytes > max.bytes ? f : max),
  { path: '(none)', bytes: 0 },
);

const indexPath = path.join(DIST_DIR, 'index.html');
let initialBytes = 0;
if (fs.existsSync(indexPath)) {
  initialBytes += fs.statSync(indexPath).size;
}
for (const f of files) {
  const norm = f.path.replace(/\\/g, '/');
  if (norm.startsWith('assets/') && (norm.endsWith('.js') || norm.endsWith('.css'))) {
    initialBytes += f.bytes;
  }
}

const checks = [
  {
    platform: 'Poki (Recommended)',
    pass: initialBytes <= 5 * MB && totalBytes <= 8 * MB,
    hardFail: strictPoki,
    rule: 'Initial <= 5.00 MB, Total <= 8.00 MB',
  },
  {
    platform: 'CrazyGames Mobile',
    pass: initialBytes <= 20 * MB && totalBytes <= 250 * MB && files.length <= 1500,
    hardFail: strictCrazy,
    rule: 'Initial <= 20.00 MB, Total <= 250.00 MB, Files <= 1,500',
  },
  {
    platform: 'CrazyGames Desktop',
    pass: initialBytes <= 50 * MB && totalBytes <= 250 * MB && files.length <= 1500,
    hardFail: strictCrazy,
    rule: 'Initial <= 50.00 MB, Total <= 250.00 MB, Files <= 1,500',
  },
  {
    platform: 'Cloudflare Pages (Hard Limit)',
    pass: largestFile.bytes <= 25 * MIB && files.length <= 20000,
    hardFail: true,
    rule: 'Max File <= 25.00 MiB, Files <= 20,000',
  },
  {
    platform: 'itch.io (Hard Limit)',
    pass: largestFile.bytes <= 200 * MB && totalBytes <= 500 * MB && files.length <= 1000,
    hardFail: true,
    rule: 'Max File <= 200.00 MB, Total <= 500.00 MB, Files <= 1,000',
  },
];

console.log('\n=== WebGame Build Budget Report ===');
console.log(`Files:         ${files.length}`);
console.log(`Initial Load:  ${formatSize(initialBytes)} (index.html + JS/CSS)`);
console.log(`Total Dist:    ${formatSize(totalBytes)}`);
console.log(`Largest File:  ${largestFile.path} (${formatSize(largestFile.bytes)})\n`);

let failedHard = false;
for (const c of checks) {
  const badge = c.pass ? 'PASS' : c.hardFail ? 'FAIL' : 'WARN';
  if (!c.pass && c.hardFail) failedHard = true;
  console.log(`[${badge}] ${c.platform.padEnd(32)} (${c.rule})`);
}
console.log('');

if (failedHard) {
  process.exit(1);
}
