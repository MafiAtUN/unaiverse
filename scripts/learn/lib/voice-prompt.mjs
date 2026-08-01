/**
 * The UN-voice pass.
 *
 * The corpus reads as though it were written *about* the United Nations by
 * someone who has read about it. "A UN team explores a model." "A UN office
 * wants a system." Nobody who works there talks like that, and a colleague can
 * tell in one sentence.
 *
 * What this pass changes and, more importantly, what it does not:
 *
 *   everydayAnalogy   UNTOUCHED-ish. Its job is to reach someone with no
 *                     background at all, and this site is for the public as
 *                     well as for UN staff. It may only be re-set into a
 *                     situation that is *also* familiar in an office, never
 *                     one that needs institutional knowledge to follow.
 *   workedExample     Concrete and recognisable. Still no acronym a newcomer
 *                     cannot survive.
 *   unWorkplaceExample  This is where the register belongs. Real functions,
 *                     real workflows, real deadlines, real cautions.
 *   whereYouMayHearIt Real rooms, not "vendor product demos".
 *   keyTakeaway       May gain a UN framing where it is natural.
 *
 * oneSentence and plainExplanation are never touched. They are the part a
 * sixteen-year-old reads, and they have already been through two passes.
 */
export const VOICE_PROMPT_VERSION = '1.0.0';

export const VOICE_SYSTEM_PROMPT = `You are a United Nations staff member with fifteen years in the system and an unusual talent for explaining technical things. You have worked in a country office and at Headquarters. You have written the 6pm briefing note. You have sat through the vendor demo. You are now editing an AI glossary written by someone who clearly researched the Organization rather than worked in it.

Your job is to make a UN colleague read an example and think "yes, that is my Tuesday" instead of "someone has described my employer".

WHAT IS WRONG WITH THE CURRENT TEXT

It says "a UN team", "a UN office", "a humanitarian coordination team". Those are placeholders standing where a person should be. Real work happens to a named function, on a named artefact, against a real deadline, in a specific kind of office. Give it all four and it stops being a description of an organisation and becomes somebody's afternoon.

Every scenario in this glossary must be DIFFERENT from every other one. You are editing one term out of three hundred, and a reader who browses five pages must not meet the same officer with the same inbox five times. A rotating role, setting and moment is supplied below for exactly this reason. Never reuse a phrase from these instructions as if it were your own example.

VOCABULARY A COLLEAGUE ACTUALLY USES

Artefacts: briefing note, note for the file, talking points, non-paper, concept note, terms of reference, situation report, code cable, aide-memoire, background note, statement for delivery, side-event concept note, needs assessment, monitoring report, progress report, results framework, workplan.
Process: clearance, cleared by, silence procedure, the file, capitals, close of business, the margins of the session, side event, informals, first reading, bracketed text, adopted by consensus, tabled, circulated, uploaded to the portal.
People and places: desk officer, reporting officer, programme officer, protection officer, information management officer, focal point, duty officer, Resident Coordinator's Office, country office, regional bureau, Headquarters, the field, duty station, permanent mission, delegation, implementing partner, national counterpart, chief of section, front office.
Bodies you may name: General Assembly and its Main Committees, Security Council, ECOSOC, Human Rights Council, the Secretariat, OCHA, OHCHR, UNDP, UNICEF, WFP, UNHCR, WHO, ITU, UNESCO, ILO, a UN Country Team, an inter-agency working group, an ICT governance board, a procurement unit, an evaluation office, an internal audit function.

REGISTER

Dry, precise, faintly wry. The reader is a colleague, not a student. Do not explain UN things to them: never define "Member State", never gloss "resolution", never say "the United Nations, an international organisation". They know. Assume the shared context and spend the words on the AI concept instead.

Do not be reverent about the Organization and do not be snide about it. The humour, where there is any, is aimed at process and pacing, never at people, never at any Member State, and never at any country situation.

HARD RULES, IN ORDER OF HOW BADLY BREAKING THEM WOULD DAMAGE THIS SITE

1. NEVER invent a document symbol, resolution number, report number, policy name, mandate, statistic, budget figure, date or named official. If you want to cite something, use ONLY the approved references supplied to you. If none fits, refer generically: "a General Assembly resolution", "the office's data protection guidance", "the standing instruction on external tools". Generic and true beats specific and invented.
2. NEVER invent a country situation, crisis, operation or mission. Do not name a Member State as the setting of a problem. Where a place is needed, use a neutral construction: "a country office", "a regional hub", "a field presence". You may name a city only as a neutral duty station (Geneva, Nairobi, Vienna, Bangkok, Amman, New York).
3. Protection, privacy and confidentiality cautions must get STRONGER, never weaker. If the example touches personal, survivor, witness, security-sensitive, medical, HR or procurement-sensitive material, the caution must say plainly what must not be done and why. Never suggest putting such material into a tool that has not been approved for it.
4. Keep it accurate about the AI. You are changing the setting and the register, not the technical content. If the current text explains the mechanism correctly, the new text must explain the same mechanism just as correctly.
5. No em dash, ever. This site ships none. Use a comma, colon, full stop or brackets.
6. International English spelling.
7. Respect the length ceilings given. Text past them is rejected outright.

DO NOT OVERSHOOT

An acronym a newcomer cannot survive is a worse page, not a more authentic one. Use at most two abbreviations in any single field, and only ones a colleague from any duty station would know. This site is read by the public and by high-school learners as well as by staff. The UN workplace example is where the register lives; everything else stays legible to an outsider.

Return only JSON conforming to the supplied schema. Return a field only if you are genuinely improving it. Omit anything you would leave as it is.`;

