/**
 * The JSON Schema handed to Azure OpenAI as a structured-output contract.
 *
 * Why this is hand-written rather than derived from the Zod schema: strict
 * structured output accepts only a subset of JSON Schema (every property
 * required, `additionalProperties: false`, no length or numeric bounds, no
 * defaults). A machine-translated Zod schema trips over all four. So this file
 * fixes the *shape* — key names, nesting, enums — and Zod still enforces the
 * *quality* bounds locally afterwards.
 *
 * Without this the model paraphrases key names: `storyPart` instead of
 * `analogyElement`, a dropped `title`, no `resourceNotes` at all. Prose
 * instructions do not survive a 300-term run.
 */
import { VISUAL_TYPES } from '../../../src/lib/learn/schema.ts';

const str = { type: 'string' };
const strArray = { type: 'array', items: str };

function obj(properties, { optional = [] } = {}) {
  // Strict mode requires every key in `required`; optional fields are modelled
  // as nullable instead, which the pipeline strips before validating.
  const props = { ...properties };
  for (const key of optional) {
    props[key] = { anyOf: [props[key], { type: 'null' }] };
  }
  return {
    type: 'object',
    properties: props,
    required: Object.keys(props),
    additionalProperties: false,
  };
}

export const TERM_RESPONSE_SCHEMA = obj({
  oneSentence: str,
  plainExplanation: str,
  everydayAnalogy: obj({
    title: str,
    story: str,
    mapping: {
      type: 'array',
      items: obj({ analogyElement: str, aiElement: str }),
    },
    limitation: str,
  }),
  visual: obj(
    {
      type: { type: 'string', enum: [...VISUAL_TYPES] },
      title: str,
      learningObjective: str,
      description: str,
      steps: {
        type: 'array',
        items: obj({ label: str, explanation: str, visualInstruction: str }),
      },
      interaction: str,
      accessibilityDescription: str,
      reducedMotionDescription: str,
    },
    { optional: ['interaction'] },
  ),
  workedExample: obj(
    {
      scenario: str,
      input: str,
      process: strArray,
      result: str,
    },
    { optional: ['input'] },
  ),
  unWorkplaceExample: obj(
    { scenario: str, relevance: str, caution: str },
    { optional: ['caution'] },
  ),
  whyItMatters: str,
  whereYouMayHearIt: strArray,
  commonMisconceptions: {
    type: 'array',
    items: obj({ misconception: str, correction: str }),
  },
  simpleVsTechnical: obj({ simple: str, technical: str }),
  keyTakeaway: str,
  quickCheck: obj({
    question: str,
    options: strArray,
    correctOptionIndex: { type: 'integer' },
    explanation: str,
  }),
  searchKeywords: strArray,
  relatedTermIds: strArray,
  oftenConfusedWith: strArray,
  resourceNotes: strArray,
  contested: str,
}, { optional: ['contested'] });

/** Structured output cannot express "omit this key", so nulls come back instead. */
export function stripNulls(value) {
  if (Array.isArray(value)) return value.map(stripNulls);
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (v === null) continue;
      out[k] = stripNulls(v);
    }
    return out;
  }
  return value;
}
