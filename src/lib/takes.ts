/**
 * TAKES LOADER
 * ============
 * 156 takes (72 Supernova + 84 Star) are being generated separately and will
 * arrive as JSON. Until they do, every slot renders a "take incoming" state.
 *
 * TO INGEST THEM: drop the file at `src/data/takes.json` and rebuild. Nothing
 * else needs to change — no config, no code, no rebuild of the manifest.
 *
 * The loader is deliberately permissive about shape, because the generation
 * pipeline's exact output isn't fixed yet. It accepts:
 *
 *   [ {...}, {...} ]                         ← bare array
 *   { "takes": [ {...} ] }                   ← wrapped (matches takes_manifest.json)
 *
 * ...and per entry, any of these key spellings:
 *
 *   milestone_id | milestoneId | id
 *   persona      | persona_id  | personaId
 *   so_what / watch_for / use_it
 *   soWhat  / watchFor  / useIt
 *   "So what" / "Watch for" / "Use it"
 *   beats: { ...any of the above... }
 *   text | take | body   ← a single string containing all three labelled beats
 *
 * Anything it cannot understand is reported by `takeLoadReport()` rather than
 * silently dropped, so a malformed batch shows up at build time.
 */

export interface Take {
  milestoneId: string;
  persona: string;
  soWhat: string;
  watchFor: string;
  useIt: string;
}

export interface TakeLoadReport {
  loaded: number;
  expected: number;
  skipped: { reason: string; sample: unknown }[];
  present: boolean;
}

// Resolves to {} when no takes file exists yet — no error, no try/catch.
const modules = import.meta.glob<Record<string, unknown>>('../data/takes*.json', {
  eager: true,
});

const EXPECTED_TOTAL = 156;

function pick(obj: Record<string, any>, keys: string[]): string | undefined {
  for (const k of keys) {
    const v = obj?.[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return undefined;
}

/** Split "So what: … Watch for: … Use it: …" out of one blob of text. */
function beatsFromText(text: string): Partial<Take> | null {
  const re =
    /so\s*what\s*:\s*([\s\S]*?)(?=watch\s*for\s*:|$)|watch\s*for\s*:\s*([\s\S]*?)(?=use\s*it\s*:|$)|use\s*it\s*:\s*([\s\S]*)$/gi;
  const out: Partial<Take> = {};
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m[1]) out.soWhat = clean(m[1]);
    if (m[2]) out.watchFor = clean(m[2]);
    if (m[3]) out.useIt = clean(m[3]);
  }
  return out.soWhat || out.watchFor || out.useIt ? out : null;
}

function clean(s: string): string {
  return s.replace(/\*\*/g, '').replace(/\s+/g, ' ').trim();
}

function normalise(raw: any): { take?: Take; reason?: string } {
  if (!raw || typeof raw !== 'object') return { reason: 'not an object' };

  const milestoneId = pick(raw, ['milestone_id', 'milestoneId', 'id']);
  const persona = pick(raw, ['persona', 'persona_id', 'personaId']);
  if (!milestoneId) return { reason: 'missing milestone_id' };
  if (!persona) return { reason: 'missing persona' };

  const src = raw.beats && typeof raw.beats === 'object' ? { ...raw, ...raw.beats } : raw;

  let soWhat = pick(src, ['so_what', 'soWhat', 'So what', 'so what']);
  let watchFor = pick(src, ['watch_for', 'watchFor', 'Watch for', 'watch for']);
  let useIt = pick(src, ['use_it', 'useIt', 'Use it', 'use it']);

  if (!soWhat && !watchFor && !useIt) {
    const text = pick(src, ['text', 'take', 'body', 'content']);
    if (text) {
      const parsed = beatsFromText(text);
      if (parsed) {
        soWhat = parsed.soWhat;
        watchFor = parsed.watchFor;
        useIt = parsed.useIt;
      }
    }
  }

  if (!soWhat && !watchFor && !useIt) return { reason: 'no recognisable beats' };

  return {
    take: {
      milestoneId,
      persona,
      soWhat: clean(soWhat ?? ''),
      watchFor: clean(watchFor ?? ''),
      useIt: clean(useIt ?? ''),
    },
  };
}

const index = new Map<string, Take>();
const skipped: { reason: string; sample: unknown }[] = [];
let filePresent = false;

for (const mod of Object.values(modules)) {
  filePresent = true;
  const payload: any = (mod as any).default ?? mod;
  const list: unknown[] = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.takes)
      ? payload.takes
      : [];

  if (!list.length) {
    skipped.push({ reason: 'file present but no takes array found', sample: null });
    continue;
  }

  for (const raw of list) {
    const { take, reason } = normalise(raw);
    if (take) index.set(`${take.milestoneId}::${take.persona}`, take);
    else skipped.push({ reason: reason ?? 'unknown', sample: raw });
  }
}

export function getTake(milestoneId: string, persona: string): Take | null {
  return index.get(`${milestoneId}::${persona}`) ?? null;
}

/**
 * Every take that loaded cleanly but binds to no slot in the corpus —
 * i.e. a milestone_id or persona that no milestone declares. Almost always a
 * typo in the generated batch, and otherwise invisible: the take is "loaded"
 * and the slot still says "take incoming". Surfaced at build time instead.
 */
export function unboundTakes(
  slots: ReadonlySet<string>,
): { milestoneId: string; persona: string }[] {
  const orphans: { milestoneId: string; persona: string }[] = [];
  for (const [key, take] of index) {
    if (!slots.has(key)) {
      orphans.push({ milestoneId: take.milestoneId, persona: take.persona });
    }
  }
  return orphans;
}

export function takeLoadReport(): TakeLoadReport {
  return {
    loaded: index.size,
    expected: EXPECTED_TOTAL,
    skipped,
    present: filePresent,
  };
}
