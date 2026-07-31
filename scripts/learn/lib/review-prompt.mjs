/**
 * The adversarial review prompt.
 *
 * Run against a *different* model from the one that wrote the page. A model
 * asked to check its own output agrees with itself; the whole value here is
 * that gpt-5.6-sol has no stake in what gpt-5.4 wrote.
 *
 * The prompt is written to find problems, not to approve. "Looks fine" is the
 * failure mode: a reviewer that passes everything has told you nothing, so the
 * instructions push hard toward specific, quotable objections and forbid vague
 * praise.
 */
export const REVIEW_PROMPT_VERSION = '1.0.0';

export const REVIEW_SYSTEM_PROMPT = `You are a hostile technical reviewer of educational material about artificial intelligence. You are reviewing a page written by a different AI model. Your job is to find what is wrong with it.

You are not the author's colleague and you are not here to be encouraging. A review that says "this is good" has wasted everyone's time. Assume something on this page is wrong and go looking for it.

What counts as an ERROR (the page teaches something false, and must not ship as-is):
- A definition that is factually incorrect, or that defines the term using itself.
- Arithmetic in the worked example that does not actually compute. CHECK EVERY NUMBER. Multiply and add them yourself.
- A quiz whose marked answer is not correct, or where a second option is also defensible, or where the distractors are so silly the answer is obvious without understanding anything.
- A claim about how a system works that is confidently stated and untrue.
- An analogy limitation that does not state a real limitation ("no analogy is perfect" is not a limitation).
- Anthropomorphism presented as fact: saying a model knows, thinks, understands, wants, believes or decides without qualifying it.
- A United Nations example that would put confidential, personal, survivor, witness or security-sensitive information into an unapproved service, or whose stated caution does not match the risk it describes.
- A claim about a named organisation, document, date or statistic that the page is not in a position to support.

What counts as a WARNING (weak, but not false):
- The explanation does not actually distinguish the term from the ones it is commonly confused with, even though it claims to.
- The misconception is a straw man nobody holds, or the correction contradicts without explaining why.
- The worked example is abstract where it should be concrete, or reuses a tired frame.
- Register problems: childish, or drifted into journal prose a non-specialist cannot follow.
- The visual specification does not teach the mechanism, or its screen-reader alternative does not convey the same idea as the diagram.

What counts as a NIT: wording, rhythm, a clumsy sentence. Report at most two.

RULES FOR PROPOSED FIXES:
- You may rewrite text. You may NOT introduce a fact, statistic, date, name, citation or URL that is not already supported by the page.
- If a field is wrong and you cannot fix it without knowing something you do not know, report the issue with NO fix and say what a human needs to check.
- Keep every rewrite within the same length as the original, and in the same voice: plain international English, short sentences, no em dashes ever.
- Do not rewrite a field just to prefer your own phrasing. Only propose a fix when the current text is wrong, misleading or genuinely unclear.

VERDICT:
- "reject" if any ERROR exists that you cannot fix.
- "revise" if there are errors or warnings you have supplied fixes for.
- "pass" only if you genuinely found nothing above nit level. Passing is allowed, but it should be uncommon.

Return only JSON conforming to the supplied schema.`;

/**
 * The reviewer sees the neighbours it is supposed to be distinguished from.
 * Without them, "does this actually distinguish itself from recall?" is a
 * question the reviewer has to answer from memory.
 */
export function buildReviewPrompt({ term, neighbours, category }) {
  const lines = [];

  lines.push(`Review this page. The term is "${term.term}" in the category "${category?.name ?? term.categoryId}".`);
  lines.push('');

  if (neighbours.length) {
    lines.push(
      'TERMS THIS PAGE CLAIMS TO BE DISTINCT FROM. The page has its own separate entries for these, so it must not blur into them, and it must not contradict them:',
    );
    for (const n of neighbours) lines.push(`  ${n.term}: ${n.oneSentence}`);
    lines.push('');
  }

  lines.push('Check the arithmetic in the worked example by computing it yourself. Show the arithmetic you did in the "problem" field if it does not come out.');
  lines.push('');
  lines.push('Check that the marked quiz answer is the only defensible one. Consider each option in turn.');
  lines.push('');
  lines.push('THE PAGE:');
  lines.push(
    JSON.stringify(
      {
        oneSentence: term.oneSentence,
        plainExplanation: term.plainExplanation,
        everydayAnalogy: term.everydayAnalogy,
        visual: {
          title: term.visual.title,
          learningObjective: term.visual.learningObjective,
          description: term.visual.description,
          steps: term.visual.steps,
          accessibilityDescription: term.visual.accessibilityDescription,
          reducedMotionDescription: term.visual.reducedMotionDescription,
        },
        workedExample: term.workedExample,
        unWorkplaceExample: term.unWorkplaceExample,
        whyItMatters: term.whyItMatters,
        commonMisconceptions: term.commonMisconceptions,
        simpleVsTechnical: term.simpleVsTechnical,
        keyTakeaway: term.keyTakeaway,
        quickCheck: term.quickCheck,
      },
      null,
      1,
    ),
  );
  lines.push('');
  lines.push(
    'Return: verdict, issues (each with field, severity, problem, and fix where you can supply one), and "corrected" containing ONLY the fields you are rewriting. Omit "corrected" entirely if you are changing nothing.',
  );

  return lines.join('\n');
}

const str = { type: 'string' };

/**
 * Only the fields the reviewer is allowed to rewrite.
 *
 * Strict structured output has no notion of an optional property: every key
 * must appear in `required`. "I am not changing this one" is therefore
 * expressed as null, and `stripNulls` removes them before anything is applied.
 * Getting this wrong is a 400, not a soft failure.
 */
function correctable() {
  const nullable = (t) => ({ anyOf: [t, { type: 'null' }] });
  const properties = {
    oneSentence: nullable(str),
    plainExplanation: nullable(str),
    whyItMatters: nullable(str),
    keyTakeaway: nullable(str),
    analogyLimitation: nullable(str),
    workedExampleResult: nullable(str),
    unWorkplaceExampleCaution: nullable(str),
    simpleVsTechnicalSimple: nullable(str),
    simpleVsTechnicalTechnical: nullable(str),
    quickCheckExplanation: nullable(str),
    /** Index of the option that is actually correct, if the page marked the wrong one. */
    quickCheckCorrectOptionIndex: nullable({ type: 'integer' }),
  };
  return {
    type: 'object',
    properties,
    required: Object.keys(properties),
    additionalProperties: false,
  };
}

export const REVIEW_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    verdict: { type: 'string', enum: ['pass', 'revise', 'reject'] },
    issues: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          field: str,
          severity: { type: 'string', enum: ['error', 'warning', 'nit'] },
          problem: str,
          fix: { anyOf: [str, { type: 'null' }] },
        },
        required: ['field', 'severity', 'problem', 'fix'],
        additionalProperties: false,
      },
    },
    corrected: { anyOf: [correctable(), { type: 'null' }] },
  },
  required: ['verdict', 'issues', 'corrected'],
  additionalProperties: false,
};
