/**
 * Glossary marking (plan §6, "glossary mode").
 *
 * Wraps the first occurrence of each glossary term in a milestone's factual
 * prose so A/BOT can explain it in place. Runs at build time over plain text
 * — never over HTML — so there is no way to split a tag or nest a button
 * inside a link.
 *
 * Deliberately conservative:
 *   • first occurrence per term per node, not every occurrence — a paragraph
 *     with nine underlines is unreadable
 *   • longest term wins, so "large language model" is not shredded into
 *     "model" plus leftovers
 *   • whole words only, so "AI" never matches inside "said"
 */
import abot from '../data/abot.json';

export interface GlossaryEntry {
  term: string;
  aka?: string[];
  short: string;
  analogy: string;
  slug: string;
}

export const GLOSSARY: GlossaryEntry[] = (abot.glossary as Omit<GlossaryEntry, 'slug'>[]).map(
  (g) => ({ ...g, slug: slugify(g.term) }),
);

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Every surface form that should be clickable, longest first. */
const SURFACES: { text: string; slug: string }[] = GLOSSARY.flatMap((g) => [
  { text: g.term, slug: g.slug },
  ...(g.aka ?? []).map((a) => ({ text: a, slug: g.slug })),
]).sort((a, b) => b.text.length - a.text.length);

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

interface Hit {
  start: number;
  end: number;
  slug: string;
}

/**
 * Turn a milestone's factual prose into HTML: glossary terms become buttons,
 * *asterisks* become <em>, everything else is escaped.
 */
export function markupFactual(text: string): { html: string; terms: string[] } {
  const hits: Hit[] = [];
  const usedSlugs = new Set<string>();

  // Emphasis ranges — **bold** and *italic document titles*. A term button
  // landing inside one splits the asterisk pair across two segments, so the
  // emphasis never resolves and the reader sees raw asterisks. Titles are
  // also the wrong place for a definition popup, so these are off limits.
  const emphasisRanges: { start: number; end: number }[] = [];
  for (const re of [/\*\*([^*]+)\*\*/g, /\*([^*]+)\*/g]) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) {
      const start = m.index;
      const end = m.index + m[0].length;
      // The bold pass runs first; skip italic matches already inside it.
      if (emphasisRanges.some((r) => start < r.end && end > r.start)) continue;
      emphasisRanges.push({ start, end });
    }
  }
  const insideItalics = (s: number, e: number) =>
    emphasisRanges.some((r) => s < r.end && e > r.start);

  for (const surface of SURFACES) {
    if (usedSlugs.has(surface.slug)) continue; // one underline per concept

    // \b is unreliable next to hyphens, so bound on non-word characters
    // explicitly. Case-insensitive: "Member State" and "member state" both hit.
    // Global so we can keep looking if the first hit is inside a title.
    const re = new RegExp(`(^|[^\\w-])(${escapeRegExp(surface.text)})(?![\\w-])`, 'gi');
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) {
      const start = m.index + m[1]!.length;
      const end = start + m[2]!.length;

      // Don't sit inside a document title, and don't overlap a longer term
      // that already claimed this span.
      if (insideItalics(start, end)) continue;
      if (hits.some((h) => start < h.end && end > h.start)) continue;

      hits.push({ start, end, slug: surface.slug });
      usedSlugs.add(surface.slug);
      break; // first usable occurrence only
    }
  }

  hits.sort((a, b) => a.start - b.start);

  let out = '';
  let cursor = 0;
  for (const hit of hits) {
    out += italics(escapeHtml(text.slice(cursor, hit.start)));
    const label = escapeHtml(text.slice(hit.start, hit.end));
    out +=
      `<button type="button" class="term" data-term="${hit.slug}" ` +
      `aria-label="What does ${label} mean?">${label}</button>`;
    cursor = hit.end;
  }
  out += italics(escapeHtml(text.slice(cursor)));

  return { html: out, terms: [...usedSlugs] };
}

/**
 * The inline formatting the corpus uses: **bold** and *document titles*.
 * Bold must be handled first — otherwise the italic rule eats one asterisk
 * from each pair and leaves the other on screen.
 */
function italics(s: string): string {
  return s
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>');
}
