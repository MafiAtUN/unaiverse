/**
 * THE AGENDA
 * ==========
 * Two forward-looking views assembled from the same corpus the timeline uses:
 *
 *   1. What is still to come, as calendar entries a delegation can subscribe to.
 *   2. Who owes what, by when — every obligation any milestone created.
 *
 * Both are derived, never hand-maintained. Adding a milestone with a future
 * date puts it on the calendar; adding a `mandates:` block puts its rows in the
 * ledger. Nothing here needs touching again.
 */
import { resolveDate, sortKey, type DateParts } from './milestone';
import { MANDATE_STATUS, type MandateStatus } from './taxonomy';

export interface MilestoneLike {
  id: string;
  data: {
    title: string;
    date_display: string;
    year: number | null;
    symbol: string | null;
    zone: number;
    tier: 1 | 2 | 3;
    badges: string[];
    venue: string[];
    organ: string[];
    recurs?: { cadence: string; next: string };
    mandates: {
      what: string;
      who: string;
      due: string;
      due_sort: number;
      status: MandateStatus;
      source?: string;
      note?: string;
    }[];
  };
  body?: string;
}

/** How much of a date the prose actually committed to. */
export type Precision = 'day' | 'month' | 'year';

export interface AgendaEvent {
  id: string;
  title: string;
  dateDisplay: string;
  /** Start of the period, as calendar parts. */
  start: DateParts;
  /** Inclusive last day, when the prose describes a span. */
  end: DateParts | null;
  precision: Precision;
  symbol: string | null;
  tier: 1 | 2 | 3;
  venue: string[];
  organ: string[];
  /** Days from `from` to the start. Negative means it has begun. */
  daysAway: number;
  /** One line of context, lifted from the milestone's own prose. */
  gist: string;
}

function precisionOf(parts: DateParts): Precision {
  if (parts.day !== undefined) return 'day';
  if (parts.month !== undefined) return 'month';
  return 'year';
}

/** Midnight UTC for a partial date, defaulting the missing pieces to the first. */
function toUtc(parts: DateParts): Date {
  return new Date(Date.UTC(parts.year, (parts.month ?? 1) - 1, parts.day ?? 1));
}

const DAY_MS = 86_400_000;

/**
 * The first sentence of the milestone's factual prose, which is reliably a
 * statement of what the thing is. Good enough as calendar-entry context, and
 * it means the agenda never carries copy that can drift from the timeline.
 */
function firstSentence(body: string): string {
  const text = body
    .split(/\*\*Sources:\*\*/)[0]!
    .replace(/\s+/g, ' ')
    .trim();
  const cut = text.match(/^(.{40,320}?[.!?])(?:\s|$)/);
  return (cut ? cut[1]! : text.slice(0, 240)).trim();
}

/**
 * Everything that has not started yet, soonest first.
 *
 * `from` is passed in rather than read from the clock here so pages and the
 * .ics endpoints all agree on one build-time "today" — a calendar and a page
 * that disagree about what is upcoming is worse than either being slightly stale.
 */
export function upcomingEvents(
  entries: MilestoneLike[],
  from: Date,
  { horizonMonths = 24 }: { horizonMonths?: number } = {},
): AgendaEvent[] {
  const fromUtc = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
  const limit = Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + horizonMonths, from.getUTCDate());

  const out: AgendaEvent[] = [];

  for (const m of entries) {
    const resolved = resolveDate(m.data.date_display, m.data.year, m.id);
    if (!resolved) continue;

    const startMs = toUtc(resolved.start).getTime();
    if (startMs < fromUtc || startMs > limit) continue;

    // A track described as running "2024–2026" is not an event anyone can put
    // in a calendar; it is a condition. Only things with a real start belong here.
    const precision = precisionOf(resolved.start);
    if (precision === 'year' && resolved.end) continue;

    out.push({
      id: m.id,
      title: m.data.title,
      dateDisplay: m.data.date_display,
      start: resolved.start,
      end: resolved.end,
      precision,
      symbol: m.data.symbol,
      tier: m.data.tier,
      venue: m.data.venue,
      organ: m.data.organ,
      daysAway: Math.round((startMs - fromUtc) / DAY_MS),
      gist: firstSentence(m.body ?? ''),
    });
  }

  return out.sort(
    (a, b) =>
      a.daysAway - b.daysAway ||
      a.tier - b.tier ||
      a.title.localeCompare(b.title),
  );
}

