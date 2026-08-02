/**
 * The search index, as a static file.
 *
 * Milestones and the 161 safe lines — the two corpora most searches want.
 * The 307 AI terms are a second file the router pulls in on idle; brief §6
 * asks search to cover all three, and they rank against each other in one
 * result list rather than sitting in boxes a reader must choose between
 * before finding anything.
 *
 * Fetched once by the router's search box, on the reader's first keystroke
 * rather than on page load — the homepage has to be usable on a field-mission
 * connection, and most visits to it never search at all.
 *
 * /timeline does not fetch this: it inlines the milestones-only index from the
 * same builder, because every card is already on that page and a term result
 * would have no card to show.
 */
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { buildPrimaryIndex } from '../lib/search-index';
import { sortKey } from '../lib/milestone';

export const GET: APIRoute = async () => {
  const entries = await getCollection('milestones');
  const sorted = [...entries].sort(
    (a, b) =>
      sortKey(b.data.date_display, b.data.year, b.id) -
      sortKey(a.data.date_display, a.data.year, a.id),
  );

  return new Response(JSON.stringify(buildPrimaryIndex(sorted)), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'public, max-age=3600',
    },
  });
};
