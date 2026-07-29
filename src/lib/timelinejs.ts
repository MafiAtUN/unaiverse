/**
 * TIMELINEJS ADAPTER
 * ==================
 * Turns the 76 milestone files into the JSON object TimelineJS3 expects, so
 * `/timeline` is a second view of the same corpus rather than a second copy of
 * the content. Nothing here reads the filesystem — the caller passes the loaded
 * collection in, which keeps this testable and lets both the page and the
 * `/timeline.json` endpoint share one code path.
 *
 * Format reference: https://timeline.knightlab.com/docs/json-format.html
 */
import type { CollectionEntry } from 'astro:content';
import { parseMilestoneBody, resolveDate, sortKey, type DateParts } from './milestone';
import { CONSTELLATIONS, SITE, TIERS, ZONES, ZONE_ORDER, type ZoneId } from './taxonomy';

export interface TLDate {
  year: number;
  month?: number;
  day?: number;
}

export interface TLSlide {
  unique_id?: string;
  start_date?: TLDate;
  end_date?: TLDate;
  display_date?: string;
  group?: string;
  text: { headline: string; text: string };
  media?: { url: string; caption?: string; credit?: string; thumbnail?: string };
  background?: { color?: string; url?: string };
}

export interface TLData {
  title: TLSlide;
  events: TLSlide[];
  eras: { start_date: TLDate; end_date: TLDate; text: { headline: string } }[];
  scale: 'human';
}

type Milestone = CollectionEntry<'milestones'>;

/**
 * Slide backgrounds, one per zone. All four are dark enough for the paper-white
 * slide text to clear AA, and each carries a hint of its zone's accent so the
 * era you are standing in is legible without reading the label.
 */
const ZONE_BG: Record<ZoneId, string> = {
  0: '#0a0f1f', // ancient history — the void, barely lifted
  1: '#241204', // the Big Bang — ignition warmth
  2: '#07182b', // the main galaxy — UN blue, deepened
  3: '#0b1a13', // the horizon — olive, deepened
};

/**
 * The boundary between "the main galaxy" and "the horizon" is, definitionally,
 * now — zone 2 is labelled "2023 – today" and zone 3 "What's next". So this
 * moves with each build, which is the correct behaviour and the reason two
 * builds a year apart will not produce byte-identical era bands.
 */
const TODAY = (() => {
  const d = new Date();
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
})();

/** Prefix a site-root path with the deployment base; leave absolute URLs alone. */
function withBase(url: string): string {
  if (/^(https?:)?\/\//.test(url) || url.startsWith('data:')) return url;
  return `${import.meta.env.BASE_URL}/${url}`.replace(/\/+/g, '/');
}

const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
};

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ESCAPES[c]!);
}

/**
 * The milestone bodies are prose, not documents: paragraphs separated by blank
 * lines, with the occasional `**bold**`. That is the whole of the markdown in
 * use across all 76 files, so a full parser would be 40 kB to do nothing.
 */
function prose(text: string): string {
  return text
    .split(/\n\s*\n/)
    .map((p) => escapeHtml(p.trim()).replace(/\n/g, ' '))
    .filter(Boolean)
    .map((p) => `<p>${p.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')}</p>`)
    .join('');
}

/** The body of one slide: the take, the facts, the point, and the receipts. */
function slideHtml(m: Milestone): string {
  const { factual, receipts, why } = parseMilestoneBody(m.body ?? '');
  const d = m.data;
  const parts: string[] = [];

  const constellation = CONSTELLATIONS[d.constellation];
  const tier = TIERS[d.tier];
  parts.push(
    `<p class="tl-un-meta">` +
      [
        `${tier.glyph} ${tier.name}`,
        constellation ? `${constellation.glyph} ${constellation.label}` : null,
        d.symbol ? `<span class="tl-un-symbol">${escapeHtml(d.symbol)}</span>` : null,
      ]
        .filter(Boolean)
        .join(' &middot; ') +
      `</p>`,
  );

  if (d.badges.length) {
    parts.push(
      `<p class="tl-un-badges">` +
        d.badges.map((b) => `<span class="tl-un-badge">${escapeHtml(b)}</span>`).join(' ') +
        `</p>`,
    );
  }

  if (d.tldr) parts.push(`<blockquote class="tl-un-tldr">${prose(d.tldr)}</blockquote>`);
  if (factual) parts.push(prose(factual));
  if (why) {
    parts.push(`<p class="tl-un-why"><strong>Why it matters:</strong> ${escapeHtml(why)}</p>`);
  }

  if (receipts.length) {
    parts.push(
      `<p class="tl-un-receipts"><strong>Receipts:</strong> ` +
        receipts
          .map(
            (r) =>
              `<a href="${escapeHtml(r.url)}" target="_blank" rel="noopener noreferrer">` +
              `${escapeHtml(r.label)}</a>`,
          )
          .join(' ') +
        `</p>`,
    );
  }

  return parts.join('');
}

