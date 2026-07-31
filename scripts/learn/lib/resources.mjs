/**
 * Assembling a term's reading list.
 *
 * The rule that makes this safe: a URL only ever comes from one of three
 * places — the hand-authored `curated.json`, the Wikipedia API (which returns
 * an article that demonstrably exists), or a search URL built from a template.
 * The model contributes prose and nothing else.
 */
import { PATHS, readJson } from './config.mjs';

const SEARCH = {
  youtube: 'https://www.youtube.com/results?search_query=',
  reddit: 'https://www.reddit.com/search/?q=',
  wikipedia: 'https://en.wikipedia.org/w/index.php?search=',
};

export function loadResourceInputs() {
  const curated = readJson(PATHS.curated);
  const wikipedia = readJson(PATHS.wikipedia, { articles: {} });
  return { curated, wikipedia };
}

/**
 * @returns {Array<{title,url,type,publisher?,difficulty?,isSearch:boolean}>}
 */
export function buildResources(term, category, { curated, wikipedia }) {
  const out = [];
  const seen = new Set();
  const push = (r) => {
    if (!r?.url || seen.has(r.url)) return;
    seen.add(r.url);
    out.push({ isSearch: false, ...r });
  };

  // 1. Anything authored specifically for this term leads.
  for (const r of curated.byTerm?.[term.id] ?? []) push(r);

  // 2. The encyclopaedic entry, resolved against the live Wikipedia API by
  //    scripts/learn/resolve-wikipedia.mjs. Falls back to a search URL rather
  //    than to a guessed article title.
  const article = wikipedia.articles?.[term.id];
  if (article?.url) {
    push({
      title: article.title,
      url: article.url,
      type: 'wikipedia',
      publisher: 'Wikipedia',
      difficulty: 'intermediate',
    });
  } else {
    push({
      title: `Wikipedia search: ${term.term}`,
      url: SEARCH.wikipedia + encodeURIComponent(term.term),
      type: 'wikipedia',
      publisher: 'Wikipedia',
      isSearch: true,
    });
  }

  // 3. The category's standing shelf, up to two, skipping duplicates.
  let added = 0;
  for (const r of curated.byCategory?.[category.id] ?? []) {
    if (added >= 2) break;
    if (seen.has(r.url)) continue;
    push(r);
    added++;
  }

  // 4. A video and a discussion. Deliberately searches, not specific pages:
  //    a named video URL that has not been watched and checked is exactly the
  //    kind of thing this pipeline must never fabricate.
  const q = `${term.term} explained`;
  push({
    title: `Video explanations: ${term.term}`,
    url: SEARCH.youtube + encodeURIComponent(q),
    type: 'video',
    publisher: 'YouTube search',
    isSearch: true,
  });
  push({
    title: `Community discussion: ${term.term}`,
    url: SEARCH.reddit + encodeURIComponent(term.term),
    type: 'discussion',
    publisher: 'Reddit search',
    isSearch: true,
  });

  return out.slice(0, 6);
}

/** Zip the model's notes back onto the real links. */
export function attachNotes(resources, notes = []) {
  return resources.map((r, i) => ({
    ...r,
    description:
      (notes[i] ?? '').trim() ||
      (r.isSearch
        ? `A search rather than a single page: results change, so treat what you find as a starting point and check the source.`
        : `Background reading on this concept from ${r.publisher ?? 'the publisher'}.`),
    verified: false,
  }));
}
