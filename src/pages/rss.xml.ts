/**
 * An RSS feed of the corpus, newest milestone first.
 *
 * Not for readers with feed apps — for the office that pipes a feed into a
 * Teams or Slack channel and lets the file announce itself. That is how this
 * material actually circulates inside the system, and it costs one file.
 *
 * Hand-rolled rather than pulling in @astrojs/rss: it is thirty lines, and a
 * new dependency here means a full relock (see README) for no benefit.
 */
import type { APIContext } from 'astro';
import { getCollection } from 'astro:content';
import { chronological, type MilestoneLike } from '../lib/agenda';
import { parseMilestoneBody, resolveDate } from '../lib/milestone';
import { SITE } from '../lib/taxonomy';

export const prerender = true;

function xml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** RFC 822, which is what RSS wants and what every reader parses. */
function rfc822(y: number, m = 1, d = 1): string {
  return new Date(Date.UTC(y, m - 1, d)).toUTCString();
}

export async function GET(context: APIContext) {
  const entries = (await getCollection('milestones')) as unknown as MilestoneLike[];
  // Newest first: a feed is read from the top, and the top should be the most
  // recent thing that happened, not 2014.
  const ordered = chronological(entries).reverse();

  const home = new URL(import.meta.env.BASE_URL, context.site).href.replace(/\/?$/, '/');
  const self = new URL(`${import.meta.env.BASE_URL}/rss.xml`.replace(/\/+/g, '/'), context.site)
    .href;

  const items = ordered.map((m) => {
    const link = `${home}#${m.id}`;
    const { factual, why } = parseMilestoneBody(m.body ?? '');
    const resolved = resolveDate(m.data.date_display, m.data.year, m.id);
    const pubDate = resolved
      ? rfc822(resolved.start.year, resolved.start.month, resolved.start.day)
      : undefined;

    const description = [
      m.data.symbol ? `${m.data.symbol} · ${m.data.date_display}` : m.data.date_display,
      '',
      factual.replace(/\s+/g, ' ').trim(),
      why ? `\nWhy it matters: ${why}` : '',
    ].join('\n');

    return [
      '    <item>',
      `      <title>${xml(m.data.title)}</title>`,
      `      <link>${xml(link)}</link>`,
      `      <guid isPermaLink="false">${xml(m.id)}</guid>`,
      pubDate ? `      <pubDate>${pubDate}</pubDate>` : '',
      `      <description>${xml(description)}</description>`,
      '    </item>',
    ]
      .filter(Boolean)
      .join('\n');
  });

  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    '  <channel>',
    `    <title>${xml(SITE.name)}: every UN milestone on AI</title>`,
    `    <link>${xml(home)}</link>`,
    `    <atom:link href="${xml(self)}" rel="self" type="application/rss+xml" />`,
    `    <description>${xml(SITE.tagline)}</description>`,
    '    <language>en</language>',
    ...items,
    '  </channel>',
    '</rss>',
  ].join('\n');

  return new Response(body, {
    headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' },
  });
}
