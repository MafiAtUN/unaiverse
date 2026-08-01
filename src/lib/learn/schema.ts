/**
 * The content model for the AI Literacy Universe.
 *
 * One schema, two consumers: the Astro build imports it to type the term
 * dataset, and the Node scripts in `scripts/learn/` import it *by .ts path*
 * (Node strips the types) to validate whatever Azure OpenAI returned. Keeping
 * a single definition is the whole point — a generated file that passes
 * `content:validate` cannot then fail the site build.
 *
 * Deliberately strict. A term with a missing analogy limitation or a quiz
 * whose answer index is out of range is not a slightly worse page, it is a
 * page that teaches something wrong, so it must not be publishable.
 */
import { z } from 'zod';

export const DIFFICULTIES = ['starter', 'intermediate', 'deeper'] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  starter: 'Starter',
  intermediate: 'Intermediate',
  deeper: 'Deeper',
};

export const AUDIENCES = [
  'everyone',
  'policy',
  'leadership',
  'human-rights',
  'programme',
  'communications',
  'technical',
] as const;
export type Audience = (typeof AUDIENCES)[number];

export const AUDIENCE_LABEL: Record<Audience, string> = {
  everyone: 'Everyone',
  policy: 'Policy officers',
  leadership: 'Managers & front offices',
  'human-rights': 'Human rights practitioners',
  programme: 'Programme & data teams',
  communications: 'Communications teams',
  technical: 'Technical readers',
};

export const RESOURCE_TYPES = [
  'official',
  'wikipedia',
  'video',
  'article',
  'course',
  'discussion',
  'interactive',
] as const;
export type ResourceType = (typeof RESOURCE_TYPES)[number];

export const RESOURCE_TYPE_LABEL: Record<ResourceType, string> = {
  official: 'Primary source',
  wikipedia: 'Encyclopaedia',
  video: 'Video',
  article: 'Article',
  course: 'Course',
  discussion: 'Discussion',
  interactive: 'Interactive',
};

/**
 * Visual kinds the UI can actually render. The generator is given this list
 * and may not invent a kind — a `visual.type` nothing implements would be a
 * term page with an empty box where its one required explanation should be.
 */
export const VISUAL_TYPES = [
  'step-sequence',
  'comparison',
  'flow',
  'before-after',
  'concept-map',
  'slider',
  'simulation',
  'animated-diagram',
] as const;
export type VisualType = (typeof VISUAL_TYPES)[number];

/**
 * Bespoke interactive explainers. `visual.component` is set locally (never by
 * the model) from `VISUAL_COMPONENT_BY_TERM`; every other term falls back to
 * the generic renderer driven by `visual.steps`.
 */
export const VISUAL_COMPONENTS = [
  'gradient-descent',
  'backpropagation',
  'tokenizer',
  'context-window',
  'parameters',
  'embeddings',
  'attention',
  'rag',
  'overfitting',
  'hallucination',
  'precision-recall',
  'temperature',
] as const;
export type VisualComponent = (typeof VISUAL_COMPONENTS)[number];

/** Which term gets which hand-built explainer. Everything else is generic. */
export const VISUAL_COMPONENT_BY_TERM: Record<string, VisualComponent> = {
  'gradient-descent': 'gradient-descent',
  backpropagation: 'backpropagation',
  token: 'tokenizer',
  tokenisation: 'tokenizer',
  'context-window': 'context-window',
  parameter: 'parameters',
  embedding: 'embeddings',
  attention: 'attention',
  'self-attention': 'attention',
  'retrieval-augmented-generation': 'rag',
  overfitting: 'overfitting',
  hallucination: 'hallucination',
  precision: 'precision-recall',
  recall: 'precision-recall',
  'false-positive-and-false-negative': 'precision-recall',
  temperature: 'temperature',
};

const nonEmpty = (max: number) => z.string().trim().min(1).max(max);

export const learningResourceSchema = z.object({
  title: nonEmpty(200),
  url: z.url(),
  type: z.enum(RESOURCE_TYPES),
  publisher: z.string().max(120).optional(),
  /** Why this link is worth a reader's time. Written by the generator. */
  description: nonEmpty(400),
  difficulty: z.enum(DIFFICULTIES).optional(),
  /**
   * `false` is not a failure state — it means "we have not fetched a 200 from
   * this URL", and the card says so to the reader rather than implying a check
   * that never happened. Set by `scripts/learn/check-links.mjs`.
   */
  verified: z.boolean(),
  lastChecked: z.string().optional(),
  /** True for a search URL rather than a specific page, so the UI can say so. */
  isSearch: z.boolean().default(false),
});
export type LearningResource = z.infer<typeof learningResourceSchema>;

