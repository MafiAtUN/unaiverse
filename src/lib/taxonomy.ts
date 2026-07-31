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

/**
 * Where a thing happens, in duty-station terms.
 *
 * This is the axis a delegation actually organises by: a mission in New York
 * and a mission in Geneva are usually different people, and the first question
 * about any process is whose desk it lands on. `system-wide` is for tracks with
 * no single seat; `elsewhere` covers the one-off host cities (The Hague,
 * Madrid, Valencia) that do not earn a permanent entry.
 */
export const VENUES = [
  { id: 'new-york', label: 'New York', short: 'NY' },
  { id: 'geneva', label: 'Geneva', short: 'GVA' },
  { id: 'paris', label: 'Paris', short: 'PAR' },
  { id: 'rome', label: 'Rome', short: 'ROM' },
  { id: 'vienna', label: 'Vienna', short: 'VIE' },
  { id: 'nairobi', label: 'Nairobi', short: 'NBO' },
  { id: 'elsewhere', label: 'Elsewhere', short: 'OTH' },
  { id: 'system-wide', label: 'System-wide', short: 'SYS' },
] as const;

export type VenueId = (typeof VENUES)[number]['id'];
export const VENUE_BY_ID = new Map(VENUES.map((v) => [v.id as string, v]));

/**
 * Which body owns the thing. Deliberately mixes intergovernmental organs with
 * the entities that run their own tracks, because that is how the file is
 * actually divided up in practice — a delegate covering First Committee and a
 * delegate covering the Human Rights Council are answering different phones,
 * and neither of them covers WHO.
 */
export const ORGANS = [
  { id: 'ga-plenary', label: 'GA plenary', glyph: '🏛️' },
  { id: 'ga-first-committee', label: 'GA First Committee', glyph: '🎯' },
  { id: 'ga-second-committee', label: 'GA Second Committee', glyph: '📈' },
  { id: 'ga-third-committee', label: 'GA Third Committee', glyph: '⚖️' },
  { id: 'security-council', label: 'Security Council', glyph: '🕊️' },
  { id: 'human-rights-council', label: 'Human Rights Council', glyph: '🧭' },
  { id: 'ohchr', label: 'OHCHR', glyph: '📕' },
  { id: 'ccw', label: 'CCW', glyph: '🛡️' },
  { id: 'unesco', label: 'UNESCO', glyph: '🏺' },
  { id: 'itu', label: 'ITU', glyph: '📡' },
  { id: 'who', label: 'WHO', glyph: '🩺' },
  { id: 'ilo', label: 'ILO', glyph: '🔧' },
  { id: 'advisory-body', label: 'Panel & advisory bodies', glyph: '🔬' },
  { id: 'ceb', label: 'CEB', glyph: '🧩' },
  { id: 'secretariat', label: 'Secretariat', glyph: '🏢' },
  { id: 'agency', label: 'Funds, programmes & agencies', glyph: '🛰️' },
] as const;

export type OrganId = (typeof ORGANS)[number]['id'];
export const ORGAN_BY_ID = new Map(ORGANS.map((o) => [o.id as string, o]));

/**
 * Mandate status. Purely factual: whether the thing that was mandated has
 * happened yet. Nothing here judges anyone for the answer.
 */
export const MANDATE_STATUS = {
  done: { label: 'Delivered', glyph: '✓' },
  pending: { label: 'In progress', glyph: '◐' },
  upcoming: { label: 'Not yet due', glyph: '○' },
} as const;

export type MandateStatus = keyof typeof MANDATE_STATUS;

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