function toTLDate(parts: DateParts): TLDate {
  const out: TLDate = { year: parts.year };
  if (parts.month !== undefined) out.month = parts.month;
  if (parts.day !== undefined) out.day = parts.day;
  return out;
}

/**
 * The four zone bands drawn behind the navigator.
 *
 * These are cut chronologically from the zone definitions rather than measured
 * from the nodes that landed in each zone, and that is deliberate. Zone 2 is
 * "2023 – today, plus the tracks already running": it holds the CCW process
 * that opened in 2014 and the Human Rights Council resolutions from 2019, so
 * measuring its extent would stretch it back across zones 0 and 1 and the four
 * bands would overlap into mush. On a page you can explain that nuance in a
 * blurb. On a time axis, an era is a stretch of time, so it has to be one.
 *
 * The outer edges still come from the data: zone 0 opens at the earliest node
 * (its label reads "1945", but drawing seven empty decades would squash
 * everything real into the last inch of the axis), and zone 3 closes at the
 * latest. The two inner cuts are the ones the zones actually name — the Big
 * Bang, and the boundary between what has happened and what has not.
 */
function buildEras(firstYear: number, lastYear: number) {
  const bounds: Record<ZoneId, { start: TLDate; end: TLDate }> = {
    0: {
      start: { year: firstYear, month: 1, day: 1 },
      end: { year: 2022, month: 11, day: 29 },
    },
    1: {
      start: { year: 2022, month: 11, day: 30 },
      end: { year: 2022, month: 12, day: 31 },
    },
    2: {
      start: { year: 2023, month: 1, day: 1 },
      end: { year: TODAY.year, month: TODAY.month, day: TODAY.day },
    },
    3: {
      start: { year: TODAY.year, month: TODAY.month, day: TODAY.day },
      end: { year: Math.max(lastYear, TODAY.year), month: 12, day: 31 },
    },
  };

  return ZONE_ORDER.map((z) => ({
    start_date: bounds[z].start,
    end_date: bounds[z].end,
    text: { headline: `${ZONES[z].title} · ${ZONES[z].range}` },
  }));
}

/** Chronological, with the weightier node leading a tie — same rule as the galaxy. */
export function chronological(all: Milestone[]): Milestone[] {
  return [...all].sort((a, b) => {
    const ka = sortKey(a.data.date_display, a.data.year, a.id);
    const kb = sortKey(b.data.date_display, b.data.year, b.id);
    return ka - kb || a.data.tier - b.data.tier || a.data.title.localeCompare(b.data.title);
  });
}

export interface BuildReport {
  slides: number;
  spans: number;
  /** Milestones whose date_display yielded nothing parseable — should stay empty. */
  undated: string[];
}

export function buildTimelineData(all: Milestone[]): { data: TLData; report: BuildReport } {
  const sorted = chronological(all);
  const undated: string[] = [];
  let spans = 0;

  const events: TLSlide[] = [];
  let firstYear = Infinity;
  let lastYear = -Infinity;

  for (const m of sorted) {
    const resolved = resolveDate(m.data.date_display, m.data.year, m.id);
    if (!resolved) {
      undated.push(m.id);
      continue;
    }

    const slide: TLSlide = {
      unique_id: m.id,
      start_date: toTLDate(resolved.start),
      // The prose is the authority on how a date reads. This is the escape
      // hatch for the 30-odd nodes whose date_display is a range or a session
      // ("General Assembly eighty-second session, 2027–2028").
      display_date: m.data.date_display,
      group: CONSTELLATIONS[m.data.constellation]?.label ?? 'Other',
      text: { headline: m.data.title, text: slideHtml(m) },
      background: { color: ZONE_BG[m.data.zone as ZoneId] },
    };
    if (resolved.end) {
      slide.end_date = toTLDate(resolved.end);
      spans++;
    }
    // Milestone files store a site-root path ("/media/x.jpg") and stay ignorant
    // of where the site is deployed. The `/unaiverse` base belongs to the build,
    // not to the content.
    if (m.data.media) {
      slide.media = { ...m.data.media, url: withBase(m.data.media.url) };
    }

    events.push(slide);

    firstYear = Math.min(firstYear, resolved.start.year);
    lastYear = Math.max(lastYear, resolved.end?.year ?? resolved.start.year);
  }

  const eras = buildEras(firstYear, lastYear);

  const data: TLData = {
    title: {
      text: {
        headline: SITE.name,
        text:
          `<p class="tl-un-lede">${escapeHtml(SITE.tagline)}</p>` +
          `<p>For roughly 77 years the United Nations was busy with minor side quests ` +
          `(peace, human rights, development) and mentioned artificial intelligence ` +
          `approximately never. Then a chatbot launched in November 2022. Here are ` +
          `${events.length} milestones of what happened next, every one sourced to the ` +
          `original document.</p>` +
          `<p class="tl-un-hint">Drag the strip below to travel. Each lane is a ` +
          `constellation; the bands behind them are the four zones.</p>`,
      },
      background: { color: ZONE_BG[0] },
    },
    events,
    eras,
    scale: 'human',
  };

  return { data, report: { slides: events.length, spans, undated } };
}
