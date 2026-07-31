#!/usr/bin/env node
/**
 * Resolve one real Wikipedia article per term.
 *
 * Guessing `https://en.wikipedia.org/wiki/<Title-Cased-Term>` produces a
 * plausible URL that 404s about a third of the time, which is the fabrication
 * problem in a different coat. So: ask Wikipedia, keep only what it confirms,
 * and leave the rest to fall back to a search link.
 *
 *   node scripts/learn/resolve-wikipedia.mjs            # fill in what is missing
 *   node scripts/learn/resolve-wikipedia.mjs --refresh  # re-resolve everything
 *   node scripts/learn/resolve-wikipedia.mjs --term token
 */
import { PATHS, readJson, writeJson, parseArgs, COLOURS } from './lib/config.mjs';
import { pool } from './lib/azure.mjs';

const { flags } = parseArgs();
const taxonomy = readJson(PATHS.taxonomy);
const curated = readJson(PATHS.curated);
const cache = readJson(PATHS.wikipedia, { resolvedAt: null, articles: {} });

const API = 'https://en.wikipedia.org/w/rest.php/v1/search/page';
const UA = 'UNAIVERSE-AI-Literacy/1.0 (https://mafiatun.github.io/unaiverse; educational glossary build script)';

/** Strip the disambiguating tail we add for readability: "Bias (in a neural network)". */
function searchQuery(term) {
  const base = term.term.replace(/\s*\([^)]*\)\s*/g, ' ').replace(/"/g, '').trim();
  return base;
}

/**
 * Entries that deliberately cover two words at once ("Data poisoning", alias
 * "model poisoning") have no single article title, so score against each
 * conjunct as well as the whole. Without this, "Misinformation and
 * disinformation" scores badly against the perfectly correct
 * "Misinformation".
 */
function queryVariants(term) {
  const base = searchQuery(term);
  const parts = base
    .split(/\s+and\s+|,\s*/)
    .map((p) => p.trim())
    .filter((p) => p.length > 3);
  return [...new Set([base, ...parts, ...(term.aliases ?? []).slice(0, 2)])];
}

/** Titles whose top hit is a different subject entirely. */
const OFF_TOPIC =
  /\b(aircraft|airplane|film|album|band|song|single|novel|village|town|river|footballer|species|genus|manga|anime|video game|episode|magazine|newspaper|surname|given name)\b/i;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Wikimedia throttles anonymous clients hard. A 429 answered by giving up
 * would silently downgrade a third of the corpus to search links and look
 * exactly like "no article exists", so retry and distinguish the two.
 */
async function get(url) {
  for (let attempt = 1; attempt <= 4; attempt++) {
    let res;
    try {
      res = await fetch(url, { headers: { 'user-agent': UA, accept: 'application/json' } });
    } catch {
      await sleep(500 * attempt);
      continue;
    }
    if (res.status === 404) return { status: 404, json: null };
    if (res.ok) return { status: res.status, json: await res.json().catch(() => null) };
    if (res.status === 429 || res.status >= 500) {
      const wait = Number(res.headers.get('retry-after')) * 1000 || 800 * attempt ** 2;
      await sleep(Math.min(wait, 20_000));
      continue;
    }
    return { status: res.status, json: null };
  }
  return { status: 0, json: null };
}

async function titleExists(title) {
  const { json } = await get(
    `https://en.wikipedia.org/w/rest.php/v1/page/${encodeURIComponent(title)}/bare`,
  );
  if (!json?.title) return null;
  return {
    title: json.title,
    url:
      json.content_urls?.desktop?.page ??
      `https://en.wikipedia.org/wiki/${encodeURIComponent(json.key ?? title)}`,
  };
}

async function search(q) {
  const { json } = await get(`${API}?q=${encodeURIComponent(q)}&limit=5`);
  return (json?.pages ?? []).map((p) => ({
    title: p.title,
    key: p.key,
    url: `https://en.wikipedia.org/wiki/${encodeURIComponent(p.key)}`,
    description: p.description ?? '',
  }));
}

/**
 * Prefer a title that actually looks like the term. A search for "Model" that
 * returns "Model (person)" would be worse than no link at all — and a search
 * for "Guardrail" really does return a reconnaissance aircraft, which is why
 * the bar is a title match rather than a search rank.
 */
function scoreCandidate(candidate, term) {
  if (OFF_TOPIC.test(candidate.description ?? '')) return 0;
  const c = candidate.title.toLowerCase();
  let best = 0;
  for (const variant of queryVariants(term)) {
    const t = variant.toLowerCase();
    let s = 0;
    if (c === t) s = 100;
    else if (c.startsWith(t + ' (')) s = 92;
    else if (c.includes(t)) s = 70;
    // "Topic model" for "Topic modelling" is right; "Name" for "Named entity
    // recognition" is not. The difference is how much of the term survives.
    else if (t.includes(c) && c.length / t.length >= 0.6) s = 62;
    best = Math.max(best, s);
  }
  // A computing-flavoured description breaks ties between equal titles.
  if (best && /machine learning|artificial intelligence|neural|comput|statistic|data|algorithm|software|linguistic/i.test(candidate.description ?? '')) {
    best += 4;
  }
  return best;
}

const targets = taxonomy.terms.filter((t) => {
  if (flags.term) return t.id === flags.term;
  if (flags.refresh) return true;
  return !(t.id in cache.articles);
});

if (!targets.length) {
  console.log('Nothing to resolve. Use --refresh to re-check every term.');
  process.exit(0);
}

console.log(`Resolving Wikipedia articles for ${targets.length} term(s)…`);

let hits = 0;
let misses = 0;

const results = await pool(targets, 2, async (term) => {
  await sleep(120); // be a polite anonymous client
  // An explicit `null` override means "we looked, there is no right article" —
  // distinct from "not yet resolved".
  if (term.id in (curated.wikipedia ?? {}) && curated.wikipedia[term.id] === null) {
    return { id: term.id, article: null };
  }
  const override = curated.wikipedia?.[term.id];
  if (override) {
    const confirmed = await titleExists(override);
    if (confirmed) return { id: term.id, article: { ...confirmed, source: 'override' } };
    console.warn(COLOURS.yellow(`  override for ${term.id} does not exist on Wikipedia: ${override}`));
  }

  const candidates = await search(searchQuery(term));
  if (!candidates.length) return { id: term.id, article: null };

  const best = candidates
    .map((c) => ({ c, score: scoreCandidate(c, term) }))
    .sort((a, b) => b.score - a.score)[0];

  // Below this the match is a coincidence of words, not the same concept.
  // An honest search link beats a confident link to the wrong article.
  if (best.score < 62) return { id: term.id, article: null };
  return {
    id: term.id,
    article: { title: best.c.title, url: best.c.url, source: 'search', score: best.score },
  };
});

for (const r of results) {
  if (!r.ok) {
    console.warn(COLOURS.yellow(`  failed: ${r.error?.message}`));
    continue;
  }
  const { id, article } = r.value;
  if (article) {
    cache.articles[id] = article;
    hits++;
  } else {
    cache.articles[id] = null; // remembered, so we do not re-ask every run
    misses++;
  }
}

cache.resolvedAt = new Date().toISOString();
writeJson(PATHS.wikipedia, cache);

console.log(
  `${COLOURS.green(`${hits} resolved`)} · ${COLOURS.dim(`${misses} left to a search link`)} → ${PATHS.wikipedia.replace(PATHS.root + '/', '')}`,
);
