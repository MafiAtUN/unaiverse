/**
 * TIMELINE DATA
 * =============
 * One flat, serialisable shape for every interactive view of the corpus.
 *
 * This is deliberately not the TimelineJS adapter in `timelinejs.ts`. That one
 * speaks a third party's schema; this one is ours, and it crosses the
 * server/client boundary — an Astro page builds it at request time and hands it
 * to a React island as props, so everything here must survive JSON.
 *
 * No component reaches back into `astro:content`. If a view needs a field, it
 * gets added here once and every view can use it.
 */
import type { CollectionEntry } from 'astro:content';
import { parseMilestoneBody, resolveDate, sortKey, type Receipt } from './milestone';
import { CONSTELLATIONS, TIERS, ZONES, ZONE_ORDER, type ZoneId } from './taxonomy';

export type Tier = 1 | 2 | 3;

export interface TimelineMedia {
  url: string;
  caption?: string;
  credit?: string;
}

export interface TimelineEvent {
  id: string;
  title: string;
  /** The prose date, verbatim — "6–7 July 2026", "2021–ongoing". */
  dateDisplay: string;
  /** ISO day the event starts. Every event has one; the corpus has no gaps. */
  start: string;
  /** ISO day it ends, when the prose describes a span. Null for a point in time. */
  end: string | null;
  /** True when the prose committed to a day, not just a month or a year. */
  exactDay: boolean;

  zone: ZoneId;
  zoneTitle: string;
  constellation: string;
  constellationLabel: string;
  constellationGlyph: string;
  tier: Tier;
  tierName: string;
  badges: string[];
  personas: string[];
  symbol: string | null;

  /** Mafi's take, when the file has one. */
  tldr: string | null;
  /** The factual record, as paragraphs. */
  body: string[];
  /** The one-line judgement. This leads the layout, ahead of `body`. */
  why: string;
  receipts: Receipt[];
  media: TimelineMedia | null;
  quote: { text: string; attribution: string; url?: string } | null;

  /** Lowercased title + prose + symbol, precomputed so search never re-derives it. */
  haystack: string;
}

export interface TimelineZone {
  id: ZoneId;
  title: string;
  range: string;
  blurb: string;
  /** Chronological band edges, ISO days — see `zoneBands` for why not membership. */
  start: string;
  end: string;
}

export interface TimelineDataset {
  events: TimelineEvent[];
  zones: TimelineZone[];
  constellations: { id: string; label: string; glyph: string; count: number }[];
  tiers: { id: Tier; name: string; count: number }[];
  /** ISO bounds of the whole corpus, for the axis domain. */
  domain: { start: string; end: string };
}

type Milestone = CollectionEntry<'milestones'>;

