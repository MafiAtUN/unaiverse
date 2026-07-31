/**
 * "YOU HAVE JUST BEEN HANDED THE AI FILE"
 * =======================================
 * Delegations rotate every two to four years and the handover note, when it
 * exists, is a folder of PDFs. Front offices reassign portfolios faster than
 * that. So the same person keeps arriving at this material cold, and the same
 * three questions keep getting asked: what exists, what does it oblige, and
 * which meetings do I actually have to be in.
 *
 * This is the answer to the first two. /agenda answers the third.
 *
 * The sequence is authored — it is a reading order, not a query result. Each
 * step names a milestone by id; titles, dates, symbols and the takes come from
 * the corpus at build time, so nothing here can drift from the timeline.
 */

export interface Step {
  /** Milestone id in content/milestones. */
  id: string;
  /** What this is, in the second person, for someone who has never seen it. */
  what: string;
  /** What it obliges, permits or makes citable. Procedural, never evaluative. */
  soThat: string;
}

export interface Chapter {
  key: string;
  title: string;
  intro: string;
  steps: Step[];
}

/**
 * Eight things exist. That is genuinely the whole architecture, and saying so
 * is the most useful sentence anyone can hear on day one — the file looks
 * enormous from outside and is quite finite from inside.
 */
export const CHAPTERS: Chapter[] = [
  {
    key: 'foundations',
    title: 'The two that came first',
    intro:
      'Both predate the current wave, and both are still the baseline anyone building or assessing AI inside the system is measured against. If you cite nothing else in your first month, cite these.',
    steps: [
      {
        id: '2021-unesco-recommendation-on-the-ethics-of-artificial-intel',
        what: 'The first global normative instrument on AI ethics, adopted by all UNESCO Member States.',
        soThat:
          'It is the reference point for national AI ethics frameworks, and it comes with an assessment methodology States can actually run. Adopted in Paris, so it sits with your UNESCO colleague rather than your New York desk.',
      },
      {
        id: '2022-principles-for-the-ethical-use-of-ai-in-the-united-nati',
        what: 'Ten principles the Chief Executives Board endorsed for the whole UN system.',
        soThat:
          'This is the de facto compliance baseline for anything built inside the system. If you are ever asked whether a UN entity may deploy a given tool, the answer starts here. Symbol: CEB/2022/2/Add.1.',
      },
    ],
  },
  {
    key: 'assembly',
    title: 'The General Assembly track',
    intro:
      'Four texts, in order. Together they take the file from a first thematic resolution to two standing mechanisms with terms of reference. Every one of them was adopted without a vote, which is a fact worth knowing before you draft anything.',
    steps: [
      {
        id: '2024-first-general-assembly-resolution-devoted-broadly-to-ai',
        what: 'The first General Assembly resolution devoted broadly to AI.',
        soThat:
          'The first time the whole membership agreed a text on AI. Useful whenever you need to show the Assembly was engaged early. Symbol: A/RES/78/265.',
      },
      {
        id: '2024-general-assembly-resolution-on-ai-capacity-building',
        what: 'A second resolution, focused on international cooperation and capacity-building.',
        soThat:
          'This is the text capacity-building and AI-divide language traces back to. If your capital cares about access, financing, skills or infrastructure, this is your hook. Symbol: A/RES/78/311.',
      },
      {
        id: '2024-pact-for-the-future-and-global-digital-compact-adopted',
        what: 'The Pact for the Future, carrying the Global Digital Compact as an annex.',
        soThat:
          'The first universal AI-governance commitments, adopted by consensus by all 193. It is the safest citable line available and it carries a review date. Symbol: A/RES/79/1, Annex I.',
      },
      {
        id: '2025-general-assembly-establishes-the-scientific-panel-and-g',
        what: 'The resolution that created the Scientific Panel and the Global Dialogue.',
        soThat:
          'Both flagship mechanisms report through Assembly processes, with detailed terms of reference: a 40-member independent panel and a recurring dialogue. This is the single most load-bearing document on the file. Symbol: A/RES/79/325.',
      },
    ],
  },
  {
    key: 'mechanisms',
    title: 'The two standing mechanisms, now running',
    intro:
      'These are the things that will keep generating meetings, documents and coverage decisions for the rest of your posting. They are the reason this file never goes quiet again.',
    steps: [
      {
        id: '2026-scientific-panel-annual-reporting-cycle',
        what: 'A 40-member independent panel producing an annual evidence-based assessment.',
        soThat:
          'Its reports are free, citable technical backing for national statements, and its mandate excludes the military domain. Knowing that boundary saves you an awkward intervention.',
      },
      {
        id: '2026-inaugural-global-dialogue-on-ai-governance-geneva',
        what: 'The recurring intergovernmental dialogue, which met for the first time in Geneva.',
        soThat:
          'This is the meeting to staff if you can only staff one. It alternates between Geneva and New York, so coverage may not fall to the same colleague twice.',
      },
    ],
  },
  {
    key: 'adjacent',
    title: 'The tracks that run alongside',
    intro:
      'These do not sit under the AI resolutions, and they are covered by different people in most delegations. Know they exist so you can hand them to the right colleague rather than answering for them yourself.',
    steps: [
      {
        id: '2023-general-assembly-resolution-on-lethal-autonomous-weapon',
        what: 'The autonomous-weapons track, which opened a universal General Assembly channel alongside the long-running CCW process in Geneva.',
        soThat:
          'This is disarmament, not digital policy: First Committee in New York, CCW in Geneva. Both were adopted by recorded vote, unlike the rest of the AI file. Symbol: A/RES/78/241.',
      },
      {
        id: '2024-general-assembly-resolution-on-ai-in-the-military-domai',
        what: 'A broader military-AI resolution, wider than autonomous weapons alone.',
        soThat:
          'It produced a Secretary-General report cataloguing risks and emerging normative proposals, which is the current baseline document for this thread. Symbol: A/RES/79/239.',
      },
      {
        id: '2023-first-security-council-briefing-devoted-to-ai',
        what: 'The Security Council took AI up for the first time in July 2023.',
        soThat:
          'The Council has held further meetings since, but has adopted no product on AI. If someone tells you the Council has decided something on AI, ask which document.',
      },
      {
        id: '2021-privacy-in-the-digital-age-and-ai-due-diligence',
        what: 'The human-rights thread, running through the Third Committee and the Human Rights Council.',
        soThat:
          'Split across New York and Geneva. This is where surveillance, privacy and due-diligence language lives, and it moves on its own calendar.',
      },
    ],
  },
];

