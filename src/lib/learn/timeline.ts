/**
 * The portal between the two halves of the site.
 *
 * The timeline already marks glossary terms in milestone prose and explains
 * them in A/BOT's panel. That behaviour is preserved exactly. What is added is
 * a route out of the panel — "learn this concept fully" — and a route back:
 * a term page lists the milestones where the concept actually shows up, and
 * every link returns the reader to the milestone anchor they came from.
 *
 * Nothing here duplicates timeline data. Milestones are referenced by id.
 */
import { getCollection } from 'astro:content';
import { GLOSSARY, slugify } from '../glossary';
import { TERM_BY_ID, TERMS } from './terms';

/**
 * A/BOT's 30 glossary slugs to the expanded corpus.
 *
 * Most match by slug already; these are the ones where the timeline's
 * shorthand and the taxonomy's full name differ. A slug with no entry here and
 * no matching term simply keeps its existing A/BOT definition and gains no
 * "learn more" link — the old behaviour, never a broken one.
 */
export const GLOSSARY_ALIASES: Record<string, string> = {
  'scientific-panel': 'scientific-panel-on-ai',
  'global-dialogue': 'global-dialogue-on-ai-governance',
  'lethal-autonomous-weapons-systems': 'lethal-autonomous-weapons',
  'open-source': 'open-source-ai',
  'human-rights-due-diligence': 'human-rights-due-diligence',
};

/** glossary slug → published term id, for every glossary entry that has one. */
export function glossaryTermMap(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const entry of GLOSSARY) {
    const candidate = GLOSSARY_ALIASES[entry.slug] ?? entry.slug;
    if (TERM_BY_ID.has(candidate)) out[entry.slug] = candidate;
  }
  return out;
}

export interface MilestoneRef {
  id: string;
  title: string;
  dateDisplay: string;
  year: number | null;
  tier: 1 | 2 | 3;
  symbol: string | null;
}

/** Surface forms worth matching. Short words produce noise, so they are skipped. */
function surfacesFor(termId: string): string[] {
  const t = TERM_BY_ID.get(termId);
  if (!t) return [];
  return [t.term, ...(t.acronym ? [t.acronym] : []), ...t.aliases]
    // Drop the parenthetical disambiguators we add for readability:
    // "Bias (in a neural network)" never appears in a resolution.
    .map((s) => s.replace(/\s*\([^)]*\)\s*/g, ' ').trim())
    .filter((s) => s.length >= 4 && !s.includes(','));
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

let cache: Map<string, MilestoneRef[]> | null = null;

/**
 * Which milestones mention which term. Computed once per build over the
 * milestone bodies, then served from a map — 300 terms against 76 milestones
 * is cheap once and expensive 300 times.
 *
 * Capped at five per term and ordered by weight, because "data" appears in
 * nearly every milestone and a list of seventy is not context, it is noise.
 */
export async function milestoneIndex(): Promise<Map<string, MilestoneRef[]>> {
  if (cache) return cache;

  const milestones = await getCollection('milestones');
  const prepared = milestones.map((m) => ({
    ref: {
      id: m.id,
      title: m.data.title,
      dateDisplay: m.data.date_display,
      year: m.data.year,
      tier: m.data.tier,
      symbol: m.data.symbol,
    } satisfies MilestoneRef,
    haystack: `${m.data.title}\n${m.body ?? ''}`,
  }));

  const index = new Map<string, MilestoneRef[]>();
  for (const term of TERMS) {
    const surfaces = surfacesFor(term.id);
    if (!surfaces.length) continue;
    const re = new RegExp(
      `(^|[^\\w-])(${surfaces.map(escapeRegExp).join('|')})(?![\\w-])`,
      'i',
    );
    const hits = prepared.filter((p) => re.test(p.haystack)).map((p) => p.ref);
    if (!hits.length) continue;
    hits.sort((a, b) => a.tier - b.tier || (a.year ?? 9999) - (b.year ?? 9999));
    index.set(term.id, hits.slice(0, 5));
  }

  cache = index;
  return index;
}

export async function milestonesForTerm(termId: string): Promise<MilestoneRef[]> {
  return (await milestoneIndex()).get(termId) ?? [];
}

/**
 * The reverse view, for a milestone panel that wants to offer "the concepts in
 * this entry". Not currently rendered on the timeline — the existing inline
 * glossary buttons already do that job — but the index is here so it can be.
 */
export async function termsForMilestone(milestoneId: string): Promise<string[]> {
  const index = await milestoneIndex();
  const out: string[] = [];
  for (const [termId, refs] of index) {
    if (refs.some((r) => r.id === milestoneId)) out.push(termId);
  }
  return out;
}

export { slugify };