const iso = (y: number, m = 1, d = 1) =>
  `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

/** Prefix a site-root path with the deployment base; leave absolute URLs alone. */
function withBase(url: string): string {
  if (/^(https?:)?\/\//.test(url) || url.startsWith('data:')) return url;
  return `${import.meta.env.BASE_URL}/${url}`.replace(/\/+/g, '/');
}

/**
 * Zone bands are cut chronologically, not measured from the events that landed
 * in each zone. Zone 2 is "2023 – today, plus the tracks already running": it
 * holds the CCW process from 2014 and the Human Rights Council resolutions from
 * 2019, so measuring its extent would stretch it back across zones 0 and 1 and
 * all four bands would overlap. In prose that nuance is a sentence; on an axis
 * an era has to be a single stretch of time.
 *
 * The outer edges still come from the data. Zone 0's label says 1945, but
 * drawing seven empty decades would squash the whole corpus into the last inch.
 */
function zoneBands(firstYear: number, lastYear: number): TimelineZone[] {
  const now = new Date();
  const today = iso(now.getUTCFullYear(), now.getUTCMonth() + 1, now.getUTCDate());

  const edges: Record<ZoneId, [string, string]> = {
    0: [iso(firstYear), '2022-11-29'],
    1: ['2022-11-30', '2022-12-31'],
    2: ['2023-01-01', today],
    3: [today, iso(Math.max(lastYear, now.getUTCFullYear()), 12, 31)],
  };

  return ZONE_ORDER.map((z) => ({
    id: z,
    title: ZONES[z].title,
    range: ZONES[z].range,
    blurb: ZONES[z].blurb,
    start: edges[z][0],
    end: edges[z][1],
  }));
}

/** "2021–ongoing" has no closing year in the text; the track is still running. */
function endIso(
  end: { year: number; month?: number; day?: number } | null,
): string | null {
  if (!end) return null;
  // A span that names only a year should cover that year, not collapse to 1 Jan.
  if (end.month === undefined) return iso(end.year, 12, 31);
  return iso(end.year, end.month, end.day ?? 28);
}

export function buildTimelineDataset(all: Milestone[]): TimelineDataset {
  const sorted = [...all].sort((a, b) => {
    const ka = sortKey(a.data.date_display, a.data.year, a.id);
    const kb = sortKey(b.data.date_display, b.data.year, b.id);
    return ka - kb || a.data.tier - b.data.tier || a.data.title.localeCompare(b.data.title);
  });

  const events: TimelineEvent[] = [];
  let firstYear = Infinity;
  let lastYear = -Infinity;

  for (const m of sorted) {
    const d = resolveDate(m.data.date_display, m.data.year, m.id);
    if (!d) {
      console.warn(`[unaiverse] story: no date resolved for "${m.id}" — event dropped`);
      continue;
    }

    const { factual, receipts, why } = parseMilestoneBody(m.body ?? '');
    const constellation = CONSTELLATIONS[m.data.constellation];
    const body = factual
      .split(/\n\s*\n/)
      .map((p) => p.trim().replace(/\s*\n\s*/g, ' '))
      .filter(Boolean);

    events.push({
      id: m.id,
      title: m.data.title,
      dateDisplay: m.data.date_display,
      start: iso(d.start.year, d.start.month ?? 1, d.start.day ?? 1),
      end: endIso(d.end),
      exactDay: d.start.day !== undefined,

      zone: m.data.zone as ZoneId,
      zoneTitle: ZONES[m.data.zone as ZoneId].title,
      constellation: m.data.constellation,
      constellationLabel: constellation?.label ?? 'Other',
      constellationGlyph: constellation?.glyph ?? '',
      tier: m.data.tier as Tier,
      tierName: TIERS[m.data.tier].name,
      badges: m.data.badges,
      personas: m.data.personas,
      // Seven files carry "No single document symbol" as a placeholder meaning
      // there isn't one. Rendering that as a symbol produces a chip that says
      // an event has a symbol whose value is the words "no symbol".
      symbol: /^no single document symbol$/i.test(m.data.symbol ?? '') ? null : m.data.symbol,

      tldr: m.data.tldr ?? null,
      body,
      why,
      receipts,
      media: m.data.media
        ? { ...m.data.media, url: withBase(m.data.media.url) }
        : null,
      quote: m.data.quote ?? null,

      haystack: [m.data.title, m.data.symbol ?? '', factual, why, m.data.tldr ?? '']
        .join(' ')
        .toLowerCase(),
    });

    firstYear = Math.min(firstYear, d.start.year);
    lastYear = Math.max(lastYear, d.end?.year ?? d.start.year);
  }

  const constellationCounts = new Map<string, number>();
  const tierCounts = new Map<Tier, number>();
  for (const e of events) {
    constellationCounts.set(e.constellation, (constellationCounts.get(e.constellation) ?? 0) + 1);
    tierCounts.set(e.tier, (tierCounts.get(e.tier) ?? 0) + 1);
  }

  return {
    events,
    zones: zoneBands(firstYear, lastYear),
    // Ordered by how many nodes each holds, so the busiest filters read first.
    constellations: [...constellationCounts.entries()]
      .map(([id, count]) => ({
        id,
        label: CONSTELLATIONS[id]?.label ?? id,
        glyph: CONSTELLATIONS[id]?.glyph ?? '',
        count,
      }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label)),
    tiers: ([1, 2, 3] as Tier[]).map((id) => ({
      id,
      name: TIERS[id].name,
      count: tierCounts.get(id) ?? 0,
    })),
    // A year of air at each end so the first and last stems are not flush
    // against the edge of the canvas.
    domain: { start: iso(firstYear - 1), end: iso(lastYear + 1, 12, 31) },
  };
}
