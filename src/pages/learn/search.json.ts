/**
 * The precomputed search index.
 *
 * Emitted as a static file at build time and fetched once by the client, so
 * search costs one small request and no library. Keys are one letter because
 * the difference is a few kilobytes over 300 terms, and this is the only
 * asset on the site whose size scales with the corpus.
 */
import type { APIRoute } from 'astro';
import { TERMS, CATEGORY_BY_ID } from '../../lib/learn/terms';
import type { SearchEntry } from '../../lib/learn/search';

export const GET: APIRoute = () => {
  const index: SearchEntry[] = TERMS.map((t) => ({
    i: t.id,
    t: t.term,
    ...(t.acronym ? { y: t.acronym } : {}),
    a: t.aliases,
    c: t.categoryId,
    n: CATEGORY_BY_ID.get(t.categoryId)?.name ?? t.categoryId,
    d: t.difficulty,
    s: t.oneSentence,
    k: t.searchKeywords,
  }));

  return new Response(JSON.stringify(index), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'public, max-age=3600',
    },
  });
};
