import { useCallback, useEffect, useMemo, useState } from 'react';
import type { TimelineEvent, Tier } from '../../lib/timeline-data';

export type Mode = 'story' | 'explore';

export interface StoryState {
  mode: Mode;
  /** The event whose drawer is open. Null when nothing is open. */
  openId: string | null;
  query: string;
  constellations: string[];
  tiers: Tier[];
}

const EMPTY: StoryState = {
  mode: 'explore',
  openId: null,
  query: '',
  constellations: [],
  tiers: [],
};

/**
 * Every piece of view state lives in the URL.
 *
 * Not for tidiness — it is what makes a milestone linkable. `?event=2022-…`
 * opens that drawer on a cold load, and a reader who has filtered down to four
 * Supernovas can send exactly that view to someone else.
 *
 * Filters and search use replaceState so scrubbing a search box does not bury
 * the back button under one entry per keystroke. Opening an event uses
 * pushState, so Back closes the drawer — which is what a phone's back gesture
 * is expected to do.
 */
function parse(search: string): StoryState {
  const p = new URLSearchParams(search);
  const mode = p.get('mode');
  const tiers = (p.get('tier') ?? '')
    .split(',')
    .map((t) => Number(t))
    .filter((t): t is Tier => t === 1 || t === 2 || t === 3);

  return {
    mode: mode === 'story' ? 'story' : 'explore',
    openId: p.get('event'),
    query: p.get('q') ?? '',
    constellations: (p.get('c') ?? '').split(',').filter(Boolean),
    tiers,
  };
}

function serialise(s: StoryState): string {
  const p = new URLSearchParams();
  if (s.mode !== 'explore') p.set('mode', s.mode);
  if (s.openId) p.set('event', s.openId);
  if (s.query.trim()) p.set('q', s.query.trim());
  if (s.constellations.length) p.set('c', s.constellations.join(','));
  if (s.tiers.length) p.set('tier', [...s.tiers].sort().join(','));
  const q = p.toString();
  return q ? `?${q}` : window.location.pathname;
}

export function useStoryState() {
  // Parsed lazily rather than in an effect: on a deep link the first paint
  // should already have the right drawer open, not open it a frame later.
  const [state, setState] = useState<StoryState>(() =>
    typeof window === 'undefined' ? EMPTY : parse(window.location.search),
  );

  // The back/forward buttons are the authority; adopt whatever they produce.
  useEffect(() => {
    const onPop = () => setState(parse(window.location.search));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const update = useCallback((patch: Partial<StoryState>, history: 'push' | 'replace') => {
    setState((prev) => {
      const next = { ...prev, ...patch };
      const url = serialise(next);
      if (url !== window.location.search && url !== window.location.href) {
        if (history === 'push') window.history.pushState(null, '', url);
        else window.history.replaceState(null, '', url);
      }
      return next;
    });
  }, []);

  const open = useCallback((id: string | null) => update({ openId: id }, 'push'), [update]);

  /**
   * Story mode's equivalent of `open`, and deliberately a replace.
   * The section you are looking at is the address of the page, so it belongs in
   * the URL — but scrolling past seventy-six of them must not push seventy-six
   * history entries and make Back a way to crawl backwards through the article.
   */
  const setActive = useCallback((id: string) => update({ openId: id }, 'replace'), [update]);
  const setQuery = useCallback((query: string) => update({ query }, 'replace'), [update]);
  const setMode = useCallback((mode: Mode) => update({ mode }, 'replace'), [update]);

  const toggleConstellation = useCallback(
    (id: string) =>
      update(
        {
          constellations: state.constellations.includes(id)
            ? state.constellations.filter((c) => c !== id)
            : [...state.constellations, id],
        },
        'replace',
      ),
    [state.constellations, update],
  );

  const toggleTier = useCallback(
    (t: Tier) =>
      update(
        { tiers: state.tiers.includes(t) ? state.tiers.filter((x) => x !== t) : [...state.tiers, t] },
        'replace',
      ),
    [state.tiers, update],
  );

  const clearFilters = useCallback(
    () => update({ query: '', constellations: [], tiers: [] }, 'replace'),
    [update],
  );

  return {
    state,
    open,
    setActive,
    setQuery,
    setMode,
    toggleConstellation,
    toggleTier,
    clearFilters,
  };
}

/**
 * Which events survive the current filters.
 *
 * Returns a Set rather than a filtered array on purpose. Explore mode keeps
 * every stem mounted and dims the ones that fail — the shape of the decade
 * should not change just because someone typed a word, or the density that
 * makes the picture worth looking at would be a lie.
 */
export function useMatches(events: TimelineEvent[], state: StoryState): Set<string> {
  return useMemo(() => {
    const q = state.query.trim().toLowerCase();
    const terms = q ? q.split(/\s+/) : [];
    const cs = new Set(state.constellations);
    const ts = new Set<number>(state.tiers);

    const out = new Set<string>();
    for (const e of events) {
      if (cs.size && !cs.has(e.constellation)) continue;
      if (ts.size && !ts.has(e.tier)) continue;
      if (terms.length && !terms.every((t) => e.haystack.includes(t))) continue;
      out.add(e.id);
    }
    return out;
  }, [events, state.query, state.constellations, state.tiers]);
}
