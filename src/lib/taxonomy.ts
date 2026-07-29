/**
 * The site's vocabulary, in one place.
 * Zones come from plan §3, tiers and personas from CONTENT_SPEC §1 and §3.
 */

export const SITE = {
  name: 'UNAIVERSE',
  tagline: "One data nerd's lovingly sarcastic map of the UN's AI universe.",
  bot: 'A/BOT',
} as const;

export type ZoneId = 0 | 1 | 2 | 3;

export const ZONES: Record<
  ZoneId,
  { id: ZoneId; title: string; range: string; blurb: string }
> = {
  0: {
    id: 0,
    title: 'Ancient History',
    range: '1945 – Nov 2022',
    blurb:
      'For its first ~77 years, the UN was busy with minor side quests: peace, human rights, development. AI got the occasional polite mention.',
  },
  1: {
    id: 1,
    title: 'The Big Bang',
    range: '30 November 2022',
    blurb:
      'A chatbot dropped, and suddenly every conference room in Turtle Bay had opinions about neural networks.',
  },
  2: {
    id: 2,
    title: 'The Main Galaxy',
    // The plan bills this zone as 2023-onward, and its centre of gravity is.
    // But it also holds the long-running tracks that were already turning
    // before anyone had heard of a large language model, so the label says so.
    range: '2023 – today, plus the tracks already running',
    blurb:
      'Resolutions, panels, summits, and the slow assembly of an actual governance architecture.',
  },
  3: {
    id: 3,
    title: 'The Horizon',
    range: "What's next",
    blurb: 'Mandated, scheduled, and not yet written.',
  },
};

export const ZONE_ORDER: ZoneId[] = [0, 1, 2, 3];

export const CONSTELLATIONS: Record<string, { label: string; glyph: string }> = {
  governance: { label: 'Governance', glyph: '🏛️' },
  summits: { label: 'Summits & Moments', glyph: '🎪' },
  'inside-the-machine': { label: 'Inside the Machine', glyph: '⚙️' },
  'peace-security': { label: 'Peace & Security', glyph: '🕊️' },
  'development-rights': { label: 'Development & Rights', glyph: '🌍' },
  'adjacent-tracks': { label: 'Adjacent Tracks', glyph: '🛰️' },
  anchor: { label: 'Anchor', glyph: '💥' },
  horizon: { label: 'Horizon', glyph: '🔭' },
};

export const TIERS: Record<1 | 2 | 3, { name: string; glyph: string }> = {
  1: { name: 'Supernova', glyph: '🌟' },
  2: { name: 'Star', glyph: '⭐' },
  3: { name: 'Stardust', glyph: '✨' },
};

/** The eight personas, in CONTENT_SPEC §3 order. */
export const PERSONAS = [
  { id: 'peace-security', glyph: '🕊️', label: 'Peace & Security', who: 'DPPA, DPO, ODA, missions' },
  { id: 'development', glyph: '🌍', label: 'Development & Policy', who: 'DESA, UNDP, RCOs, SDG/agency policy' },
  { id: 'human-rights', glyph: '⚖️', label: 'Human Rights', who: 'OHCHR, HRC-facing, protection officers' },
  { id: 'data-digital', glyph: '💻', label: 'Data & Digital', who: 'OICT, data cells, UN 2.0, statisticians' },
  { id: 'front-office', glyph: '🎩', label: 'Front Office', who: 'Chiefs of staff, speechwriters, briefing-note writers' },
  { id: 'opga', glyph: '🏛️', label: 'OPGA', who: "The President of the General Assembly's team" },
  { id: 'builders', glyph: '🛠️', label: 'Builders', who: 'AI practitioners in and around the UN system' },
  { id: 'missions', glyph: '🗺️', label: 'Permanent Missions', who: 'Delegations in NY & Geneva, capital desk officers' },
] as const;

export type PersonaId = (typeof PERSONAS)[number]['id'];

export const PERSONA_BY_ID = new Map(PERSONAS.map((p) => [p.id as string, p]));

/** Badge styling hooks. `UNVERIFIED` stays defined — Phase 1 cleared it, but the vocabulary survives. */
export const BADGE_KIND: Record<string, 'fact' | 'process' | 'caution'> = {
  'FIRST-EVER': 'fact',
  CONSENSUS: 'fact',
  VOTED: 'fact',
  'UNIVERSAL COMMITMENT': 'fact',
  ADVISORY: 'process',
  INTERNAL: 'process',
  'ONGOING TRACK': 'process',
  AGENCY: 'process',
  UPCOMING: 'process',
  UNVERIFIED: 'caution',
};
