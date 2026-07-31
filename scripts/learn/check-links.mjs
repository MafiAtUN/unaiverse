#!/usr/bin/env node
/**
 * Fetch every external URL in the corpus and record whether it answered.
 *
 * The result is written back into the term files as `verified` + `lastChecked`,
 * and the resource card on the page says which it is. A link this script has
 * never confirmed is labelled "not checked" to the reader rather than being
 * quietly presented as vetted.
 *
 *   npm run content:check-links
 *   npm run content:check-links -- --stale 30   # only re-check links older than 30 days
 *   npm run content:check-links -- --dry-run
 */
import fs from 'node:fs';
import path from 'node:path';
import { PATHS, readJson, writeJson, parseArgs, COLOURS } from './lib/config.mjs';
import { pool } from './lib/azure.mjs';

const { flags } = parseArgs();
const dryRun = Boolean(flags['dry-run']);
const staleDays = flags.stale ? Number(flags.stale) : null;
const today = new Date().toISOString().slice(0, 10);

const dirs = [PATHS.reviewed, PATHS.generated].filter((d) => fs.existsSync(d));
const files = dirs.flatMap((dir) =>
  fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.json') && !f.includes('.attempt-'))
    .map((f) => path.join(dir, f)),
);

/** url → [{file, index}] so one fetch updates every term that cites it. */
const byUrl = new Map();
const docs = new Map();

for (const file of files) {
  const doc = readJson(file);
  docs.set(file, doc);
  (doc.resources ?? []).forEach((r, index) => {
    if (staleDays && r.lastChecked) {
      const age = (Date.now() - Date.parse(r.lastChecked)) / 86_400_000;
      if (age < staleDays) return;
    }
    if (!byUrl.has(r.url)) byUrl.set(r.url, []);
    byUrl.get(r.url).push({ file, index });
  });
}

const urls = [...byUrl.keys()];
if (!urls.length) {
  console.log('No links to check.');
  process.exit(0);
}

console.log(`${COLOURS.bold(`Checking ${urls.length} unique URL(s)`)} across ${files.length} term file(s)…`);

const UA =
  'Mozilla/5.0 (compatible; UNAIVERSE-linkcheck/1.0; +https://mafiatun.github.io/unaiverse)';

async function check(url) {
  const attempt = async (method) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);
    try {
      const res = await fetch(url, {
        method,
        redirect: 'follow',
        headers: { 'user-agent': UA, accept: 'text/html,application/xhtml+xml,*/*' },
        signal: controller.signal,
      });
      return { status: res.status, finalUrl: res.url };
    } finally {
      clearTimeout(timer);
    }
  };

  try {
    // HEAD first: cheaper, and most publishers answer it. Several large sites
    // (and every search endpoint) return 403/405 to HEAD but 200 to GET, so a
    // HEAD failure is not evidence of a dead link.
    let r = await attempt('HEAD');
    if (r.status >= 400) r = await attempt('GET');
    return { url, ...r, ok: r.status < 400 };
  } catch (error) {
    return { url, status: 0, ok: false, error: String(error.message ?? error).slice(0, 120) };
  }
}

const results = await pool(urls, 6, check);
const report = [];
let ok = 0;
let broken = 0;

for (const r of results) {
  const value = r.ok ? r.value : { url: '(unknown)', ok: false, status: 0, error: String(r.error) };
  report.push(value);
  if (value.ok) ok++;
  else broken++;

  for (const { file, index } of byUrl.get(value.url) ?? []) {
    const doc = docs.get(file);
    const resource = doc.resources[index];
    resource.verified = value.ok;
    resource.lastChecked = today;
    if (!value.ok) resource.lastStatus = value.status || value.error || 'unreachable';
    else delete resource.lastStatus;
  }
}

if (!dryRun) {
  for (const [file, doc] of docs) writeJson(file, doc);
  writeJson(PATHS.linkReport, {
    checkedAt: new Date().toISOString(),
    total: urls.length,
    ok,
    broken,
    results: report.sort((a, b) => Number(a.ok) - Number(b.ok)),
  });
}

console.log('');
for (const r of report.filter((r) => !r.ok)) {
  console.log(`  ${COLOURS.red('✗')} ${r.status || r.error} ${r.url}`);
}
console.log(
  `${COLOURS.green(`${ok} reachable`)} · ${broken ? COLOURS.red(`${broken} unreachable`) : '0 unreachable'}` +
    (dryRun ? COLOURS.dim(' (dry run: nothing written)') : ` → ${path.relative(PATHS.root, PATHS.linkReport)}`),
);

// A dead link is a content problem for a human to fix, not a reason to fail a
// build: the page already tells the reader the link is unverified.
process.exit(0);
