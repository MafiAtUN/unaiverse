/**
 * MILESTONE SEARCH — the query half
 * =================================
 * The brief calls search "the single highest-value element for repeat
 * visitors" and names Pagefind or Fuse.js as candidates. Neither is here, and
 * deliberately: `lib/learn/search.ts` already contains a typo-tolerant scorer
 * written for the 307-term glossary, it has no dependencies, and it is smaller
 * than either library's runtime. A corpus of 76 milestones does not justify
 * shipping a search engine to a field mission on 3G.
 *
 * So this module borrows that file's primitives — normalisation, tokenising,
 * bounded edit distance — and adds the one thing the glossary never needed:
 * document symbols.
 *
 * ── Why symbols need their own handling ──────────────────────────────────
 * Delegates type symbols from memory and rarely in full. All of these must
 * find A/RES/78/241:
 *
 *   A/RES/78/241   the whole thing
 *   78/241         the half anyone actually remembers
 *   78241          the half, typed without reaching for the slash
 *   ARES78241      pasted from a filename
 *
 * `normalise()` turns punctuation into spaces, so "78/241" tokenises to
 * ["78", "241"] and matches the symbol's own words. The two run-together
 * forms have no word boundary to match on, so the index carries them
 * pre-flattened as extra keys. That is the whole trick.
 *
 * Kept free of `astro:content` and of lib/milestone on purpose — this module
 * is bundled into the browser. Index construction lives in lib/milestone-index.
 */
import { editDistance, normalise, tokens } from './learn/search';

/** One searchable milestone. Keys are short because 76 of these ship as JSON. */
export interface MilestoneEntry {
  /** id — also the deep-link slug at /m/<id> */ i: string;
  /** title */ t: string;
  /** date_display */ d: string;
  /** why it matters, one line */ w: string;
  /** tier */ r: 1 | 2 | 3;
  /** document symbol, as displayed */ s?: string;
  /** extra search keys: symbol variants, badges, venue and body labels */ k: string[];
}

export interface MilestoneHit {
  entry: MilestoneEntry;
  score: number;
  /** Set when the winning match was a document symbol, so the UI can say so. */
  onSymbol: boolean;
}

interface Field {
  text: string;
  words: string[];
  weight: number;
  symbol?: boolean;
}

/**
 * Field weights, in the order a reader's intent maps onto them.
 *
 * The symbol outranks the title because someone who types "79/325" wants that
 * resolution and nothing else, whereas someone who types "panel" is browsing.
 * A search that answers a symbol with a fuzzy title match has failed the only
 * unambiguous query the corpus accepts.
 */
function fieldsOf(e: MilestoneEntry): Field[] {
  const mk = (raw: string, weight: number, symbol = false): Field => {
    const text = normalise(raw);
    return { text, words: text ? text.split(' ') : [], weight, symbol };
  };
  return [
    mk(e.t, 10),
    ...(e.s ? [mk(e.s, 12, true)] : []),
    ...e.k.map((k) => mk(k, 7, /\d/.test(k))),
    mk(e.w, 3.5),
    mk(e.d, 2.5),
  ].filter((f) => f.text);
}

const fieldCache = new WeakMap<MilestoneEntry, Field[]>();
function cachedFields(e: MilestoneEntry): Field[] {
  let f = fieldCache.get(e);
  if (!f) {
    f = fieldsOf(e);
    fieldCache.set(e, f);
  }
  return f;
}

/**
 * Digits are never typos.
 *
 * The glossary scorer fuzzy-matches any token of four characters or more,
 * which is right for "backpropogation" and catastrophic for symbols: at edit
 * distance 2, "78/241" matches "78/265", and a briefing note cites the wrong
 * resolution. Anything containing a digit is matched exactly.
 */
const HAS_DIGIT = /\d/;

function scoreToken(token: string, fields: Field[]): { score: number; symbol: boolean } {
  let best = 0;
  let symbol = false;
  const consider = (value: number, isSymbol: boolean) => {
    if (value > best) {
      best = value;
      symbol = isSymbol;
    }
  };

  const numeric = HAS_DIGIT.test(token);

  for (const f of fields) {
    if (f.text === token) {
      consider(f.weight * 3.2, !!f.symbol);
      continue;
    }
    if (f.text.startsWith(token)) consider(f.weight * 2.4, !!f.symbol);
    else if (f.text.includes(token)) consider(f.weight * 1.6, !!f.symbol);

    for (const w of f.words) {
      if (w === token) consider(f.weight * 2.8, !!f.symbol);
      else if (w.startsWith(token)) consider(f.weight * 2.0, !!f.symbol);
      else if (!numeric && token.length >= 4 && w.length >= 4) {
        const max = token.length >= 7 ? 2 : 1;
        const d = editDistance(token, w, max);
        if (d <= max) consider(f.weight * (1.9 - 0.55 * d), !!f.symbol);
      }
    }
  }
  return { score: best, symbol };
}

export function searchMilestones(
  query: string,
  index: readonly MilestoneEntry[],
  limit = 12,
): MilestoneHit[] {
  const qTokens = tokens(query);
  if (!qTokens.length) return [];
  const whole = normalise(query);

  const hits: MilestoneHit[] = [];
  for (const entry of index) {
    const fields = cachedFields(entry);
    let total = 0;
    let matchedAll = true;
    let onSymbol = false;

    for (const token of qTokens) {
      const { score, symbol } = scoreToken(token, fields);
      if (score <= 0) {
        matchedAll = false;
        break;
      }
      total += score;
      if (symbol) onSymbol = true;
    }
    if (!matchedAll) continue;

    // "autonomous weapons" as a phrase in the title beats the two words
    // landing separately in a summary.
    if (qTokens.length > 1) {
      const title = normalise(entry.t);
      if (title === whole) total += 40;
      else if (title.includes(whole)) total += 18;
      else if (fields.some((f) => f.text.includes(whole))) total += 8;
    }

    // Weightier milestones lead on an otherwise even match — a Supernova is
    // more likely to be the thing someone half-remembers than a Stardust.
    total += (4 - entry.r) * 1.5;

    hits.push({ entry, score: total, onSymbol });
  }

  return hits
    .sort((a, b) => b.score - a.score || a.entry.t.localeCompare(b.entry.t))
    .slice(0, limit);
}
