/**
 * MILESTONE SEARCH — the build half
 * =================================
 * Turns the content collection into the flat index that lib/milestone-search
 * queries. Runs only at build time: it reaches into lib/milestone for the
 * why-it-matters line, and lib/taxonomy for the labels a reader might search
 * by ("Geneva", "Security Council"), neither of which should ever be bundled
 * into a browser.
 *
 * The index is emitted twice, on purpose:
 *   • /search.json  — fetched by the router's search box on first use
 *   • inline on /timeline — where all 76 cards are already in the DOM, so
 *     making the reader wait on a network round-trip to filter what they can
 *     already see would be absurd.
 *
 * One builder, so the two can never rank the same query differently.
 */
import { parseMilestoneBody } from './milestone';
import type { MilestoneEntry } from './milestone-search';
import { CONSTELLATIONS, ORGAN_BY_ID, VENUE_BY_ID } from './taxonomy';

/** Structurally what a milestone entry from `getCollection` gives us. */
export interface IndexableMilestone {
  id: string;
  data: {
    title: string;
    date_display: string;
    symbol: string | null;
    tier: 1 | 2 | 3;
    constellation: string;
    badges: string[];
    venue: string[];
    organ: string[];
  };
  body?: string;
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

export function buildMilestoneIndex(entries: IndexableMilestone[]): MilestoneEntry[] {
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
      i: m.id,
      t: m.data.title,
      d: m.data.date_display,
      w: why,
      r: m.data.tier,
      ...(m.data.symbol ? { s: m.data.symbol } : {}),
      k: [...new Set(keys)],
    };
  });
}
