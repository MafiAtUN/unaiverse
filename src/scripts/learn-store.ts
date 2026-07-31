/**
 * Local learning state.
 *
 * There is no account, no server and no identity. Saved terms, completed
 * steps, the preferred explanation depth and the last few terms you looked at
 * live in this browser and nowhere else — which is also why every read is
 * wrapped: a browser with storage disabled, a private window, or a full quota
 * must degrade to "the site works, nothing is remembered", never to a crash.
 *
 * Nothing here is ever transmitted. The site makes no network request after
 * the page and its search index have loaded.
 */

const PREFIX = 'unaiverse.learn.';
const KEYS = {
  saved: `${PREFIX}saved`,
  done: `${PREFIX}done`,
  depth: `${PREFIX}depth`,
  recent: `${PREFIX}recent`,
  quiz: `${PREFIX}quiz`,
} as const;

export type Depth = 'brief' | 'standard' | 'full';
export const DEPTHS: Depth[] = ['brief', 'standard', 'full'];

let available: boolean | null = null;

/** Feature-detect once. Safari in private mode throws on `setItem`, not on access. */
export function storageAvailable(): boolean {
  if (available !== null) return available;
  try {
    const probe = `${PREFIX}probe`;
    localStorage.setItem(probe, '1');
    localStorage.removeItem(probe);
    available = true;
  } catch {
    available = false;
  }
  return available;
}

function readList(key: string): string[] {
  if (!storageAvailable()) return [];
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function writeList(key: string, value: string[]): void {
  if (!storageAvailable()) return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota, or a browser that lied about availability. Nothing to do. */
  }
}

/** Broadcast so every widget on the page (and other tabs) can re-render. */
function announce(kind: string): void {
  window.dispatchEvent(new CustomEvent('learn:change', { detail: { kind } }));
}

// ── Saved terms ────────────────────────────────────────────────────────
export const savedTerms = () => readList(KEYS.saved);
export const isSaved = (id: string) => savedTerms().includes(id);

export function toggleSaved(id: string): boolean {
  const list = savedTerms();
  const next = list.includes(id) ? list.filter((x) => x !== id) : [id, ...list];
  writeList(KEYS.saved, next.slice(0, 300));
  announce('saved');
  return next.includes(id);
}

// ── Completed terms (drives learning-path progress) ────────────────────
export const doneTerms = () => readList(KEYS.done);
export const isDone = (id: string) => doneTerms().includes(id);

export function setDone(id: string, done: boolean): void {
  const list = doneTerms();
  const next = done ? [...new Set([...list, id])] : list.filter((x) => x !== id);
  writeList(KEYS.done, next);
  announce('done');
}

export function toggleDone(id: string): boolean {
  const next = !isDone(id);
  setDone(id, next);
  return next;
}

// ── Recently viewed ────────────────────────────────────────────────────
export function recordVisit(id: string): void {
  const next = [id, ...readList(KEYS.recent).filter((x) => x !== id)].slice(0, 12);
  writeList(KEYS.recent, next);
}

export const recentTerms = () => readList(KEYS.recent);

// ── Preferred depth ────────────────────────────────────────────────────
export function getDepth(): Depth {
  if (!storageAvailable()) return 'standard';
  try {
    const v = localStorage.getItem(KEYS.depth);
    return DEPTHS.includes(v as Depth) ? (v as Depth) : 'standard';
  } catch {
    return 'standard';
  }
}

export function setDepth(depth: Depth): void {
  if (!storageAvailable()) return;
  try {
    localStorage.setItem(KEYS.depth, depth);
  } catch {
    /* ignore */
  }
  announce('depth');
}

// ── Quiz results ───────────────────────────────────────────────────────
export function recordQuiz(id: string, correct: boolean): void {
  if (!storageAvailable()) return;
  try {
    const raw = localStorage.getItem(KEYS.quiz);
    const map = raw ? JSON.parse(raw) : {};
    map[id] = correct;
    localStorage.setItem(KEYS.quiz, JSON.stringify(map));
  } catch {
    /* ignore */
  }
  announce('quiz');
}

export function quizResults(): Record<string, boolean> {
  if (!storageAvailable()) return {};
  try {
    const raw = localStorage.getItem(KEYS.quiz);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

// ── The escape hatch ───────────────────────────────────────────────────
/** Everything this site has stored, deleted. Offered on every page that stores anything. */
export function clearAll(): void {
  if (!storageAvailable()) return;
  for (const key of Object.values(KEYS)) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  }
  announce('cleared');
}

export function onChange(fn: (kind: string) => void): () => void {
  const handler = (e: Event) => fn((e as CustomEvent).detail?.kind ?? 'unknown');
  window.addEventListener('learn:change', handler);
  // Another tab changing the same keys should update this one too.
  const storageHandler = (e: StorageEvent) => {
    if (e.key?.startsWith(PREFIX)) fn('storage');
  };
  window.addEventListener('storage', storageHandler);
  return () => {
    window.removeEventListener('learn:change', handler);
    window.removeEventListener('storage', storageHandler);
  };
}
