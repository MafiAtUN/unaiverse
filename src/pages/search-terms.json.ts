/**
 * The 307 AI terms, as a second index file.
 *
 * Split out of /search.json on measurement. Together the two are 232 KB
 * (51 KB gzipped) and the terms are more than half of it — which meant the
 * first search anyone ran on a field-mission connection waited on 307
 * definitions before it could answer "78/241".
 *
 * So the router fetches milestones and safe lines first, answers immediately,
 * and pulls this in on idle straight afterwards. By the time someone types a
 * vocabulary question it is almost always already there; if it is not, the
 * search still works and simply gains term results a moment later.
 */
import type { APIRoute } from 'astro';
import { buildTermIndex } from '../lib/search-index';

export const GET: APIRoute = () =>
  new Response(JSON.stringify(buildTermIndex()), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'public, max-age=3600',
    },
  });
