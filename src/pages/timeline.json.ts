/**
 * The timeline as data. TimelineJS reads this directly, and so can anyone else —
 * the corpus is 76 sourced milestones and there is no reason to keep it locked
 * inside a rendering. Emitted as a static file at build time.
 */
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { buildTimelineData } from '../lib/timelinejs';

export const GET: APIRoute = async () => {
  const { data, report } = buildTimelineData(await getCollection('milestones'));

  console.log(
    `[unaiverse] timeline.json — ${report.slides} slides · ${report.spans} spans · ` +
      `${data.eras.length} eras`,
  );
  for (const id of report.undated) {
    console.warn(`[unaiverse] timeline: could not resolve a date for "${id}" — slide dropped`);
  }

  return new Response(JSON.stringify(data), {
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
};
