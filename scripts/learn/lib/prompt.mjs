/**
 * The generation prompts.
 *
 * `PROMPT_VERSION` is stamped into every generated file. Bump it whenever the
 * wording below changes materially: the content report uses it to show which
 * pages were written under an older standard, and `--regenerate-stale` uses it
 * to find them.
 */
export const PROMPT_VERSION = '1.1.0';

export const SYSTEM_PROMPT = `You are an AI literacy educator, visual explanation designer, technical fact-checker, and public-sector communications specialist.

You explain artificial intelligence accurately to intelligent non-specialists, including United Nations personnel and members of the public.

Your writing must be understandable to a high-school learner without sounding childish. Aim for an eighth- to tenth-grade reading level: short sentences, short paragraphs, one new idea at a time.

Start with intuition, then add optional technical depth.

Use internationally understandable examples. Use names and places from different regions of the world. Never build an example that only makes sense in one country.

Avoid unexplained jargon, hype, fearmongering, anthropomorphism, and unsupported claims. Do not describe a model as understanding, thinking, knowing, wanting, believing or deciding without qualifying the word. Do not treat model output as inherently factual.

Every analogy must include its limitation: state plainly where the analogy stops working.

Every explanation must distinguish the concept from the terms it is commonly confused with.

Every visual specification must teach a causal, structural or procedural idea rather than decorate the page. It must be implementable in plain HTML, CSS and SVG.

UN workplace examples must be realistic and must protect privacy, confidentiality, human rights, safety and human oversight. Never suggest putting confidential, personal, survivor, witness, security-sensitive or operational information into an unapproved public AI service. Treat Member States and contested political questions neutrally, and never advocate a policy position.

Where terminology is genuinely contested or unsettled, say so rather than picking a side.

Return only JSON conforming exactly to the supplied schema. Do not produce Markdown, code fences, or commentary outside the JSON.

Do not invent references, titles, quotations, statistics, dates or URLs. You are never asked for a URL: resource links are supplied to you and you only describe them.

Use international English spelling (organisation, recognise, behaviour, analyse).

Never use an em dash. This site ships none anywhere else, and a page that uses them reads as written by a different hand. Use a comma, a colon, a full stop or brackets instead.`;

/**
 * Rotated so 300 terms do not all reach for the same story. Taken from the
 * brief's own list of acceptable contexts, which exists precisely because the
 * default LLM example is a cat, a dog, or a recipe.
 */
const EXAMPLE_CONTEXTS = [
  'sorting urgent and non-urgent messages',
  'predicting rainfall for a farming cooperative',
  'translating a short field report',
  'recognising damaged roads in satellite images',
  'recommending documents from a knowledge base',
  'detecting duplicate records in a registry',
  'estimating food requirements for a distribution point',
  'classifying public feedback from a consultation',
  'summarising meeting notes',
  'searching policy documents',
  'planning a journey across a city',
  'learning from mistakes on a practice examination',
  'tuning a radio to a clear signal',
  'locating a book in a large library',
  'choosing the next word in a sentence',
  'working out who an ambiguous pronoun refers to',
  'comparing two paragraphs that say the same thing in different words',
  'sorting incoming applications by completeness',
  'spotting an unusual reading on a water pump sensor',
  'matching a photograph of a form to the right template',
  'grouping survey answers that raise the same issue',
  'checking whether a shipping manifest matches the delivery',
];

const UN_CONTEXTS = [
  'preparing a briefing note',
  'searching resolutions for prior language',
  'analysing survey responses from a household assessment',
  'translating field updates into a working language',
  'reviewing programme monitoring data',
  'producing a situation report',
  'supporting humanitarian coordination',
  'analysing satellite imagery after a disaster',
  'identifying protection trends across incident reports',
  'summarising submissions to a public consultation',
  'drafting text while maintaining human review',
  'managing confidential or sensitive data',
  'preparing procurement requirements for a software purchase',
  'triaging a shared inbox in a country office',
  'checking a draft speech against agreed language',
  'building an internal search tool over guidance documents',
];

