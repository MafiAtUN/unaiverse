/**
 * The published term corpus, assembled at build time.
 *
 * Reads `content/learn/reviewed/` and nothing else. A file sitting in
 * `content/learn/generated/` is a draft a model wrote; it has no route, no
 * search entry and no card until a human has run `npm run content:publish`.
 * That is the whole publication gate, and it is one glob.
 */
import type { LearnCategory, TermExplanation, Difficulty } from './schema';
import taxonomyJson from '../../../content/learn/taxonomy.json';

const modules = import.meta.glob<{ default: TermExplanation }>(
  '../../../content/learn/reviewed/*.json',
  { eager: true },
);

export const CATEGORIES: LearnCategory[] = taxonomyJson.categories as LearnCategory[];
export const CATEGORY_BY_ID = new Map(CATEGORIES.map((c) => [c.id, c]));

/** Every term the taxonomy plans, published or not. Drives coverage counts. */
export const PLANNED_TERMS = taxonomyJson.terms as Array<{
  id: string;
  term: string;
  categoryId: string;
  difficulty: Difficulty;
  aliases?: string[];
  acronym?: string;
}>;

export const TERMS: TermExplanation[] = Object.values(modules)
  .map((m) => m.default)
  .filter((t): t is TermExplanation => Boolean(t?.id))
  .sort((a, b) => a.term.localeCompare(b.term, 'en'));

export const TERM_BY_ID = new Map(TERMS.map((t) => [t.id, t]));

export const isPublished = (id: string) => TERM_BY_ID.has(id);

/** Resolve a list of ids to terms, silently dropping anything unpublished. */
export function resolveTerms(ids: readonly string[] = []): TermExplanation[] {
  return ids.map((id) => TERM_BY_ID.get(id)).filter((t): t is TermExplanation => Boolean(t));
}

export function termsInCategory(categoryId: string): TermExplanation[] {
  return TERMS.filter((t) => t.categoryId === categoryId);
}

export const DIFFICULTY_ORDER: Record<Difficulty, number> = {
  starter: 0,
  intermediate: 1,
  deeper: 2,
};

/** Category browser data: counts, a suggested first term, adjacent sectors. */
export function categoryOverview() {
  return CATEGORIES.map((c) => {
    const terms = termsInCategory(c.id);
    const starter =
      TERM_BY_ID.get(c.starterTermId) ??
      terms.find((t) => t.difficulty === 'starter') ??
      terms[0];
    return {
      ...c,
      terms,
      count: terms.length,
      planned: PLANNED_TERMS.filter((t) => t.categoryId === c.id).length,
      starter,
      adjacentCategories: c.adjacent
        .map((id) => CATEGORY_BY_ID.get(id))
        .filter((x): x is LearnCategory => Boolean(x)),
    };
  });
}

/**
 * A→Z index. Numerals and symbols collect under "#" so the jump bar never
 * offers a letter with nothing behind it.
 */
export function alphabetical() {
  const buckets = new Map<string, TermExplanation[]>();
  for (const t of TERMS) {
    const first = t.term[0]!.toUpperCase();
    const key = /[A-Z]/.test(first) ? first : '#';
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(t);
  }
  return [...buckets.entries()].sort(([a], [b]) => (a === '#' ? 1 : b === '#' ? -1 : a.localeCompare(b)));
}

/**
 * Terms that name this one, so a page can offer "where to go next" as well as
 * "what you needed first". Computed once rather than per page.
 */
const inbound = new Map<string, Set<string>>();
for (const t of TERMS) {
  for (const id of [...t.prerequisiteTermIds, ...t.relatedTermIds]) {
    if (!inbound.has(id)) inbound.set(id, new Set());
    inbound.get(id)!.add(t.id);
  }
}

export function leadsTo(id: string): TermExplanation[] {
  const ids = [...(inbound.get(id) ?? [])];
  return resolveTerms(ids)
    .filter((t) => t.prerequisiteTermIds.includes(id))
    .slice(0, 6);
}

export function neighbours(id: string): TermExplanation[] {
  const term = TERM_BY_ID.get(id);
  if (!term) return [];
  const ids = new Set([
    ...term.prerequisiteTermIds,
    ...term.relatedTermIds,
    ...term.oftenConfusedWith,
    ...(inbound.get(id) ?? []),
  ]);
  ids.delete(id);
  return resolveTerms([...ids]);
}

export const CORPUS_STATS = {
  published: TERMS.length,
  planned: PLANNED_TERMS.length,
  categories: CATEGORIES.length,
  withInteractive: TERMS.filter((t) => t.visual.component).length,
  reviewed: TERMS.filter((t) => t.reviewed).length,
  starters: TERMS.filter((t) => t.difficulty === 'starter').length,
};

/** Base-path-safe href. GitHub Pages serves this site from /unaiverse. */
export function learnHref(rest = ''): string {
  return `${import.meta.env.BASE_URL}/learn/${rest}`.replace(/\/+/g, '/').replace(/\/$/, '') || '/learn';
}

export function siteHref(rest = ''): string {
  return `${import.meta.env.BASE_URL}/${rest}`.replace(/\/+/g, '/');
}