/**
 * A roster rather than a formula. Three hundred terms sharing two scenarios
 * would be the same template failure in better clothes, so each term gets its
 * own starting point, chosen deterministically from its id so that re-running
 * is stable.
 */
const ROLES = [
  'a reporting officer', 'a desk officer', 'a programme officer', 'a protection officer',
  'an information management officer', 'a duty officer', 'a procurement officer',
  'an evaluation officer', 'a human resources officer', 'a communications officer',
  'a statistician in a data unit', 'a reviser in a translation service', 'a records officer',
  'a budget officer', 'a legal officer', 'an internal auditor', 'a political affairs officer',
  'a humanitarian affairs officer', 'a monitoring and evaluation officer', 'a national officer',
  'an associate expert in their first year', 'a chief of section', 'a training officer',
  'a knowledge management officer', 'an ICT officer', 'a security analyst',
  'a gender adviser', 'a partnerships officer', 'an ombudsman case officer',
];

const SETTINGS = [
  'a country office', 'a regional bureau', 'a Headquarters department',
  "a Resident Coordinator's Office", 'a specialised agency technical division',
  'a small field presence with poor connectivity', 'a liaison office',
  'an evaluation office', 'a shared services centre', 'a procurement unit',
  'a documentation and library service', 'an inter-agency secretariat',
  'a UN Country Team working group', 'a duty station with three working languages',
];

const MOMENTS = [
  'the briefing note due at 6pm', 'the note for the file after a bilateral',
  'the situation report before the regional bulletin closes',
  'the concept note for a side event in the margins of the session',
  'terms of reference that have to clear before Friday',
  'a progress report from an implementing partner',
  'a statement that still needs clearance', 'talking points for informals',
  'the annual workplan review', 'a response to an audit observation',
  'coding open-ended answers from a needs assessment',
  'screening a long list of applications against a rostered profile',
  'a backlog in the translation queue', 'a records retention review',
  'a technical evaluation of three bids', 'a lessons-learned exercise after a pilot',
  'a town hall question nobody prepared for', 'a handover note for an incoming colleague',
  'the quarterly report to a donor', 'preparing a delegation briefing before capitals reply',
];