export interface AgendaPeriod {
  id: string;
  title: string;
  dateDisplay: string;
  symbol: string | null;
  venue: string[];
  organ: string[];
  gist: string;
}

/**
 * The things that are coming but are not a date: a review pinned to the
 * eighty-second session, a reporting cycle that runs across two years.
 *
 * These get their own list rather than a calendar entry. Putting "General
 * Assembly eighty-second session, 2027-2028" in someone's calendar as a
 * two-year all-day block is not a favour, and inventing a day for it would be
 * asserting something the Assembly has not decided.
 *
 * Scoped to Zone 3 — the corpus already curates that zone as "mandated,
 * scheduled, and not yet written", which is exactly this list. Anything in it
 * that resolves to a real date is a calendar event instead, not a period.
 */
export function openPeriods(
  entries: MilestoneLike[],
  from: Date,
  dated: ReadonlySet<string>,
): AgendaPeriod[] {
  const fromUtc = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
  const out: AgendaPeriod[] = [];

  for (const m of entries) {
    if (m.data.zone !== 3 || dated.has(m.id)) continue;

    const resolved = resolveDate(m.data.date_display, m.data.year, m.id);
    if (!resolved) continue;

    // Still open if the period has not closed, or has not begun.
    const last = resolved.end ?? resolved.start;
    const endMs = Date.UTC(last.year, (last.month ?? 12) - 1, last.day ?? 31);
    if (endMs < fromUtc) continue;

    out.push({
      id: m.id,
      title: m.data.title,
      dateDisplay: m.data.date_display,
      symbol: m.data.symbol,
      venue: m.data.venue,
      organ: m.data.organ,
      gist: firstSentence(m.body ?? ''),
    });
  }

  return out.sort((a, b) => sortKey(a.dateDisplay, null, a.id) - sortKey(b.dateDisplay, null, b.id));
}

export interface RecurringTrack {
  id: string;
  title: string;
  cadence: string;
  next: string;
  /** When it last happened, from the milestone's own date prose. */
  lastSeen: string;
  venue: string[];
  organ: string[];
}

/**
 * Series that will meet again on a pattern, with no date announced.
 *
 * This is the honest answer to "what else is coming". The corpus contains
 * exactly one dated future event right now, but a delegate planning coverage
 * still needs to know that AI for Good is annual and in Geneva, that the CCW
 * Group meets in sessions, and that the privacy item returns every Council
 * cycle. None of that can go in a calendar file without inventing a date, so
 * it gets its own band instead.
 *
 * Marked by hand with a `recurs:` block, never inferred: "this looks annual"
 * is a guess, and a guess is what this site does not do.
 */
export function recurringTracks(entries: MilestoneLike[]): RecurringTrack[] {
  return entries
    .filter((m) => m.data.recurs)
    .map((m) => ({
      id: m.id,
      title: m.data.title,
      cadence: m.data.recurs!.cadence,
      next: m.data.recurs!.next,
      lastSeen: m.data.date_display,
      venue: m.data.venue,
      organ: m.data.organ,
    }))
    .sort((a, b) => a.title.localeCompare(b.title));
}

export interface LedgerRow {
  what: string;
  who: string;
  due: string;
  dueSort: number;
  status: MandateStatus;
  statusLabel: string;
  source?: string;
  note?: string;
  /** The milestone that created the obligation. */
  fromId: string;
  fromTitle: string;
  fromDate: string;
}

/**
 * Every obligation in the corpus, in due order. Undated ongoing duties carry a
 * sentinel `due_sort` in the 99999xxx range so they sort to the end rather
 * than pretending to a deadline they were never given.
 */
export function mandateLedger(entries: MilestoneLike[]): LedgerRow[] {
  const rows: LedgerRow[] = [];

  for (const m of entries) {
    for (const mandate of m.data.mandates ?? []) {
      rows.push({
        ...mandate,
        dueSort: mandate.due_sort,
        statusLabel: MANDATE_STATUS[mandate.status].label,
        fromId: m.id,
        fromTitle: m.data.title,
        fromDate: m.data.date_display,
      });
    }
  }

  return rows.sort(
    (a, b) => a.dueSort - b.dueSort || a.fromTitle.localeCompare(b.fromTitle),
  );
}

