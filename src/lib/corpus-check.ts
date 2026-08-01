/**
 * CORPUS INVARIANTS
 * =================
 * The build-time checks that used to live in the frontmatter of the homepage:
 * 76 milestones, 156 take slots, every take bound to a real slot, every
 * milestone annotated with a duty station and an owning body.
 *
 * They were never really homepage concerns — they are checks on the content,
 * and having them depend on which page happened to render every milestone
 * meant that restructuring the site would have silently switched them off.
 * That is exactly what the redesign does to that page, so they moved here.
 *
 * Warnings fire once per build no matter how many pages ask, because a
 * per-page warning over 76 milestone pages is not a warning, it is a wall.
 */
import { takeLoadReport, unboundTakes } from './takes';

export interface CorpusStats {
  milestones: number;
  /** Persona slots declared across the corpus — the denominator for takes. */
  takeSlots: number;
  takesLoaded: number;
  takesExpected: number;
  /** Source links across every milestone body. */
  receipts: number;
  tierCounts: Record<number, number>;
}

export interface CheckableMilestone {
  id: string;
  data: {
    tier: 1 | 2 | 3;
    personas: string[];
    venue: string[];
    organ: string[];
  };
  body?: string;
}

const EXPECTED_MILESTONES = 76;
const EXPECTED_SLOTS = 156;

let reported = false;

export function checkCorpus(entries: CheckableMilestone[]): CorpusStats {
  const tierCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0 };
  let takeSlots = 0;
  let receipts = 0;

  for (const m of entries) {
    tierCounts[m.data.tier]!++;
    takeSlots += m.data.personas.length;
    receipts += m.body?.match(/https?:\/\/[^\s)>"]+/g)?.length ?? 0;
  }

  const takes = takeLoadReport();
  const stats: CorpusStats = {
    milestones: entries.length,
    takeSlots,
    takesLoaded: takes.loaded,
    takesExpected: takes.expected,
    receipts,
    tierCounts,
  };

  if (reported) return stats;
  reported = true;

  if (entries.length !== EXPECTED_MILESTONES) {
    console.warn(`[unaiverse] expected ${EXPECTED_MILESTONES} milestones, found ${entries.length}`);
  }
  if (takeSlots !== EXPECTED_SLOTS) {
    console.warn(`[unaiverse] expected ${EXPECTED_SLOTS} take slots, found ${takeSlots}`);
  }
  console.log(
    `[unaiverse] ${entries.length} milestones · ${takeSlots} take slots · ` +
      `${takes.loaded}/${takes.expected} takes loaded` +
      (takes.skipped.length ? ` · ${takes.skipped.length} skipped` : ''),
  );
  for (const s of takes.skipped.slice(0, 5)) {
    console.warn(`[unaiverse] take skipped (${s.reason}):`, s.sample);
  }

  // A milestone with no venue or body never matches those filters and the
  // omission is invisible on the page — it simply never appears in the Geneva
  // file. The Big Bang is the deliberate exception: a private product launch
  // has no duty station (see scripts/annotate-milestones.mjs).
  for (const m of entries) {
    if (m.id === '2022-chatgpt-big-bang') continue;
    if (!m.data.venue.length || !m.data.organ.length) {
      console.warn(
        `[unaiverse] "${m.id}" has no venue/organ — add it to scripts/annotate-milestones.mjs`,
      );
    }
  }

  const slotKeys = new Set(entries.flatMap((m) => m.data.personas.map((p) => `${m.id}::${p}`)));
  for (const o of unboundTakes(slotKeys)) {
    console.warn(
      `[unaiverse] take binds to no slot: "${o.milestoneId}" / "${o.persona}" — check spelling`,
    );
  }

  return stats;
}
