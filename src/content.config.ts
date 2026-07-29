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
  }),
});

export const collections = { milestones };
