/**
 * The milestone search index, as a static file.
 *
 * Fetched once by the router's search box, on the reader's first keystroke
 * rather than on page load — the homepage has to be usable on a field-mission
 * connection, and most visits to it never search at all.
 *
 * /timeline does not fetch this: it inlines the same index from the same
 * builder, because every card is already on that page.
 */
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { buildMilestoneIndex } from '../lib/milestone-index';
import { sortKey } from '../lib/milestone';

export const GET: APIRoute = async () => {
  const entries = await getCollection('milestones');
  const sorted = [...entries].sort(
    (a, b) =>
      sortKey(b.data.date_display, b.data.year, b.id) -
      sortKey(a.data.date_display, a.data.year, a.id),
  );

  return new Response(JSON.stringify(buildMilestoneIndex(sorted)), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'public, max-age=3600',
    },
  });
};
