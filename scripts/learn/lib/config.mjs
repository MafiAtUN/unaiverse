/**
 * Paths and environment for the content pipeline.
 *
 * Nothing in here is ever imported by the site. The public build reads only
 * `content/learn/reviewed/`, which is plain JSON on disk — so a browser can
 * never reach an endpoint, a key, or this file.
 */
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

export const ROOT = path.resolve(fileURLToPath(new URL('../../../', import.meta.url)));

export const PATHS = {
  root: ROOT,
  taxonomy: path.join(ROOT, 'content/learn/taxonomy.json'),
  curated: path.join(ROOT, 'content/learn/resources/curated.json'),
  wikipedia: path.join(ROOT, 'content/learn/resources/wikipedia.json'),
  generated: path.join(ROOT, 'content/learn/generated'),
  reviewed: path.join(ROOT, 'content/learn/reviewed'),
  rejected: path.join(ROOT, 'content/learn/rejected'),
  manifest: path.join(ROOT, 'content/learn/generation-manifest.json'),
  linkReport: path.join(ROOT, 'content/learn/link-report.json'),
  qualityReport: path.join(ROOT, 'content/learn/content-report.md'),
  fixtures: path.join(ROOT, 'scripts/learn/fixtures'),
};

/**
 * `--env-file` would be tidier, but it makes every script fail hard when the
 * file is absent — and validate/report/check-links must all run on a machine
 * with no Azure credentials at all (CI, a contributor, a reviewer).
 */
export function loadEnv() {
  const file = path.join(ROOT, '.env');
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq < 0) continue;
    const key = t.slice(0, eq).trim();
    const value = t.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (!(key in process.env)) process.env[key] = value;
  }
}

export function azureConfig() {
  loadEnv();
  const endpoint = (process.env.AZURE_OPENAI_ENDPOINT ?? '').replace(/\/+$/, '');
  const apiKey = process.env.AZURE_OPENAI_API_KEY ?? '';
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT ?? '';
  const apiVersion = process.env.AZURE_OPENAI_API_VERSION || '2024-10-21';
  const missing = [
    !endpoint && 'AZURE_OPENAI_ENDPOINT',
    !apiKey && 'AZURE_OPENAI_API_KEY',
    !deployment && 'AZURE_OPENAI_DEPLOYMENT',
  ].filter(Boolean);
  return { endpoint, apiKey, deployment, apiVersion, missing };
}

export function readJson(file, fallback = undefined) {
  if (!fs.existsSync(file)) {
    if (fallback !== undefined) return fallback;
    throw new Error(`missing file: ${file}`);
  }
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

export function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
}

export function ensureDirs() {
  for (const d of [PATHS.generated, PATHS.reviewed, PATHS.rejected]) {
    fs.mkdirSync(d, { recursive: true });
  }
}

/** Minimal flag parsing: `--term x`, `--limit 5`, `--dry-run`. */
export function parseArgs(argv = process.argv.slice(2)) {
  const out = { _: [], flags: {} };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) {
      out._.push(a);
      continue;
    }
    const key = a.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) out.flags[key] = true;
    else {
      out.flags[key] = next;
      i++;
    }
  }
  return out;
}

export const COLOURS = {
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
};
