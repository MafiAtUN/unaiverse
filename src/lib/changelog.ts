/**
 * THE CHANGELOG (brief §6, §9)
 *
 * "Updated {date} · {latest change}" on the front page, and a page behind it.
 *
 * Hand-authored, and deliberately not derived from git. A commit log answers
 * "what did the author touch", and the question a returning visitor is asking
 * is "has anything I care about changed" — which is a judgement, not a diff.
 * Fifteen commits refactoring a component are not a change to this file;
 * one new milestone is.
 *
 * Newest first. The date is ISO because it is sorted and formatted by code,
 * never read raw by anyone.
 */
export interface Change {
  /** YYYY-MM-DD. */
  date: string;
  /** One line, in the site's voice, for the freshness strip on the router. */
  summary: string;
  /** Optional detail, shown only on the changelog page. */
  detail?: string;
}

export const CHANGES: Change[] = [
  {
    date: '2026-08-01',
    summary: 'Rebuilt as a tool: a front door that routes, and a timeline you can search.',
    detail:
      'The homepage was an 800 KB scroll through all 76 milestones at once, which is a lovely thing to have built and a terrible thing to arrive at. It is now four doors and a search box. Every milestone has its own page and its own link, document symbols are searchable ("78/241" finds A/RES/78/241), and you can tell the site which desk you sit at so it shows you your take instead of all eight. The galaxy is still here — it just waits behind its own door now instead of loading whether you wanted it or not.',
  },
];

/** The most recent change. There is always at least one. */
export function latestChange(): Change {
  return [...CHANGES].sort((a, b) => b.date.localeCompare(a.date))[0]!;
}

/** "1 August 2026" — the format the rest of the corpus writes dates in. */
export function formatChangeDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}