/** The whole reading list, flat, in order. */
export function stepIds(): string[] {
  return CHAPTERS.flatMap((c) => c.steps.map((s) => s.id));
}

/**
 * Lines that are safe in any statement because they are plain statements of
 * procedural fact, each carrying its own symbol. The most-requested thing on
 * the site, and the easiest thing to get subtly wrong from memory.
 */
export const SAFE_LINES: { line: string; symbol: string }[] = [
  {
    line: 'The Global Digital Compact contains the first truly universal commitments on AI governance, adopted by consensus.',
    symbol: 'A/RES/79/1, Annex I',
  },
  {
    line: 'The General Assembly established the Independent International Scientific Panel on AI and the Global Dialogue on AI Governance, without a vote.',
    symbol: 'A/RES/79/325',
  },
  {
    line: 'The Assembly adopted its first resolution devoted broadly to artificial intelligence in March 2024, by consensus.',
    symbol: 'A/RES/78/265',
  },
  {
    line: 'The UNESCO Recommendation on the Ethics of Artificial Intelligence was the first global normative instrument on the subject.',
    symbol: '41 C/Resolution 15',
  },
  {
    line: 'A high-level review of the Global Digital Compact is mandated for the Assembly’s eighty-second session.',
    symbol: 'A/RES/79/1',
  },
];
