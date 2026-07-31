/**
 * One .ics per upcoming event, for the reader who wants the Geneva Dialogue in
 * their calendar and nothing else.
 *
 * Only upcoming events get a file — a downloadable calendar entry for
 * something that happened in 2023 is a trap, not a feature.
 */
import type { APIContext } from 'astro';
import { getCollection } from 'astro:content';
import { toIcs, upcomingEvents, type MilestoneLike } from '../../lib/agenda';

export const prerender = true;

export async function getStaticPaths() {
  const entries = (await getCollection('milestones')) as unknown as MilestoneLike[];
  return upcomingEvents(entries, new Date()).map((ev) => ({
    params: { id: ev.id },
    props: { title: ev.title },
  }));
}

export async function GET(context: APIContext) {
  const { id } = context.params;
  const entries = (await getCollection('milestones')) as unknown as MilestoneLike[];
  const now = new Date();
  const event = upcomingEvents(entries, now).find((ev) => ev.id === id);

  if (!event) return new Response('Not found', { status: 404 });

  const body = toIcs([event], {
    now,
    calendarName: event.title,
    linkFor: (ev) =>
      new URL(`${import.meta.env.BASE_URL}/#${ev.id}`.replace(/\/+/g, '/'), context.site).href,
  });

  return new Response(body, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${id}.ics"`,
    },
  });
}
