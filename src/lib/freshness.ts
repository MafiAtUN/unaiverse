/**
 * WHAT CHANGED SINCE THE LAST PUBLISH (brief §6, journey J3)
 * ==========================================================
 * "Items changed since last publish carry a new/updated badge."
 *
 * J3 is a mission delegate on their second visit with five minutes. The only
 * question they have is "what is different since I last looked", and answering
 * it is what turns a site into a bookmark. Answering it wrongly — badging
 * everything, or badging nothing — is worse than not answering.
 *
 * ── Why a committed manifest and not git ─────────────────────────────────
 * The obvious implementation is `git log` over content/milestones. It is also
 * the wrong one:
 *
 *   • GitHub Actions clones shallow by default, so the history the build can
 *     see depends on CI configuration rather than on the content.
 *   • A commit is not a publish. Fifteen commits fixing a typo in a comment
 *     are not a change to this file; one edit to a milestone's why-line is.
 *   • It cannot distinguish "edited while drafting, before anyone saw it"
 *     from "edited after readers had already read it", which is the only
 *     distinction a returning reader cares about.
 *
 * So the record is explicit: `content/publish-log.json` is a snapshot of what
 * the corpus looked like at the last publish, updated by `npm run publish:stamp`
 * as a deliberate act and committed alongside the content. The build compares
 * today's corpus against it. An id the snapshot has never seen is new; an id
 * whose hash moved is updated; everything else is quiet.
 *
 * The consequence worth stating: badges persist across every build until
 * someone stamps a publish. That is correct — they should clear when readers
 * have had a chance to see them, not when a build happens to run.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { hashMarkdown } from './publish-hash';
import log from '../../content/publish-log.json';

export type Freshness = 'new' | 'updated' | 'unchanged';

export interface PublishLog {
  publishedAt: string;
  entries: Record<string, { hash: string; firstSeen: string }>;
}

export interface HashableMilestone {
  id: string;
}

const manifest = log as PublishLog;

const MILESTONE_DIR = path.join(process.cwd(), 'content', 'milestones');

/**
 * The content hash for one milestone, read from the file the author edits.
 *
 * Not from the parsed collection entry: zod has filled in defaults and coerced
 * types by then, and the stamping script — plain Node, no Astro — could not
 * reproduce that without reimplementing the schema. Both sides hash the raw
 * markdown through lib/publish-hash, which is the only way the two can be
 * guaranteed to agree.
 */
export function contentHash(entry: HashableMilestone): string {
  return hashMarkdown(readFileSync(path.join(MILESTONE_DIR, `${entry.id}.md`), 'utf8'));
}

/**
 * Freshness for every milestone, keyed by id.
 *
 * An empty manifest means no baseline has ever been stamped, and the honest
 * answer then is "nothing is new" rather than "all 76 things are new" — a
 * wall of badges says exactly as little as no badges at all.
 */
export function freshnessMap(entries: HashableMilestone[]): Map<string, Freshness> {
  const out = new Map<string, Freshness>();
  const baseline = manifest.entries ?? {};
  const hasBaseline = Object.keys(baseline).length > 0;

  for (const entry of entries) {
    if (!hasBaseline) {
      out.set(entry.id, 'unchanged');
      continue;
    }
    const known = baseline[entry.id];
    if (!known) out.set(entry.id, 'new');
    else if (known.hash !== contentHash(entry)) out.set(entry.id, 'updated');
    else out.set(entry.id, 'unchanged');
  }

  return out;
}

/** When the corpus was last stamped as published. */
export function lastPublished(): string {
  return manifest.publishedAt;
}

export const FRESHNESS_LABEL: Record<Exclude<Freshness, 'unchanged'>, string> = {
  new: 'New',
  updated: 'Updated',
};