function seedOf(id) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function buildVoicePrompt({ term, approvedSymbols, category }) {
  const lines = [];

  lines.push(`Edit the examples for the term "${term.term}" (category: ${category?.name ?? term.categoryId}, difficulty: ${term.difficulty}).`);
  lines.push('');
  lines.push(`What the term means, so your examples stay technically correct: ${term.oneSentence}`);
  lines.push(`The mechanism, in the page's own words: ${term.simpleVsTechnical.technical.slice(0, 500)}`);
  lines.push('');

  lines.push('APPROVED REFERENCES. These are real and sourced. You may cite these and nothing else:');
  for (const [symbol, what] of approvedSymbols.slice(0, 14)) {
    lines.push(`  ${symbol}${what ? ` — ${what}` : ''}`.replace(' — ', ': '));
  }
  lines.push('  If none of these fits, refer generically instead. Do not invent one.');
  lines.push('');

  // Rotate on three different shifts of the seed so the three axes vary
  // independently rather than moving in lockstep across the corpus.
  const seed = seedOf(term.id);
  lines.push('A STARTING POINT, rotated so that no two terms in this glossary share a scenario:');
  lines.push(`  Role: ${ROLES[seed % ROLES.length]}`);
  lines.push(`  Setting: ${SETTINGS[(seed >> 3) % SETTINGS.length]}`);
  lines.push(`  The moment: ${MOMENTS[(seed >> 7) % MOMENTS.length]}`);
  lines.push('  Use these if they suit the term. If they genuinely do not, choose a different role, setting and moment of your own, but do not fall back on an unnamed "UN team" and do not reuse anything from the instructions above.');
  lines.push('');

  lines.push('CURRENT TEXT TO EDIT:');
  lines.push(
    JSON.stringify(
      {
        workedExample: term.workedExample,
        unWorkplaceExample: term.unWorkplaceExample,
        whereYouMayHearIt: term.whereYouMayHearIt,
        keyTakeaway: term.keyTakeaway,
        everydayAnalogy: { title: term.everydayAnalogy.title, story: term.everydayAnalogy.story },
      },
      null,
      1,
    ),
  );
  lines.push('');

  lines.push('LENGTH CEILINGS, enforced by a validator: unWorkplaceExample.scenario 800 characters, .relevance 600, .caution 600; workedExample.scenario 600, each process step 400, .result 600; keyTakeaway 300; each whereYouMayHearIt entry 200 (2 to 5 entries); everydayAnalogy.story 1200.');
  lines.push('');
  lines.push('For whereYouMayHearIt: name rooms and moments, not industries. "A vendor demo in a procurement meeting" beats "vendor product demos". "An inter-agency working group on data" beats "data science courses".');
  lines.push('');
  lines.push('For everydayAnalogy: only return a replacement if the current one needs institutional knowledge to follow, or is a tired frame (stadium, farm, library, exam). Otherwise omit it. A good analogy here works for a delegate and for a fifteen-year-old equally.');
  lines.push('');
  lines.push('Return only the fields you are actually improving.');

  return lines.join('\n');
}

const str = { type: 'string' };
const nullable = (t) => ({ anyOf: [t, { type: 'null' }] });

function obj(properties) {
  return {
    type: 'object',
    properties,
    required: Object.keys(properties),
    additionalProperties: false,
  };
}

export const VOICE_RESPONSE_SCHEMA = obj({
  unWorkplaceExample: nullable(
    obj({ scenario: str, relevance: str, caution: nullable(str) }),
  ),
  workedExample: nullable(
    obj({
      scenario: str,
      input: nullable(str),
      process: { type: 'array', items: str },
      result: str,
    }),
  ),
  whereYouMayHearIt: nullable({ type: 'array', items: str }),
  keyTakeaway: nullable(str),
  everydayAnalogy: nullable(obj({ title: str, story: str })),
  /** One line on what was wrong with the original, for the audit trail. */
  note: str,
});
