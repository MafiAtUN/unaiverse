/**
 * Guided learning paths.
 *
 * Hand-authored, in the same spirit as A/BOT's quests on the timeline: a route
 * is an editorial judgement about what to read in what order, and nothing
 * derivable from the graph would produce a good one. Progress is remembered in
 * the browser only — there is no account, and there never will be.
 *
 * A path may list a term that is not published yet; `resolvePath` drops it, so
 * a path never shows a dead step.
 */
import { TERM_BY_ID, resolveTerms } from './terms';
import type { Audience } from './schema';

export interface LearningPath {
  id: string;
  title: string;
  blurb: string;
  glyph: string;
  audience: Audience;
  /** Rough reading time in minutes, from ~90 seconds a term at layer 1–2. */
  minutes: number;
  termIds: string[];
}

export const LEARNING_PATHS: LearningPath[] = [
  {
    id: 'ai-basics-in-15-minutes',
    title: 'AI basics in 15 minutes',
    blurb: 'The nine words everything else is built from. Start here if you have never started anywhere.',
    glyph: '🌱',
    audience: 'everyone',
    minutes: 15,
    termIds: [
      'artificial-intelligence', 'algorithm', 'model', 'data', 'machine-learning',
      'training', 'inference', 'generative-ai', 'large-language-model',
    ],
  },
  {
    id: 'understand-chatgpt',
    title: 'Understand ChatGPT and large language models',
    blurb: 'What is actually happening when a chat assistant answers you, and why fluent is not the same as correct.',
    glyph: '💬',
    audience: 'everyone',
    minutes: 18,
    termIds: [
      'large-language-model', 'token', 'next-token-prediction', 'prompt', 'context-window',
      'completion', 'temperature', 'hallucination', 'understanding',
    ],
  },
  {
    id: 'ai-for-diplomats',
    title: 'AI terminology for diplomats',
    blurb: 'The vocabulary that shows up in negotiated text, and what each word commits anyone to.',
    glyph: '🏛️',
    audience: 'policy',
    minutes: 20,
    termIds: [
      'ai-governance', 'normative-instrument', 'resolution', 'consensus', 'interoperability',
      'capacity-building', 'global-digital-compact', 'scientific-panel-on-ai',
      'global-dialogue-on-ai-governance', 'ai-divide',
    ],
  },
  {
    id: 'ai-for-managers',
    title: 'AI for managers and front offices',
    blurb: 'Enough to chair the meeting, ask the right question, and know what must not be pasted into a chat box.',
    glyph: '🎩',
    audience: 'leadership',
    minutes: 18,
    termIds: [
      'generative-ai', 'ai-assistant', 'prompt', 'hallucination', 'human-oversight',
      'confidentiality', 'shadow-ai', 'automation-bias', 'cost-per-token', 'deployment',
    ],
  },
  {
    id: 'ai-for-programme-officers',
    title: 'AI for programme and policy officers',
    blurb: 'How a prediction is made, how it is judged, and how it quietly goes wrong once it is in the field.',
    glyph: '🌍',
    audience: 'programme',
    minutes: 20,
    termIds: [
      'data', 'dataset', 'classification', 'predictive-ai', 'accuracy',
      'false-positive-and-false-negative', 'distribution-shift', 'algorithmic-bias',
      'impact-assessment', 'human-oversight',
    ],
  },
  {
    id: 'ai-for-human-rights',
    title: 'AI for human rights practitioners',
    blurb: 'Where the harm actually lands: in the data, in the threshold, and in who never gets to appeal.',
    glyph: '⚖️',
    audience: 'human-rights',
    minutes: 22,
    termIds: [
      'algorithmic-bias', 'fairness', 'non-discrimination', 'privacy', 'consent',
      'facial-recognition', 'explainability', 'human-rights-due-diligence',
      'meaningful-human-control', 'annotation',
    ],
  },
  {
    id: 'ai-for-communications',
    title: 'AI for communications teams',
    blurb: 'Generated media, provenance, and the difference between a model being wrong and a person lying.',
    glyph: '📣',
    audience: 'communications',
    minutes: 18,
    termIds: [
      'generative-ai', 'text-generation', 'image-generation', 'deepfake', 'synthetic-media',
      'watermarking', 'misinformation', 'hallucination', 'citation', 'accessibility',
    ],
  },
  {
    id: 'ai-for-data-teams',
    title: 'AI for data and digital teams',
    blurb: 'The build-side vocabulary: what you index, what you retrieve, and what you measure afterwards.',
    glyph: '💻',
    audience: 'technical',
    minutes: 22,
    termIds: [
      'data-cleaning', 'annotation', 'embedding', 'vector-database', 'semantic-search',
      'retrieval-augmented-generation', 'evaluation-metric', 'distribution-shift', 'api', 'deployment',
    ],
  },
  {
    id: 'understand-ai-governance',
    title: 'Understand AI governance',
    blurb: 'Who writes the rules, what kind of rules they are, and why "not binding" is not the same as "no effect".',
    glyph: '📜',
    audience: 'policy',
    minutes: 20,
    termIds: [
      'ai-governance', 'regulation', 'normative-instrument', 'international-standard',
      'risk-based-regulation', 'technology-neutral-regulation', 'regulatory-sandbox',
      'ai-audit-and-assurance', 'multi-stakeholder-governance',
    ],
  },
  {
    id: 'risks-without-panic',
    title: 'Understand AI risks without panic',
    blurb: 'The failures that actually happen, in proportion, without either hype or doom.',
    glyph: '🧯',
    audience: 'everyone',
    minutes: 20,
    termIds: [
      'hallucination', 'algorithmic-bias', 'prompt-injection', 'deepfake', 'automation-bias',
      'data-exfiltration', 'ai-safety', 'red-teaming', 'guardrail',
    ],
  },
  {
    id: 'how-ai-learns',
    title: 'How AI learns',
    blurb: 'From a pile of examples to a working model, one mechanism at a time. The engine-room tour.',
    glyph: '⚙️',
    audience: 'everyone',
    minutes: 25,
    termIds: [
      'data', 'training-example', 'label', 'supervised-learning', 'neural-network',
      'error-and-loss', 'gradient-descent', 'backpropagation', 'overfitting', 'generalisation',
    ],
  },
  {
    id: 'from-prompts-to-agents',
    title: 'From prompts to agents',
    blurb: 'How a system that answers becomes a system that acts, and what has to be supervised when it does.',
    glyph: '🛠️',
    audience: 'technical',
    minutes: 20,
    termIds: [
      'prompt', 'system-prompt', 'prompt-engineering', 'in-context-learning', 'tool-use',
      'function-calling', 'ai-agent', 'orchestration', 'human-in-the-loop',
    ],
  },
  {
    id: 'from-embeddings-to-rag',
    title: 'From embeddings to RAG',
    blurb: 'Why searching by meaning works, and how it turns a confident guess into a cited answer.',
    glyph: '🧭',
    audience: 'technical',
    minutes: 22,
    termIds: [
      'vector', 'embedding', 'semantic-similarity', 'semantic-search', 'vector-database',
      'chunking', 'retrieval', 'retrieval-augmented-generation', 'grounding', 'citation',
    ],
  },
  {
    id: 'assess-an-ai-proposal',
    title: 'How to assess an AI proposal',
    blurb: 'The ten questions to ask a vendor, a colleague, or a concept note, in the order you should ask them.',
    glyph: '🔍',
    audience: 'leadership',
    minutes: 22,
    termIds: [
      'evaluation-metric', 'baseline', 'accuracy', 'false-positive-and-false-negative',
      'data-governance', 'impact-assessment', 'human-oversight', 'deployment',
      'cost-per-token', 'ai-audit-and-assurance',
    ],
  },
  {
    id: 'terms-in-un-resolutions',
    title: 'AI terms appearing in UN resolutions',
    blurb: 'Words that made it into negotiated text. Each one links to the milestone where it landed.',
    glyph: '🗳️',
    audience: 'policy',
    minutes: 22,
    termIds: [
      'ai-governance', 'capacity-building', 'interoperability', 'digital-public-infrastructure',
      'ai-divide', 'human-rights-due-diligence', 'lethal-autonomous-weapons',
      'global-digital-compact', 'scientific-panel-on-ai', 'sustainable-development-goals',
    ],
  },
];

export const PATH_BY_ID = new Map(LEARNING_PATHS.map((p) => [p.id, p]));

/** A path with its published steps. Unpublished ids are dropped, not shown broken. */
export function resolvePath(path: LearningPath) {
  const steps = resolveTerms(path.termIds);
  return {
    ...path,
    steps,
    // If half a path is missing, the estimate on the card would be a lie.
    minutes: Math.max(5, Math.round((path.minutes * steps.length) / Math.max(path.termIds.length, 1))),
    missing: path.termIds.filter((id) => !TERM_BY_ID.has(id)),
  };
}

export function resolvedPaths() {
  return LEARNING_PATHS.map(resolvePath).filter((p) => p.steps.length >= 3);
}

/** Paths that include this term, so a term page can offer its context. */
export function pathsContaining(termId: string) {
  return resolvedPaths().filter((p) => p.steps.some((s) => s.id === termId));
}