export const visualStepSchema = z.object({
  label: nonEmpty(80),
  explanation: nonEmpty(400),
  /** What the diagram should show at this step. Drives the generic renderer. */
  visualInstruction: nonEmpty(300),
});

export const visualSchema = z.object({
  type: z.enum(VISUAL_TYPES),
  title: nonEmpty(120),
  learningObjective: nonEmpty(400),
  description: nonEmpty(1200),
  steps: z.array(visualStepSchema).min(2).max(7),
  interaction: z.string().max(400).optional(),
  /** The screen-reader alternative. Mandatory: WCAG 2.2 AA, not a nice-to-have. */
  accessibilityDescription: nonEmpty(900),
  /** What a reader who asked for less motion sees instead. Also mandatory. */
  reducedMotionDescription: nonEmpty(600),
  component: z.enum(VISUAL_COMPONENTS).optional(),
});
export type TermVisual = z.infer<typeof visualSchema>;

export const quickCheckSchema = z
  .object({
    question: nonEmpty(300),
    options: z.array(nonEmpty(200)).min(3).max(4),
    correctOptionIndex: z.number().int().min(0),
    explanation: nonEmpty(600),
  })
  .refine((q) => q.correctOptionIndex < q.options.length, {
    message: 'correctOptionIndex points past the end of options',
    path: ['correctOptionIndex'],
  })
  .refine((q) => new Set(q.options.map((o) => o.toLowerCase())).size === q.options.length, {
    message: 'quiz options must be distinct',
    path: ['options'],
  });

export const termExplanationSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  term: nonEmpty(120),
  acronym: z.string().max(20).optional(),
  aliases: z.array(z.string().max(80)),
  categoryId: z.string().regex(/^[a-z0-9-]+$/),
  subcategory: z.string().max(80).optional(),
  difficulty: z.enum(DIFFICULTIES),
  audiences: z.array(z.enum(AUDIENCES)).min(1),

  prerequisiteTermIds: z.array(z.string()),
  relatedTermIds: z.array(z.string()),
  oftenConfusedWith: z.array(z.string()),

  oneSentence: nonEmpty(260),
  plainExplanation: nonEmpty(2000),

  everydayAnalogy: z.object({
    title: nonEmpty(120),
    story: nonEmpty(1200),
    mapping: z
      .array(
        z.object({
          analogyElement: nonEmpty(120),
          aiElement: nonEmpty(160),
        }),
      )
      .min(2)
      .max(6),
    /** Where the analogy stops working. Required for every single term. */
    limitation: nonEmpty(600),
  }),

  visual: visualSchema,

  workedExample: z.object({
    scenario: nonEmpty(600),
    input: z.string().max(600).optional(),
    process: z.array(nonEmpty(400)).min(2).max(7),
    result: nonEmpty(600),
  }),

  unWorkplaceExample: z.object({
    scenario: nonEmpty(800),
    relevance: nonEmpty(600),
    caution: z.string().max(600).optional(),
  }),

  whyItMatters: nonEmpty(800),
  whereYouMayHearIt: z.array(nonEmpty(200)).min(2).max(6),

  commonMisconceptions: z
    .array(
      z.object({
        misconception: nonEmpty(300),
        correction: nonEmpty(700),
      }),
    )
    .min(2)
    .max(4),

  simpleVsTechnical: z.object({
    simple: nonEmpty(700),
    technical: nonEmpty(1600),
  }),

  keyTakeaway: nonEmpty(300),
  quickCheck: quickCheckSchema,

  resources: z.array(learningResourceSchema).max(8),
  searchKeywords: z.array(nonEmpty(60)).min(3).max(20),

  /** Terminology that is genuinely unsettled, flagged for the reader. */
  contested: z.string().max(600).optional(),

  contentVersion: z.string(),

  /**
   * `reviewed` means A PERSON READ IT. Nothing automated may set this — not
   * the schema validator, not the link checker, and not the second-model
   * review pass below. It is set only by `content:publish`, run by a human who
   * is asserting they read the page.
   */
  reviewed: z.boolean(),
  reviewerNotes: z.string().max(2000).optional(),
  lastReviewed: z.string().optional(),

  /**
   * The adversarial second-model pass: a *different* model from the one that
   * wrote the page, prompted to find what is wrong rather than to approve.
   *
   * Deliberately a separate field from `reviewed`, because it is a separate
   * claim. It catches arithmetic that does not add up, analogy limitations
   * that hedge instead of limiting, quiz answers that are not defensible, and
   * definitions that fail to distinguish themselves from their neighbours. It
   * does not catch a confidently wrong account of how something works, which
   * is exactly what a human reviewer is for.
   */
  machineReview: z
    .object({
      model: z.string(),
      deployment: z.string(),
      promptVersion: z.string(),
      reviewedAt: z.string(),
      verdict: z.enum(['pass', 'revise', 'reject']),
      issues: z.array(
        z.object({
          field: z.string().max(80),
          severity: z.enum(['error', 'warning', 'nit']),
          problem: z.string().max(600),
          fix: z.string().max(600).optional(),
        }),
      ),
      /** Fields the pass actually rewrote, after re-validating the result. */
      applied: z.array(z.string()).default([]),
    })
    .optional(),

  /**
   * The United Nations voice pass: setting and register, never mechanism.
   *
   * A separate record from `machineReview` because it answers a different
   * question. That one asks "is this true"; this one asks "would a colleague
   * recognise their own week in it". The definition and the plain explanation
   * are out of its reach by design.
   *
   * Must be declared here or Zod strips it on the way through `safeParse`,
   * which silently loses the audit trail and makes every re-run start over.
   */
  voicePass: z
    .object({
      model: z.string(),
      deployment: z.string(),
      promptVersion: z.string(),
      revisedAt: z.string(),
      applied: z.array(z.string()).default([]),
      note: z.string().max(400).optional(),
    })
    .optional(),

  /**
   * Provenance. Present on anything the pipeline produced; absent only on a
   * fixture. `/learn/methodology` renders it, because a site about AI literacy
   * that hides how its own pages were written would be teaching the wrong thing.
   */
  generation: z
    .object({
      model: z.string(),
      deployment: z.string(),
      promptVersion: z.string(),
      generatedAt: z.string(),
      contentHash: z.string(),
      attempts: z.number().int().min(1).default(1),
      promptTokens: z.number().int().optional(),
      completionTokens: z.number().int().optional(),
    })
    .optional(),
});

