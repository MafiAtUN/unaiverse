/**
 * BRIEFING NOTES
 * ==============
 * The site's most-requested export, in the format the request actually takes:
 * "can you send me a paragraph on this, with the symbol and the link."
 *
 * The static half of each note is assembled here at build time and parked in
 * the node's markup. The client script adds whichever take is on screen and
 * writes the result to the clipboard — so the copy button does no formatting,
 * and a note copied from the page is byte-identical to one copied from print.
 *
 * Plain text on purpose. It has to survive being pasted into Word, Outlook,
 * Teams and a cable template without carrying a single style with it.
 */
import { parseMilestoneBody } from './milestone';
import { ORGAN_BY_ID, VENUE_BY_ID } from './taxonomy';

export interface BriefSource {
  id: string;
  title: string;
  dateDisplay: string;
  symbol: string | null;
  badges: string[];
  venue: string[];
  organ: string[];
  body: string;
  /** Absolute, so the note is useful to whoever it gets forwarded to. */
  url: string;
}

export interface BriefParts {
  /** Title, date, symbol, classification line. */
  head: string;
  /** Factual prose plus the why-it-matters line. */
  body: string;
  /** "SOURCES" block and the attribution footer. */
  tail: string;
}

/** "Adopted by consensus · New York · GA plenary" */
function classification(src: BriefSource): string {
  const bits: string[] = [];

  if (src.badges.includes('CONSENSUS')) bits.push('Adopted by consensus');
  else if (src.badges.includes('VOTED')) bits.push('Adopted by recorded vote');
  if (src.badges.includes('FIRST-EVER')) bits.push('First of its kind');
  if (src.badges.includes('UPCOMING')) bits.push('Not yet held');

  const venues = src.venue.map((v) => VENUE_BY_ID.get(v)?.label).filter(Boolean);
  const organs = src.organ.map((o) => ORGAN_BY_ID.get(o)?.label).filter(Boolean);

  return [...bits, ...venues, ...organs].join(' · ');
}

export function buildBrief(src: BriefSource): BriefParts {
  const { factual, receipts, why } = parseMilestoneBody(src.body);

  const headLines = [
    src.title.toUpperCase(),
    [src.dateDisplay, src.symbol].filter(Boolean).join('  ·  '),
  ];
  const cls = classification(src);
  if (cls) headLines.push(cls);

  const bodyLines = [factual.replace(/\s*\n\s*/g, ' ').trim()];
  if (why) bodyLines.push('', `WHY IT MATTERS: ${why}`);

  const tailLines = ['SOURCES', ...receipts.map((r) => `  ${r.label}: ${r.url}`)];
  tailLines.push(
    '',
    `Compiled from UNAIVERSE, an unofficial field guide to UN action on AI: ${src.url}`,
    'Not a United Nations product. Every claim above is sourced to the documents listed.',
  );

  return {
    head: headLines.join('\n'),
    body: bodyLines.join('\n'),
    tail: tailLines.join('\n'),
  };
}

/**
 * The whole note in one string, for contexts with no persona selected —
 * the agenda page, the ledger, and anything printed.
 */
export function flattenBrief(parts: BriefParts, take?: string): string {
  return [parts.head, '', parts.body, ...(take ? ['', take] : []), '', parts.tail].join('\n');
}
