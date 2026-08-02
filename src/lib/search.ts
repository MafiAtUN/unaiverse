/**
 * SEARCH — the query half
 * =======================
 * The brief calls search "the single highest-value element for repeat
 * visitors" and asks it to cover "titles, summaries, document symbols,
 * glossary terms, safe lines". It names Pagefind or Fuse.js as candidates.
 * Neither is here, and deliberately: `lib/learn/search.ts` already contains a
 * typo-tolerant scorer written for the glossary, it has no dependencies, and
 * it is smaller than either library's runtime. A corpus this size does not
 * justify shipping a search engine to a field mission on 3G.
 *
 * So this module borrows that file's primitives — normalisation, tokenising,
 * bounded edit distance — and adds the two things the glossary never needed:
 * document symbols, and more than one kind of result.
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
 * Kept free of `astro:content` and of the content libraries on purpose — this
 * module is bundled into the browser. Index construction lives in
 * lib/search-index.
 */
import { editDistance, normalise, tokens } from './learn/search';

/**
 * What a result is.
 *
 * The kinds share one index rather than living in three, because a reader
 * typing "autonomous weapons" wants the resolution, the line they can say
 * about it and the definition of the term ranked against each other — not put
 * in three separate boxes they have to choose between before they have found
 * anything.
 */
export type EntryKind = 'milestone' | 'line' | 'term';

/** One searchable thing. Keys are short because ~550 of these ship as JSON. */
export interface SearchEntry {
  /** kind */ k: EntryKind;
  /** id or slug */ i: string;
  /** headline: the title, the safe line itself, or the term */ t: string;
  /** supporting line: why-it-matters, the source milestone, the definition */ w: string;
  /** href, already prefixed with the site base */ u: string;
  /** date_display, where there is one */ d?: string;
  /** document symbol, as displayed */ s?: string;
  /** tier, milestones only */ r?: 1 | 2 | 3;
  /** persona label, safe lines only */ p?: string;
  /** extra keys: symbol variants, badges, venue, body, topic */ x: string[];
}

export interface SearchHit {
  entry: SearchEntry;
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
 * The symbol outranks the headline because someone who types "79/325" wants
 * that resolution and nothing else, whereas someone who types "panel" is
 * browsing. A search that answers a symbol with a fuzzy title match has failed
 * the only unambiguous query the corpus accepts.
 */
function fieldsOf(e: SearchEntry): Field[] {
  const mk = (raw: string, weight: number, symbol = false): Field => {
    const text = normalise(raw);
    return { text, words: text ? text.split(' ') : [], weight, symbol };
  };
  return [
    mk(e.t, 10),
    ...(e.s ? [mk(e.s, 12, true)] : []),
    ...e.x.map((k) => mk(k, 7, /\d/.test(k))),
    mk(e.w, 3.5),
    ...(e.d ? [mk(e.d, 2.5)] : []),
  ].filter((f) => f.text);
}

const fieldCache = new WeakMap<SearchEntry, Field[]>();
function cachedFields(e: SearchEntry): Field[] {
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

/**
 * A milestone leads its own safe lines and its own vocabulary.
 *
 * Without this, "autonomous weapons" answers with four near-identical safe
 * lines quoting A/RES/78/241 before the resolution itself: the lines score
 * well because the phrase sits in the sentence, and they are the wrong first
 * answer for someone who has not yet said what they want. Someone who does
 * know filters to lines, which drops the bias out of the comparison entirely.
 */
const KIND_BIAS: Record<EntryKind, number> = {
  milestone: 6,
  line: 0,
  term: 2,
};

export function searchEntries(
  query: string,
  index: readonly SearchEntry[],
  limit = 12,
  kinds?: ReadonlySet<EntryKind>,
): SearchHit[] {
  const qTokens = tokens(query);
  if (!qTokens.length) return [];
  const whole = normalise(query);

  const hits: SearchHit[] = [];
  for (const entry of index) {
    if (kinds && !kinds.has(entry.k)) continue;

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

    // "autonomous weapons" as a phrase in the headline beats the two words
    // landing separately in a summary.
    if (qTokens.length > 1) {
      const head = normalise(entry.t);
      if (head === whole) total += 40;
      else if (head.includes(whole)) total += 18;
      else if (fields.some((f) => f.text.includes(whole))) total += 8;
    }

    total += KIND_BIAS[entry.k];

    // Weightier milestones lead on an otherwise even match — a Supernova is
    // more likely to be the thing someone half-remembers than a Stardust.
    if (entry.r) total += (4 - entry.r) * 1.5;

    hits.push({ entry, score: total, onSymbol });
  }

  return hits
    .sort((a, b) => b.score - a.score || a.entry.t.localeCompare(b.entry.t))
    .slice(0, limit);
}
