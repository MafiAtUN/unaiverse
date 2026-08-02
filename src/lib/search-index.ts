/**
 * SEARCH — the build half
 * =======================
 * Turns the corpus into the flat index that lib/search queries. Runs only at
 * build time: it reaches into lib/milestone for the why-it-matters line, the
 * takes for safe lines, and lib/taxonomy for the labels a reader might search
 * by ("Geneva", "Security Council"), none of which should ever be bundled
 * into a browser.
 *
 * Three indexes are emitted, from one builder, for three genuinely different
 * jobs:
 *
 *   /search.json        milestones and the 161 safe lines. Fetched by the
 *                       router's search box on first use — this is what most
 *                       searches actually want, so it is what answers first.
 *   /search-terms.json  the 307 AI terms. More than half the total weight, and
 *                       the least urgent, so the router pulls it on idle after
 *                       the first index has landed rather than making the
 *                       first search wait behind it.
 *   inline on           milestones only. That page filters cards already in
 *   /timeline           the DOM, so a network round-trip to hide what the
 *                       reader can already see would be absurd, and a term
 *                       result would have no card to show.
 *
 * Same builder throughout, so no two of them can rank a shared query
 * differently.
 */
import { parseMilestoneBody } from './milestone';
import type { SearchEntry } from './search';
import { buildSafeLines, type SafeLineSource } from './safe-lines';
import { CONSTELLATIONS, ORGAN_BY_ID, VENUE_BY_ID } from './taxonomy';
import { TERMS } from './learn/terms';

/** Structurally what a milestone entry from `getCollection` gives us. */
export interface IndexableMilestone extends SafeLineSource {
  id: string;
  data: {
    title: string;
    date_display: string;
    year: number | null;
    symbol: string | null;
    tier: 1 | 2 | 3;
    constellation: string;
    badges: string[];
    personas: string[];
    venue: string[];
    organ: string[];
  };
  body?: string;
}

const href = (rest: string) => `${import.meta.env.BASE_URL}/${rest}`.replace(/\/+/g, '/');

/** Cut at a word boundary, so a truncated definition still reads as English. */
function clip(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const space = cut.lastIndexOf(' ');
  return `${cut.slice(0, space > max * 0.6 ? space : max).trimEnd()}…`;
}

/**
 * Every way a reader might type a document symbol.
 *
 * "A/RES/78/241" yields the symbol itself, "ares78241" (pasted from a
 * filename, or typed by someone who has given up on slashes) and "78241"
 * (the half everyone remembers, without the separator). The slash-separated
 * forms need no help: normalisation already splits them into words.
 */
export function symbolKeys(symbol: string): string[] {
  const keys = new Set<string>();
  const flat = symbol.replace(/[^A-Za-z0-9]/g, '');
  if (flat) keys.add(flat);

  // The numeric tail: "78/241" out of "A/RES/78/241", flattened to "78241".
  const digits = symbol.match(/\d[\d/.\-]*\d/g) ?? [];
  for (const run of digits) {
    const bare = run.replace(/[^0-9]/g, '');
    if (bare.length >= 3) keys.add(bare);
  }
  return [...keys];
}

/** Milestones alone — what /timeline inlines to filter its cards. */
export function buildMilestoneIndex(entries: IndexableMilestone[]): SearchEntry[] {
  return entries.map((m) => {
    const { why } = parseMilestoneBody(m.body ?? '');

    const keys = [
      ...(m.data.symbol ? symbolKeys(m.data.symbol) : []),
      ...m.data.badges,
      ...m.data.venue.map((v) => VENUE_BY_ID.get(v)?.label ?? v),
      ...m.data.organ.map((o) => ORGAN_BY_ID.get(o)?.label ?? o),
      CONSTELLATIONS[m.data.constellation]?.label ?? m.data.constellation,
    ].filter(Boolean);

    return {
      k: 'milestone' as const,
      i: m.id,
      t: m.data.title,
      w: why,
      u: href(`m/${m.id}`),
      d: m.data.date_display,
      r: m.data.tier,
      ...(m.data.symbol ? { s: m.data.symbol } : {}),
      x: [...new Set(keys)],
    };
  });
}

/**
 * What the router fetches first: milestones and every safe line.
 *
 * Safe lines deep-link into the library at their own anchor rather than to the
 * milestone they came from: someone searching for a line wants the line, with
 * its copy button, not a page they then have to scan for it.
 */
export function buildPrimaryIndex(entries: IndexableMilestone[]): SearchEntry[] {
  const lines: SearchEntry[] = buildSafeLines(entries).map((l) => ({
    k: 'line' as const,
    i: l.id,
    t: l.line,
    w: l.milestoneTitle,
    u: `${href('safe-lines')}#${l.id}`,
    ...(l.dateDisplay ? { d: l.dateDisplay } : {}),
    ...(l.symbol ? { s: l.symbol } : {}),
    ...(l.persona ? { p: l.personaLabel } : {}),
    x: [l.personaLabel, l.topicLabel, 'safe line', ...(l.symbol ? symbolKeys(l.symbol) : [])],
  }));

  return [...buildMilestoneIndex(entries), ...lines];
}

/**
 * The 307 terms, trimmed.
 *
 * Untrimmed they were 175 KB of a 284 KB index — 99 KB of it search keywords,
 * averaging thirteen per term. The deep term search already exists at /learn,
 * with every keyword and its own index; what the router needs is enough to
 * find the term and say what it is.
 *
 * So: five keywords rather than thirteen, and a definition clipped to a line,
 * since the full sentence is on the page the result links to.
 */
export function buildTermIndex(): SearchEntry[] {
  return TERMS.map((t) => ({
    k: 'term' as const,
    i: t.id,
    t: t.term,
    w: clip(t.oneSentence, 120),
    u: href(`learn/${t.slug}`),
    x: [...(t.acronym ? [t.acronym] : []), ...t.aliases, ...t.searchKeywords.slice(0, 5)],
  }));
}
