/**
 * Side-by-side comparisons.
 *
 * These exist because the single most common question about AI vocabulary is
 * not "what does X mean" but "what is the difference between X and Y". The
 * `shortAnswer` on each is hand-written rather than generated: it is the one
 * line a reader will quote in a meeting, and it has to be exactly right.
 */
import { TERM_BY_ID, resolveTerms } from './terms';

export interface Comparison {
  id: string;
  title: string;
  question: string;
  /** The answer in one or two sentences, for a reader who reads nothing else. */
  shortAnswer: string;
  termIds: string[];
}

export const COMPARISONS: Comparison[] = [
  {
    id: 'ai-vs-machine-learning-vs-deep-learning',
    title: 'AI vs machine learning vs deep learning',
    question: 'Are these three words for the same thing?',
    shortAnswer:
      'They are nested, not equivalent. Artificial intelligence is the broad field. Machine learning is the part of it where behaviour is learned from examples rather than written as rules. Deep learning is the part of machine learning that uses many-layered neural networks.',
    termIds: ['artificial-intelligence', 'machine-learning', 'deep-learning'],
  },
  {
    id: 'generative-vs-predictive-ai',
    title: 'Generative AI vs predictive AI',
    question: 'Does the system produce something new, or score something that exists?',
    shortAnswer:
      'Predictive AI puts a number or a label on something that already exists: this claim is probably a duplicate, this district will probably need more water. Generative AI produces new content: a draft, an image, a summary. Most deployed systems in large organisations are still the predictive kind.',
    termIds: ['generative-ai', 'predictive-ai'],
  },
  {
    id: 'training-vs-inference',
    title: 'Training vs inference',
    question: 'Is the model changing, or just being used?',
    shortAnswer:
      'Training is the expensive, occasional process that sets the model\'s internal numbers. Inference is what happens every time you use it afterwards. Asking a chat assistant a question does not train it, and your question does not become part of the model.',
    termIds: ['training', 'inference'],
  },
  {
    id: 'parameter-vs-token',
    title: 'Parameter vs token',
    question: 'Both are counted in the billions. What is the difference?',
    shortAnswer:
      'Parameters are the internal numbers the model learned during training; they are fixed while you use it. Tokens are pieces of text going in and coming out right now. A parameter count describes the model, a token count describes one conversation.',
    termIds: ['parameter', 'token'],
  },
  {
    id: 'context-window-vs-memory',
    title: 'Context window vs memory',
    question: 'If it has a million-token context window, does it remember me?',
    shortAnswer:
      'A context window is how much text the model can look at in one go, and it is emptied when the session ends. Memory is a separate feature some products add, where earlier information is stored outside the model and fed back in. Neither is the model learning about you.',
    termIds: ['context-window', 'long-term-memory', 'short-term-memory'],
  },
  {
    id: 'prompt-engineering-vs-fine-tuning',
    title: 'Prompt engineering vs fine-tuning',
    question: 'Both are called "customising the model". Only one changes it.',
    shortAnswer:
      'Prompt engineering changes what you ask, not the model. Fine-tuning changes the model itself by training it further on new examples, which costs money, needs data and creates something you then have to maintain. Try the first before paying for the second.',
    termIds: ['prompt-engineering', 'fine-tuning'],
  },
  {
    id: 'rag-vs-fine-tuning',
    title: 'RAG vs fine-tuning',
    question: 'We want it to know our documents. Which one do we need?',
    shortAnswer:
      'Almost always retrieval, not fine-tuning. RAG looks your documents up at the moment of the question and can cite them, and it updates the second a document changes. Fine-tuning teaches style and format, not facts, and a fine-tuned model still cannot tell you where an answer came from.',
    termIds: ['retrieval-augmented-generation', 'fine-tuning'],
  },
  {
    id: 'keyword-vs-semantic-search',
    title: 'Keyword search vs semantic search',
    question: 'Matching words, or matching meaning?',
    shortAnswer:
      'Keyword search finds documents containing the words you typed. Semantic search finds documents that mean the same thing, even with no shared words. Each fails where the other succeeds, which is why serious systems run both.',
    termIds: ['keyword-search', 'semantic-search'],
  },
  {
    id: 'chatbot-vs-copilot-vs-agent',
    title: 'Chatbot vs copilot vs agent',
    question: 'The three words in every product pitch.',
    shortAnswer:
      'A chatbot answers. A copilot suggests inside the work you are already doing, and you accept or reject each suggestion. An agent takes steps on its own, calling tools and changing things, which is where oversight stops being optional.',
    termIds: ['chatbot', 'copilot', 'ai-agent'],
  },
  {
    id: 'transparency-vs-explainability',
    title: 'Transparency vs explainability',
    question: 'Two words that get used interchangeably in negotiated text.',
    shortAnswer:
      'Transparency is disclosure about the system: that it exists, what it is for, what data it used, who is accountable. Explainability is an account of why this particular output happened. A system can be fully transparent and still not explainable, and the reverse.',
    termIds: ['transparency', 'explainability', 'interpretability'],
  },
  {
    id: 'bias-vs-variance',
    title: 'Bias vs variance (and neither is discrimination)',
    question: 'Why does "bias" mean three different things?',
    shortAnswer:
      'Statistical bias means a model is systematically off in one direction; variance means it swings wildly with small changes in the data. Neither is the same as algorithmic bias, which is about unfair outcomes for people. The word is overloaded, so always ask which one is meant.',
    termIds: ['statistical-bias', 'variance', 'algorithmic-bias', 'bias-term'],
  },
  {
    id: 'accuracy-vs-precision-vs-recall',
    title: 'Accuracy vs precision vs recall',
    question: 'The vendor says 95% accurate. Is that good?',
    shortAnswer:
      'On its own it means very little. If one case in a hundred is the one you care about, a system that finds none of them is still 99% accurate. Precision asks how many flagged cases were real; recall asks how many real cases were found. Ask for both.',
    termIds: ['accuracy', 'precision', 'recall', 'false-positive-and-false-negative'],
  },
  {
    id: 'privacy-vs-security',
    title: 'Data privacy vs data security',
    question: 'The data was encrypted. Is that privacy?',
    shortAnswer:
      'Security is about keeping data from people who should not have it. Privacy is about whether it should have been collected, kept and used that way at all, including by people who are authorised. A perfectly secured system can still be a privacy failure.',
    termIds: ['privacy', 'data-security', 'confidentiality'],
  },
  {
    id: 'open-source-vs-open-weight',
    title: 'Open-source vs open-weight',
    question: 'Downloadable is not the same as open.',
    shortAnswer:
      'An open-weight model publishes the trained numbers, so anyone can run it. Open-source in its full sense would also mean the training data, the code and a licence without use restrictions. Most models called "open" are open-weight, and the distinction matters for procurement.',
    termIds: ['open-source-ai', 'open-weight-model', 'proprietary-model'],
  },
  {
    id: 'ethics-vs-safety-vs-governance',
    title: 'AI ethics vs AI safety vs AI governance',
    question: 'Three committees, three vocabularies, one topic.',
    shortAnswer:
      'Ethics asks what we should do. Safety asks how a system fails and how to stop it failing badly. Governance asks who decides, under what rules, with what accountability. A text can be strong on one and silent on the other two.',
    termIds: ['ai-ethics', 'ai-safety', 'ai-governance', 'responsible-ai'],
  },
];

export const COMPARISON_BY_ID = new Map(COMPARISONS.map((c) => [c.id, c]));

export function resolveComparison(comparison: Comparison) {
  return { ...comparison, terms: resolveTerms(comparison.termIds) };
}

/** Only show comparisons where at least two sides are published. */
export function resolvedComparisons() {
  return COMPARISONS.map(resolveComparison).filter((c) => c.terms.length >= 2);
}

export function comparisonsFor(termId: string) {
  return resolvedComparisons().filter((c) => c.termIds.includes(termId) && TERM_BY_ID.has(termId));
}
