/**
 * Typo-tolerant term search.
 *
 * Pure functions over a precomputed index, deliberately with no DOM and no
 * dependencies: the same code runs in the browser, in the build (to emit the
 * index) and in the tests. A search library would be a bigger download than
 * the index it searches.
 *
 * The bar it has to clear is a real reader's typing:
 *   "back propogation" → backpropagation
 *   "gradient decent"  → gradient descent
 *   "LLM"              → large language model
 *   "memory limit"     → context window
 */

export interface SearchEntry {
  /** id */ i: string;
  /** term */ t: string;
  /** acronym */ y?: string;
  /** aliases */ a: string[];
  /** category id */ c: string;
  /** category name */ n: string;
  /** difficulty */ d: 'starter' | 'intermediate' | 'deeper';
  /** one-sentence definition */ s: string;
  /** search keywords */ k: string[];
}

export interface SearchHit {
  entry: SearchEntry;
  score: number;
  /** Set when the match was on something other than the term itself. */
  matchedOn?: string;
}

const DIACRITICS = /[̀-ͯ]/g;

export function normalise(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(DIACRITICS, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function tokens(s: string): string[] {
  const n = normalise(s);
  return n ? n.split(' ') : [];
}

/**
 * Levenshtein distance with an early exit. Bounded because we only ever ask
 * "is this within 2 edits", and the unbounded version over a 300-term index on
 * every keystroke is the difference between instant and laggy on a phone.
 */
export function editDistance(a: string, b: string, max = 2): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const v = Math.min(prev[j]! + 1, row[j - 1]! + 1, prev[j - 1]! + cost);
      row.push(v);
      if (v < best) best = v;
    }
    if (best > max) return max + 1;
    prev = row;
  }
  return prev[b.length]!;
}

interface Field {
  text: string;
  words: string[];
  weight: number;
  label?: string;
}

function fieldsOf(e: SearchEntry): Field[] {
  const mk = (raw: string, weight: number, label?: string): Field => {
    const text = normalise(raw);
    return { text, words: text ? text.split(' ') : [], weight, label };
  };
  return [
    mk(e.t, 10),
    ...(e.y ? [mk(e.y, 9.5, 'acronym')] : []),
    ...e.a.map((a) => mk(a, 8, `also called “${a}”`)),
    ...e.k.map((k) => mk(k, 5.5, 'keyword')),
    mk(e.n, 2.5, 'category'),
    mk(e.s, 2),
  ].filter((f) => f.text);
}

/** Cached per entry: rebuilding the field list on every keystroke is wasteful. */
const fieldCache = new WeakMap<SearchEntry, Field[]>();
function cachedFields(e: SearchEntry): Field[] {
  let f = fieldCache.get(e);
  if (!f) {
    f = fieldsOf(e);
    fieldCache.set(e, f);
  }
  return f;
}

function scoreToken(token: string, fields: Field[]): { score: number; label?: string } {
  let best = 0;
  let label: string | undefined;
  const consider = (value: number, l?: string) => {
    if (value > best) {
      best = value;
      label = l;
    }
  };

  for (const f of fields) {
    if (f.text === token) {
      consider(f.weight * 3.2, f.label);
      continue;
    }
    if (f.text.startsWith(token)) consider(f.weight * 2.4, f.label);
    else if (f.text.includes(token)) consider(f.weight * 1.5, f.label);

    for (const w of f.words) {
      if (w === token) consider(f.weight * 2.8, f.label);
      else if (w.startsWith(token)) consider(f.weight * 2.0, f.label);
      // Only try fuzzy matching on words long enough for an edit to be a typo
      // rather than a different word. "cat"/"car" must not match.
      else if (token.length >= 4 && w.length >= 4) {
        const max = token.length >= 7 ? 2 : 1;
        const d = editDistance(token, w, max);
        if (d <= max) consider(f.weight * (1.9 - 0.55 * d), f.label);
      }
    }
  }
  return { score: best, label };
}

export function search(query: string, index: readonly SearchEntry[], limit = 25): SearchHit[] {
  const qTokens = tokens(query);
  if (!qTokens.length) return [];
  const whole = normalise(query);

  const hits: SearchHit[] = [];
  for (const entry of index) {
    const fields = cachedFields(entry);
    let total = 0;
    let matchedAll = true;
    let label: string | undefined;

    for (const token of qTokens) {
      const { score, label: l } = scoreToken(token, fields);
      if (score <= 0) {
        matchedAll = false;
        break;
      }
      total += score;
      if (!label && l) label = l;
    }
    if (!matchedAll) continue;

    // A multi-word query that matches the term as a phrase beats the same
    // words scattered across a definition.
    const termText = normalise(entry.t);
    if (qTokens.length > 1) {
      if (termText === whole) total += 40;
      else if (termText.startsWith(whole)) total += 22;
      else if (cachedFields(entry).some((f) => f.text.includes(whole))) total += 10;
    }

    // Nudge starters up. Someone typing a half-remembered word is far more
    // often at the beginning than looking for the optimiser chapter.
    if (entry.d === 'starter') total += 3;
    else if (entry.d === 'deeper') total -= 1.5;

    // Shorter terms win ties: "token" should outrank "cost per token".
    total -= Math.min(entry.t.length, 60) * 0.04;

    hits.push({ entry, score: total, matchedOn: label });
  }

  return hits.sort((a, b) => b.score - a.score || a.entry.t.localeCompare(b.entry.t)).slice(0, limit);
}

/** Suggestions for an empty query: the terms most people arrive looking for. */
export const POPULAR_TERM_IDS = [
  'large-language-model',
  'hallucination',
  'token',
  'context-window',
  'retrieval-augmented-generation',
  'ai-agent',
  'algorithmic-bias',
  'human-oversight',
  'fine-tuning',
  'prompt-injection',
];