const pick = (list, seed) => list[Math.abs(seed) % list.length];

/** Stable per-term seed, so re-running produces the same rotation. */
function seedOf(id) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return h;
}

const FIELD_GUIDE = `
Field requirements:

- Respect these length ceilings, because content past them is rejected: oneSentence 260 characters, keyTakeaway 300, whyItMatters 800, everydayAnalogy.story 1200, everydayAnalogy.limitation 600, visual.description 1200, visual.accessibilityDescription 900, simpleVsTechnical.technical 1600, plainExplanation 2000, each misconception correction 700, each quiz option 200.
- oneSentence: one sentence, at most 30 words, that defines the term immediately. No "is when". No restating the term inside itself. Prefer short common words: a definition that stacks four abstract nouns in a row is not a definition, it is a restatement.
- READING LEVEL: aim for a Flesch–Kincaid grade of 8 to 10 across oneSentence and plainExplanation. In practice that means average sentences under 20 words and a preference for one- and two-syllable words wherever an exact one exists.
- plainExplanation: 3 to 5 short paragraphs separated by a blank line. Explain what goes in, what happens, and what comes out. Define any unavoidable technical word at first use.
- everydayAnalogy.story: a concrete situation with people and objects, 3 to 6 sentences. Not cats, not dogs, not recipes, not generic robots.
- everydayAnalogy.mapping: 2 to 5 pairs mapping a piece of the story to the real mechanism.
- everydayAnalogy.limitation: where the analogy misleads. Required. Be specific about the difference, not vague.
- visual.description: at most 600 characters. Say what the diagram shows and how to read it; the step-by-step detail belongs in the steps array, not here.
- visual: a specification an engineer could implement in HTML/CSS/SVG today. 2 to 6 steps. learningObjective states what the reader should be able to say afterwards. accessibilityDescription is what a screen-reader user hears INSTEAD of the diagram and must convey the same idea in prose. reducedMotionDescription is what a reader who has asked for less motion sees: a static equivalent.
- workedExample: one concrete run-through with real (invented but plausible) numbers or text where useful. process is 2 to 6 ordered steps.
- unWorkplaceExample: a realistic United Nations workplace situation. If the term touches personal, confidential or protection-sensitive data, the caution field must say what must not be done.
- whyItMatters: why a non-specialist should care, in decision-making terms.
- whereYouMayHearIt: 2 to 5 short phrases naming the settings where the term shows up.
- commonMisconceptions: 2 to 4. The misconception must be one people actually hold, and the correction must explain why, not just contradict.
- simpleVsTechnical.simple: the version for someone with no background. .technical: the version for a reader who wants the mechanism, and may use precise vocabulary.
- keyTakeaway: one memorable sentence.
- quickCheck: 3 or 4 options, exactly one defensible answer, distractors that are plausible rather than silly, and an explanation that teaches rather than just confirming.
- searchKeywords: 4 to 12 lower-case strings a confused reader might actually type, including likely misspellings and informal phrasings.
- contested: include ONLY if the term's definition is genuinely disputed. Otherwise omit the field.
- relatedTermIds and oftenConfusedWith: choose ONLY from the supplied candidate ids. Do not invent ids. 3 to 6 related, 0 to 4 confused.
`;

