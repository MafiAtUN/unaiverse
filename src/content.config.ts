import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/**
 * Milestones live at the repo root in `content/milestones/`, deliberately outside
 * `src/` — content is edited independently of code (plan §8). The glob loader
 * derives each entry's `id` from the filename, which is identical to the
 * `id:` field in frontmatter and to `milestone_id` in takes_manifest.json.
 * That three-way identity is what lets takes bind to nodes without a lookup table.
 */
const milestones = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './content/milestones' }),
  schema: z.object({
    // `id` is present in frontmatter but stripped here: the loader-derived id is canonical.
    title: z.string(),
    date_display: z.string(),
    year: z.number().nullable(),
    symbol: z.string().nullable(),
    zone: z.number().int().min(0).max(3),
    constellation: z.enum([
      'governance',
      'summits',
      'inside-the-machine',
      'peace-security',
      'development-rights',
      'adjacent-tracks',
      'anchor',
      'horizon',
    ]),
    tier: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    badges: z.array(z.string()).default([]),
    personas: z.array(z.string()).default([]),
    unverified: z.boolean().default(false),

    // Duty station and owning body (lib/taxonomy VENUES / ORGANS). Arrays,
    // because a track like WSIS+20 genuinely runs in two cities under two
    // bodies and forcing a single value would be a lie about the file.
    // Default [] so an unannotated milestone still builds — it simply never
    // matches a venue or body filter.
    venue: z.array(z.string()).default([]),
    organ: z.array(z.string()).default([]),

    // Series that will certainly meet again but whose next date the UN has not
    // announced. They belong on /agenda — "the summit is annual and in Geneva"
    // is a coverage decision even without a date — but they must never become
    // calendar entries, because the date would be invented.
    recurs: z
      .object({
        cadence: z.string(),
        next: z.string(),
      })
      .optional(),

    // What this milestone obliges someone to do, and by when. Only the ~20
    // nodes that actually create an obligation carry these; the ledger at
    // /agenda is assembled from every `mandates` block in the corpus, so a
    // new entry appears there the moment it is added to a milestone file.
    //
    // `due_sort` is a plain YYYYMMDD integer because the due date is often
    // prose ("eighty-second session") that no date parser should be asked to
    // guess at. Written by hand, next to the prose it sorts.
    mandates: z
      .array(
        z.object({
          what: z.string(),
          who: z.string(),
          due: z.string(),
          due_sort: z.number().int(),
          status: z.enum(['done', 'pending', 'upcoming']),
          source: z.string().optional(),
          note: z.string().optional(),
        }),
      )
      .default([]),

    // Layer 1 of the panel (plan §5) — "Mafi's take", 2–3 sentences in the
    // fun voice. Not written yet; the slot renders only when it appears, so
    // these can be filled in file by file without touching code.
    tldr: z.string().optional(),

    // Optional illustration, used by the /timeline view (TimelineJS puts media
    // beside the text on every slide). Declared here so a picture can be added
    // to any milestone file without a code change; nothing renders without it.
    media: z
      .object({
        url: z.string(),
        caption: z.string().optional(),
        credit: z.string().optional(),
        thumbnail: z.string().optional(),
      })
      .optional(),

    // Supernovas get a pull quote (CONTENT_SPEC §1). Sourced like everything else.
    quote: z
      .object({
        text: z.string(),
        attribution: z.string(),
        url: z.string().url().optional(),
      })
      .optional(),
  }),
});

export const collections = { milestones };
