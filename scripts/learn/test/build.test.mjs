/**
 * What the built site actually contains.
 *
 * These run against `dist/`, so they test the artefact GitHub Pages will
 * serve rather than the source that produced it. The two that matter most are
 * the base-path check (every internal link must carry `/unaiverse`, or the
 * whole site 404s in production while working perfectly on localhost) and the
 * secret sweep — a static site cannot leak a key it never had, and this is how
 * we keep proving that.
 *
 * Skips itself when there is no build, so `npm test` is useful before one.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { PATHS, readJson } from '../lib/config.mjs';

const DIST = path.join(PATHS.root, 'dist');
const BASE = '/unaiverse';
const built = fs.existsSync(path.join(DIST, 'index.html'));

const read = (p) => fs.readFileSync(path.join(DIST, p), 'utf8');
const exists = (p) => fs.existsSync(path.join(DIST, p));

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

test('the site has been built', { skip: !built && 'run `npm run build` first' }, () => {
  assert.ok(exists('index.html'));
  assert.ok(exists('learn/index.html'));
});

test('the existing timeline still builds', { skip: !built }, () => {
  for (const page of ['index.html', 'agenda/index.html', 'inherit/index.html', 'story/index.html', 'timeline/index.html']) {
    assert.ok(exists(page), `${page} is missing — the original site must keep working`);
  }
  const home = read('index.html');
  assert.ok(home.includes('UNAIVERSE'), 'the home page lost its title');
  assert.match(home, /data-node/, 'the home page lost its milestone nodes');
});

test('every published term has a page', { skip: !built }, () => {
  const terms = fs.readdirSync(PATHS.reviewed).filter((f) => f.endsWith('.json'));
  const missing = [];
  for (const file of terms) {
    const id = file.replace(/\.json$/, '');
    if (!exists(`learn/${id}/index.html`)) missing.push(id);
  }
  assert.deepEqual(missing, []);
});

test('all navigation routes exist', { skip: !built }, () => {
  for (const page of [
    'learn/index.html',
    'learn/explore/index.html',
    'learn/a-z/index.html',
    'learn/paths/index.html',
    'learn/compare/index.html',
    'learn/map/index.html',
    'learn/saved/index.html',
    'learn/methodology/index.html',
    'learn/search.json',
    'sitemap.xml',
  ]) {
    assert.ok(exists(page), `${page} was not built`);
  }
});

test('internal links carry the GitHub Pages base path', { skip: !built }, () => {
  // A link to "/learn/token" works on localhost and 404s on GitHub Pages.
  // This is the single most expensive mistake available in this repository.
  const offenders = [];
  for (const file of walk(DIST).filter((f) => f.endsWith('.html')).slice(0, 400)) {
    const html = fs.readFileSync(file, 'utf8');
    for (const match of html.matchAll(/(?:href|src)="(\/[^"]*)"/g)) {
      const url = match[1];
      if (url === BASE || /^\/unaiverse[/#?]/.test(url)) continue;
      if (url.startsWith('//')) continue; // protocol-relative, not ours
      offenders.push(`${path.relative(DIST, file)} → ${url}`);
    }
  }
  assert.deepEqual(offenders.slice(0, 10), [], 'absolute links that skip the base path');
});

test('a term page contains all its required teaching content', { skip: !built }, () => {
  const html = read('learn/hallucination/index.html');
  const term = readJson(path.join(PATHS.reviewed, 'hallucination.json'));
  const decode = (s) =>
    s
      .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
      .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&');
  const strip = (s) => decode(s).replace(/\s+/g, ' ').trim();
  const text = strip(html.replace(/<[^>]+>/g, ' '));

  for (const [label, value] of [
    ['one-sentence definition', term.oneSentence],
    ['why it matters', term.whyItMatters],
    ['analogy limitation', term.everydayAnalogy.limitation],
    ['worked example result', term.workedExample.result],
    ['UN workplace example', term.unWorkplaceExample.scenario],
    ['first misconception', term.commonMisconceptions[0].misconception],
    ['technical explanation', term.simpleVsTechnical.technical],
    ['quiz question', term.quickCheck.question],
    ['key takeaway', term.keyTakeaway],
    ['screen-reader alternative', term.visual.accessibilityDescription],
  ]) {
    // Compare on a decoded prefix: HTML entities make a full-string match
    // brittle without proving anything extra.
    const needle = strip(value).slice(0, 40);
    assert.ok(text.includes(needle), `the hallucination page is missing its ${label}`);
  }
});

test('external links are safe', { skip: !built }, () => {
  const offenders = [];
  for (const file of walk(path.join(DIST, 'learn')).filter((f) => f.endsWith('.html')).slice(0, 200)) {
    const html = fs.readFileSync(file, 'utf8');
    for (const match of html.matchAll(/<a\b[^>]*href="https?:\/\/[^"]*"[^>]*>/g)) {
      const tag = match[0];
      if (!/target="_blank"/.test(tag)) continue;
      if (!/rel="[^"]*noopener/.test(tag)) offenders.push(`${path.relative(DIST, file)}: ${tag.slice(0, 90)}`);
    }
  }
  assert.deepEqual(offenders.slice(0, 5), [], 'target="_blank" without rel="noopener"');
});

test('no Azure credential or endpoint reached the build', { skip: !built }, () => {
  const NEEDLES = [
    'AZURE_OPENAI_API_KEY',
    'AZURE_OPENAI_ENDPOINT',
    'openai.azure.com',
    'services.ai.azure.com',
    'cognitiveservices.azure.com',
    'api-key',
  ];
  const hits = [];
  for (const file of walk(DIST)) {
    if (!/\.(html|js|json|xml|css|txt)$/.test(file)) continue;
    const body = fs.readFileSync(file, 'utf8');
    for (const needle of NEEDLES) {
      if (body.includes(needle)) hits.push(`${path.relative(DIST, file)} contains "${needle}"`);
    }
  }
  assert.deepEqual(hits, [], 'the published site must contain no Azure identifier of any kind');

  // And the actual secret, read from .env if it exists on this machine.
  const envFile = path.join(PATHS.root, '.env');
  if (fs.existsSync(envFile)) {
    const secrets = fs
      .readFileSync(envFile, 'utf8')
      .split('\n')
      .map((l) => l.split('=').slice(1).join('=').trim())
      .filter((v) => v.length > 20);
    const leaked = [];
    for (const file of walk(DIST)) {
      if (!/\.(html|js|json|xml|css|txt)$/.test(file)) continue;
      const body = fs.readFileSync(file, 'utf8');
      for (const secret of secrets) {
        if (body.includes(secret)) leaked.push(path.relative(DIST, file));
      }
    }
    assert.deepEqual(leaked, [], 'a value from .env appears in the built site');
  }
});

test('the site has no login, registration or account surface', { skip: !built }, () => {
  const offenders = [];
  for (const file of walk(DIST).filter((f) => f.endsWith('.html'))) {
    const html = fs.readFileSync(file, 'utf8');
    if (/<input[^>]+type="password"/i.test(html)) offenders.push(`${path.relative(DIST, file)}: password input`);
    if (/<form[^>]+action="[^"]*(login|signin|register|signup)/i.test(html)) {
      offenders.push(`${path.relative(DIST, file)}: auth form`);
    }
  }
  assert.deepEqual(offenders, [], 'this site is public and has no accounts');
});

test('the search index is valid and complete', { skip: !built }, () => {
  const index = JSON.parse(read('learn/search.json'));
  const published = fs.readdirSync(PATHS.reviewed).filter((f) => f.endsWith('.json')).length;
  assert.equal(index.length, published, 'the search index and the corpus disagree');
  for (const entry of index.slice(0, 20)) {
    for (const key of ['i', 't', 'a', 'c', 'n', 'd', 's', 'k']) {
      assert.ok(key in entry, `search entry ${entry.i} is missing "${key}"`);
    }
  }
});

test('the sitemap lists the term pages', { skip: !built }, () => {
  const xml = read('sitemap.xml');
  assert.ok(xml.includes(`${BASE}/learn/token`), 'sitemap is missing term pages');
  assert.ok(xml.includes(`${BASE}/learn/paths/`), 'sitemap is missing learning paths');
  assert.ok(!xml.includes(`${BASE}/learn/saved`), 'the local-storage page should not be indexed');
});

test('term pages carry sharing metadata', { skip: !built }, () => {
  const html = read('learn/token/index.html');
  assert.match(html, /<meta property="og:title"/, 'no Open Graph title');
  assert.match(html, /<meta property="og:type" content="article"/, 'a term page is an article');
  assert.match(html, /<link rel="canonical" href="https:\/\/mafiatun\.github\.io\/unaiverse\/learn\/token\/?"/);
  assert.match(html, /"@type":"DefinedTerm"/, 'no structured data');
});

test('no page loads a script, stylesheet or font from another origin', { skip: !built }, () => {
  // Canonical and og:url point at our own deployed origin and are not fetches.
  // What matters is anything the browser would actually go and get.
  const OURS = 'https://mafiatun.github.io/';
  const offenders = [];
  for (const file of walk(DIST).filter((f) => f.endsWith('.html')).slice(0, 300)) {
    const html = fs.readFileSync(file, 'utf8');
    for (const match of html.matchAll(/<script\b[^>]+src="(https?:\/\/[^"]+)"/g)) {
      if (!match[1].startsWith(OURS)) offenders.push(`${path.relative(DIST, file)} → script ${match[1]}`);
    }
    for (const match of html.matchAll(
      /<link\b[^>]+rel="(?:stylesheet|preconnect|dns-prefetch|preload|prefetch)"[^>]*href="(https?:\/\/[^"]+)"/g,
    )) {
      if (!match[1].startsWith(OURS)) offenders.push(`${path.relative(DIST, file)} → link ${match[1]}`);
    }
  }
  assert.deepEqual(offenders, [], 'the site fetches nothing from a third-party origin');
});