export function buildTermPrompt({ taxonomyTerm, category, candidates, resources, existing, visualComponent, validationFeedback }) {
  const seed = seedOf(taxonomyTerm.id);
  const lines = [];

  lines.push(`Write the learning content for one term.`);
  lines.push('');
  lines.push(`TERM: ${taxonomyTerm.term}`);
  if (taxonomyTerm.acronym) lines.push(`ACRONYM: ${taxonomyTerm.acronym}`);
  if (taxonomyTerm.aliases?.length) lines.push(`ALSO CALLED: ${taxonomyTerm.aliases.join(', ')}`);
  lines.push(`CATEGORY: ${category.name} — ${category.plain}`);
  lines.push(`DIFFICULTY: ${taxonomyTerm.difficulty}`);
  lines.push(`PRIMARY AUDIENCES: ${(taxonomyTerm.audiences ?? ['everyone']).join(', ')}`);
  lines.push('');

  if (taxonomyTerm.term.includes(' and ') || taxonomyTerm.aliases?.length > 2) {
    lines.push(
      `NOTE: this entry deliberately covers several closely related words together (${[taxonomyTerm.term, ...(taxonomyTerm.aliases ?? [])].join(', ')}). Explain how they relate rather than treating them as one undifferentiated thing.`,
    );
    lines.push('');
  }

  lines.push('CANDIDATE TERM IDS you may link to (use the id exactly, never invent one):');
  for (const c of candidates) {
    lines.push(`  ${c.id} — ${c.term}${c.hint ? ` (${c.hint})` : ''}`);
  }
  lines.push('');

  if (taxonomyTerm.prerequisites?.length) {
    lines.push(
      `PREREQUISITES already recorded for this term: ${taxonomyTerm.prerequisites.join(', ')}. Assume the reader may not have read them, so do not depend on them, but do not re-teach them at length either.`,
    );
    lines.push('');
  }

  lines.push(
    `RESOURCE LINKS supplied for this term, numbered. You will NOT return any URL — the links already exist. Return \`resourceNotes\`: exactly ${resources.length} strings, in this order, each one sentence saying what a reader gets from that specific link and who it suits. Do not describe a link you were not given, and do not claim a link contains something you cannot know.`,
  );
  resources.forEach((r, i) => {
    lines.push(
      `  ${i + 1}. [${r.type}] ${r.title}${r.publisher ? ` — ${r.publisher}` : ''}` +
        (r.isSearch ? ' (a SEARCH results page, not one article — say so)' : ''),
    );
  });
  lines.push('');

  lines.push(`SUGGESTED EVERYDAY CONTEXT (use it if it genuinely fits this term; otherwise choose another concrete situation, but do not fall back on cats, dogs, recipes or robots): ${pick(EXAMPLE_CONTEXTS, seed)}.`);
  lines.push(`SUGGESTED UN WORKPLACE CONTEXT (same rule): ${pick(UN_CONTEXTS, seed >> 3)}.`);
  lines.push('');

  if (visualComponent) {
    lines.push(
      `VISUAL: this term has a hand-built interactive explainer already implemented on the site (component "${visualComponent}"). Write the visual specification to DESCRIBE that explainer: its learning objective, its steps, what a reader can interact with, the screen-reader alternative, and the reduced-motion alternative. Use visual.type "simulation" or "slider" as fits.`,
    );
  } else {
    lines.push(
      `VISUAL: this term will be rendered by the generic step-diagram renderer. Choose the visual.type that fits: step-sequence (an ordered process), flow (inputs moving through stages to an output), comparison (two approaches side by side), before-after (a state change), concept-map (things placed by relatedness), animated-diagram, slider or simulation.`,
    );
  }
  lines.push('');

  if (existing) {
    lines.push('EXISTING CONTENT you are revising. Keep what is accurate, fix what is weak, and do not drift away from a definition that was already correct:');
    lines.push(JSON.stringify({ oneSentence: existing.oneSentence, plainExplanation: existing.plainExplanation, keyTakeaway: existing.keyTakeaway }, null, 1));
    lines.push('');
  }

  if (validationFeedback?.length) {
    lines.push('YOUR PREVIOUS ANSWER FAILED VALIDATION. Fix exactly these problems and return the whole object again:');
    for (const f of validationFeedback) lines.push(`  - ${f}`);
    lines.push('');
  }

  lines.push(FIELD_GUIDE);
  lines.push('');
  lines.push('Return a single JSON object with exactly these keys: oneSentence, plainExplanation, everydayAnalogy, visual, workedExample, unWorkplaceExample, whyItMatters, whereYouMayHearIt, commonMisconceptions, simpleVsTechnical, keyTakeaway, quickCheck, searchKeywords, relatedTermIds, oftenConfusedWith, and optionally contested.');

  return lines.join('\n');
}
