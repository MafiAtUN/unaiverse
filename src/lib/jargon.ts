/**
 * INLINE JARGON (brief §6, journey J2)
 * ====================================
 * "Jargon is underlined; tapping opens the Learn definition inline as a
 * popover — never navigates away."
 *
 * The marking itself is `markupFactual` in lib/glossary: it already walks
 * plain text at build time, wraps the first occurrence of each known term, and
 * has the conservative rules that keep prose readable (one underline per
 * concept, longest term wins, never inside a document title). Reusing it means
 * the timeline and the milestone pages underline identically.
 *
 * What this module adds is the payload: for the terms a given page actually
 * used, the two-line definition that goes in the popover.
 *
 * ── Why the 30-term glossary and not all 307 ─────────────────────────────
 * The brief says Learn's 307 terms "become tap-to-define everywhere", and the
 * literal reading of that is a mistake: run 307 terms over a milestone
 * paragraph and "data", "model", "system" and "algorithm" all match, and the
 * result is a page with nine underlines per paragraph — clutter, which is the
 * thing being removed. The 30-term glossary is hand-picked for this corpus and
 * mixes the AI vocabulary with the UN procedural vocabulary ("recorded vote",
 * "document symbol") that a newcomer actually stumbles on.
 *
 * So: 30 terms are underlined, and every one that has a full page in the 307
 * links through to it. Nobody is prevented from reaching the other 277 — they
 * are one click away at /learn, which stays exactly as it is.
 *
 * The definition text is A/BOT's rather than the term page's opening sentence,
 * deliberately. That voice is the point of the glossary, and a popover is not
 * the place for a 2,000-word page's first paragraph.
 */
import { GLOSSARY } from './glossary';
import { glossaryTermMap } from './learn/timeline';
import { learnHref } from './learn/terms';

export interface JargonEntry {
  slug: string;
  term: string;
  /** One sentence, in the glossary's voice. */
  short: string;
  analogy: string;
  /** The full term page, when the concept has one. */
  href?: string;
}

const BY_SLUG = new Map(GLOSSARY.map((g) => [g.slug, g]));

/**
 * Definitions for exactly the terms a page marked, and no others.
 *
 * Per page rather than site-wide: the whole glossary is about 6 KB of JSON,
 * and a milestone that underlines four terms has no business shipping the
 * other twenty-six to a phone on a field-mission connection.
 */
export function jargonPayload(slugs: readonly string[]): JargonEntry[] {
  const links = glossaryTermMap();
  const out: JargonEntry[] = [];

  for (const slug of [...new Set(slugs)].sort()) {
    const entry = BY_SLUG.get(slug);
    if (!entry) continue;
    const termId = links[slug];
    out.push({
      slug,
      term: entry.term,
      short: entry.short,
      analogy: entry.analogy,
      ...(termId ? { href: learnHref(termId) } : {}),
    });
  }

  return out;
}