export type TermExplanation = z.infer<typeof termExplanationSchema>;

/**
 * The subset the model is asked to write. Everything else is set locally.
 *
 * Note what is absent: `resources`. The model never returns a URL, because a
 * model that is asked for a URL will eventually invent one. It is handed the
 * supplied link list and returns `resourceNotes` — one "why this is worth your
 * time" per link, in order — which the pipeline zips back onto the real URLs.
 */
export const generatedTermSchema = termExplanationSchema.pick({
  oneSentence: true,
  plainExplanation: true,
  everydayAnalogy: true,
  visual: true,
  workedExample: true,
  unWorkplaceExample: true,
  whyItMatters: true,
  whereYouMayHearIt: true,
  commonMisconceptions: true,
  simpleVsTechnical: true,
  keyTakeaway: true,
  quickCheck: true,
  searchKeywords: true,
  contested: true,
  relatedTermIds: true,
  oftenConfusedWith: true,
}).extend({
  /** One note per supplied resource, in the order they were supplied. */
  resourceNotes: z.array(nonEmpty(400)).max(8).default([]),
});
export type GeneratedTerm = z.infer<typeof generatedTermSchema>;

export const categorySchema = z.object({
  id: z.string(),
  name: z.string(),
  glyph: z.string(),
  plain: z.string(),
  starterTermId: z.string(),
  adjacent: z.array(z.string()),
});
export type LearnCategory = z.infer<typeof categorySchema>;

export const taxonomyTermSchema = z.object({
  id: z.string(),
  term: z.string(),
  acronym: z.string().optional(),
  aliases: z.array(z.string()).default([]),
  categoryId: z.string(),
  difficulty: z.enum(DIFFICULTIES),
  audiences: z.array(z.enum(AUDIENCES)).default(['everyone']),
  prerequisites: z.array(z.string()).default([]),
  confusedWith: z.array(z.string()).default([]),
});
export type TaxonomyTerm = z.infer<typeof taxonomyTermSchema>;

export const taxonomySchema = z.object({
  version: z.string(),
  categories: z.array(categorySchema),
  terms: z.array(taxonomyTermSchema),
});
export type Taxonomy = z.infer<typeof taxonomySchema>;
