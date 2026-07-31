/**
 * The sitemap, generated rather than hand-maintained.
 *
 * It used to be a static file in `public/` listing five URLs. The literacy
 * area added over three hundred more, and a hand-written list of those would
 * be wrong within a week — so this walks the same data the pages are built
 * from, and a term that is published is in the sitemap by construction.
 */
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { TERMS, CATEGORIES } from '../lib/learn/terms';
import { LEARNING_PATHS } from '../lib/learn/paths';
import { COMPARISONS } from '../lib/learn/compare';

interface Entry {
  path: string;
  changefreq: 'daily' | 'weekly' | 'monthly' | 'yearly';
  priority: string;
}

export const GET: APIRoute = async ({ site }) => {
  const base = import.meta.env.BASE_URL;
  const abs = (path: string) =>
    new URL(`${base}/${path}`.replace(/\/+/g, '/'), site ?? 'https://mafiatun.github.io').href;

  const entries: Entry[] = [
    { path: '', changefreq: 'weekly', priority: '1.0' },
    { path: 'learn', changefreq: 'weekly', priority: '1.0' },
    { path: 'agenda', changefreq: 'weekly', priority: '0.9' },
    { path: 'inherit', changefreq: 'monthly', priority: '0.9' },
    { path: 'story', changefreq: 'weekly', priority: '0.8' },
    { path: 'timeline', changefreq: 'weekly', priority: '0.8' },
    { path: 'learn/explore', changefreq: 'weekly', priority: '0.9' },
    { path: 'learn/a-z', changefreq: 'weekly', priority: '0.8' },
    { path: 'learn/paths', changefreq: 'monthly', priority: '0.8' },
    { path: 'learn/compare', changefreq: 'monthly', priority: '0.8' },
    { path: 'learn/map', changefreq: 'monthly', priority: '0.7' },
    { path: 'learn/methodology', changefreq: 'monthly', priority: '0.6' },
    // `learn/saved` is deliberately absent: it renders one reader's local
    // storage and has nothing for a crawler to index.
    ...CATEGORIES.map((c) => ({
      path: `learn/category/${c.id}`,
      changefreq: 'monthly' as const,
      priority: '0.7',
    })),
    ...TERMS.map((t) => ({
      path: `learn/${t.slug}`,
      changefreq: 'monthly' as const,
      priority: '0.6',
    })),
    ...LEARNING_PATHS.map((p) => ({
      path: `learn/paths/${p.id}`,
      changefreq: 'monthly' as const,
      priority: '0.6',
    })),
    ...COMPARISONS.map((c) => ({
      path: `learn/compare/${c.id}`,
      changefreq: 'monthly' as const,
      priority: '0.6',
    })),
  ];

  // The timeline's milestones are anchors on one page, not routes, so they are
  // not listed — a sitemap full of fragments of the same document is noise.
  await getCollection('milestones');

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries.map(
      (e) =>
        `  <url>\n    <loc>${abs(e.path)}</loc>\n    <changefreq>${e.changefreq}</changefreq>\n` +
        `    <priority>${e.priority}</priority>\n  </url>`,
    ),
    '</urlset>',
    '',
  ].join('\n');

  return new Response(xml, { headers: { 'content-type': 'application/xml; charset=utf-8' } });
};