export function ledgerCounts(rows: LedgerRow[]): Record<MandateStatus, number> {
  const counts: Record<MandateStatus, number> = { done: 0, pending: 0, upcoming: 0 };
  for (const r of rows) counts[r.status]++;
  return counts;
}

// ── iCalendar ────────────────────────────────────────────────────────────

/** RFC 5545 wants CRLF, escaped separators, and lines folded at 75 octets. */
function fold(line: string): string {
  if (line.length <= 75) return line;
  const parts: string[] = [];
  let rest = line;
  parts.push(rest.slice(0, 75));
  rest = rest.slice(75);
  while (rest.length) {
    parts.push(' ' + rest.slice(0, 74));
    rest = rest.slice(74);
  }
  return parts.join('\r\n');
}

function esc(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

function stamp(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function dateValue(parts: DateParts): string {
  const y = String(parts.year).padStart(4, '0');
  const m = String(parts.month ?? 1).padStart(2, '0');
  const d = String(parts.day ?? 1).padStart(2, '0');
  return `${y}${m}${d}`;
}

/**
 * DTEND on an all-day VEVENT is exclusive, so a single-day event ends the
 * following day and a 6–7 July event ends on the 8th. Getting this wrong is
 * the classic way to ship a calendar file that renders every meeting a day short.
 */
function exclusiveEnd(ev: AgendaEvent): string {
  const last = ev.end ?? ev.start;
  const d = toUtc(last);
  d.setUTCDate(d.getUTCDate() + 1);
  return dateValue({ year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() });
}

export interface IcsOptions {
  /** Absolute URL each event links back to. */
  linkFor: (ev: AgendaEvent) => string;
  /** Build-time timestamp, so every event in one file shares a DTSTAMP. */
  now: Date;
  calendarName?: string;
}

/**
 * An .ics a delegation can subscribe to or import wholesale.
 *
 * Month-precision entries are marked in the summary rather than silently
 * pinned to the first: a calendar that asserts a date the UN has not announced
 * is worse than no calendar. Year-only entries never reach this function.
 */
export function toIcs(events: AgendaEvent[], opts: IcsOptions): string {
  const dtstamp = stamp(opts.now);
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//UNAIVERSE//UN AI governance calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${esc(opts.calendarName ?? 'UNAIVERSE: the UN AI file')}`,
    'X-WR-TIMEZONE:UTC',
  ];

  for (const ev of events) {
    const tbc = ev.precision !== 'day';
    const summary = tbc ? `[dates TBC] ${ev.title}` : ev.title;
    const description = [
      ev.gist,
      '',
      `Announced as: ${ev.dateDisplay}`,
      ev.symbol ? `Document symbol: ${ev.symbol}` : null,
      tbc ? 'Exact dates were not published when this entry was generated.' : null,
      '',
      `Detail and sources: ${opts.linkFor(ev)}`,
    ]
      .filter((l) => l !== null)
      .join('\n');

    lines.push(
      'BEGIN:VEVENT',
      `UID:${ev.id}@unaiverse`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART;VALUE=DATE:${dateValue(ev.start)}`,
      `DTEND;VALUE=DATE:${exclusiveEnd(ev)}`,
      fold(`SUMMARY:${esc(summary)}`),
      fold(`DESCRIPTION:${esc(description)}`),
      fold(`URL:${esc(opts.linkFor(ev))}`),
      // Nothing here is confirmed enough to ring an alarm on someone's phone;
      // TENTATIVE is the honest status for a date the Assembly may still move.
      `STATUS:${tbc ? 'TENTATIVE' : 'CONFIRMED'}`,
      'TRANSP:TRANSPARENT',
      'END:VEVENT',
    );
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n') + '\r\n';
}

/** Chronological order, used by every page that lists the corpus. */
export function chronological<T extends MilestoneLike>(entries: T[]): T[] {
  return [...entries].sort(
    (a, b) =>
      sortKey(a.data.date_display, a.data.year, a.id) -
        sortKey(b.data.date_display, b.data.year, b.id) ||
      a.data.tier - b.data.tier ||
      a.data.title.localeCompare(b.data.title),
  );
}
