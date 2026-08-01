/**
 * The whole forward file as one .ics.
 *
 * A three-diplomat delegation covering AI alongside six other portfolios does
 * not need another website to check. It needs the dates in the calendar it
 * already lives in. This is that.
 */
import type { APIContext } from 'astro';
import { getCollection } from 'astro:content';
import { toIcs, upcomingEvents, type MilestoneLike } from '../lib/agenda';

export const prerender = true;

export async function GET(context: APIContext) {
  const entries = (await getCollection('milestones')) as unknown as MilestoneLike[];
  const now = new Date();
  const events = upcomingEvents(entries, now);

  const body = toIcs(events, {
    now,
    calendarName: 'UNAIVERSE: the UN AI file',
    linkFor: (ev) =>
      new URL(`${import.meta.env.BASE_URL}/m/${ev.id}`.replace(/\/+/g, '/'), context.site).href,
  });

  return new Response(body, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="unaiverse-un-ai-file.ics"',
    },
  });
}
