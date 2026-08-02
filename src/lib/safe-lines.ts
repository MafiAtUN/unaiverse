/**
 * THE SAFE LINES LIBRARY (brief §6, journey J4)
 * =============================================
 * "The speech-ready lines already written inside takes, surfaced as a
 * copyable, filterable collection." No new writing — the brief is explicit
 * that this is a surfacing problem, not an authoring one.
 *
 * Every take has three beats: what it means (So what), what to watch
 * (Watch for), and a line you can actually say (Use it). The third beat is a
 * safe line and always has been; it was just buried one persona-tab deep
 * inside one milestone, which is a useless place for it. A speechwriter with
 * a 4 p.m. deadline needs all of them in one filterable list.
 *
 * ── What makes a line "safe" ─────────────────────────────────────────────
 * Every line here is a statement of procedural fact tied to a document symbol,
 * which is precisely why it is safe to put in someone's mouth: it says what
 * happened and where it is written down. Nothing characterises a Member
 * State's position, and nothing evaluates whether any of it was a good idea —
 * that constraint is inherited from the corpus, not applied here, but this
 * page is the one place where it would be most damaging to lose, because
 * these are the sentences that end up in statements.
 */
import { getTake } from './takes';
import { SAFE_LINES as CURATED } from './onboarding';
import { CONSTELLATIONS, PERSONA_BY_ID } from './taxonomy';
import { sortKey } from './milestone';

export interface SafeLine {
  /** Stable id, so a line can be deep-linked and copied by anchor. */
  id: string;
  /** The sentence itself. */
  line: string;
  /** Persona id, or null for the hand-curated universal lines. */
  persona: string | null;
  personaLabel: string;
  /** Milestone this came out of, when it came from a take. */
  milestoneId: string | null;
  milestoneTitle: string;
  dateDisplay: string;
  symbol: string | null;
  /** Constellation id — the "topic" axis the brief asks to filter on. */
  topic: string;
  topicLabel: string;
  /** Sorts newest-first alongside everything else on the site. */
  sort: number;
}

export interface SafeLineSource {
  id: string;
  data: {
    title: string;
    date_display: string;
    year: number | null;
    symbol: string | null;
    constellation: string;
    personas: string[];
  };
}

/**
 * The five hand-written lines from Start Here.
 *
 * They are not tied to a persona because they are safe for anyone, and they
 * lead the list for the same reason. Their milestone is named only by symbol,
 * which is all a speechwriter needs to check one.
 */
const CURATED_TOPIC = 'governance';

export function buildSafeLines(entries: SafeLineSource[]): SafeLine[] {
  const lines: SafeLine[] = [];

  for (const [i, curated] of CURATED.entries()) {
    lines.push({
      id: `curated-${i + 1}`,
      line: curated.line,
      persona: null,
      personaLabel: 'Safe for anyone',
      milestoneId: null,
      milestoneTitle: curated.symbol,
      dateDisplay: '',
      symbol: curated.symbol,
      topic: CURATED_TOPIC,
      topicLabel: CONSTELLATIONS[CURATED_TOPIC]?.label ?? 'Governance',
      // Ahead of everything, because these are the ones vetted by hand.
      sort: Number.MAX_SAFE_INTEGER,
    });
  }

  for (const m of entries) {
    for (const personaId of m.data.personas) {
      const take = getTake(m.id, personaId);
      if (!take?.useIt) continue;

      lines.push({
        id: `${m.id}--${personaId}`,
        line: take.useIt,
        persona: personaId,
        personaLabel: PERSONA_BY_ID.get(personaId)?.label ?? personaId,
        milestoneId: m.id,
        milestoneTitle: m.data.title,
        dateDisplay: m.data.date_display,
        symbol: m.data.symbol,
        topic: m.data.constellation,
        topicLabel: CONSTELLATIONS[m.data.constellation]?.label ?? m.data.constellation,
        sort: sortKey(m.data.date_display, m.data.year, m.id),
      });
    }
  }

  return lines.sort((a, b) => b.sort - a.sort || a.personaLabel.localeCompare(b.personaLabel));
}

/** Facet counts, so a filter can say how much is behind it before it is used. */
export function safeLineFacets(lines: SafeLine[]) {
  const byPersona = new Map<string, number>();
  const byTopic = new Map<string, number>();
  for (const l of lines) {
    if (l.persona) byPersona.set(l.persona, (byPersona.get(l.persona) ?? 0) + 1);
    byTopic.set(l.topic, (byTopic.get(l.topic) ?? 0) + 1);
  }
  return { byPersona, byTopic };
}
