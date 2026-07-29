import { useCallback, useEffect, useMemo, useRef } from 'react';
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { TimelineDataset } from '../../lib/timeline-data';
import { ExploreCanvas } from './ExploreCanvas';
import { EventDrawer } from './EventDrawer';
import { MobileTimeline } from './MobileTimeline';
import { StoryMode } from './StoryMode';
import { Toolbar } from './Toolbar';
import { useMediaQuery, useMounted, useReducedMotion } from './useReducedMotion';
import { useMatches, useStoryState } from './useStoryState';

gsap.registerPlugin(ScrollTrigger);

/**
 * Root of the /story island. Owns the URL-backed state and picks a view;
 * everything below it is presentational and takes plain props.
 */
export interface StoryProps {
  data: TimelineDataset;
  /** The site base ("/unaiverse"), passed in so no component guesses at it. */
  base: string;
}

export default function Story({ data, base }: StoryProps) {
  const { state, open, setActive, setQuery, setMode, toggleConstellation, toggleTier, clearFilters } =
    useStoryState();

  const reduced = useReducedMotion();
  const mounted = useMounted();
  const narrow = useMediaQuery('(max-width: 767px)');

  const matches = useMatches(data.events, state);
  const filtered =
    state.query.trim() !== '' || state.constellations.length > 0 || state.tiers.length > 0;

  const storyEvents = useMemo(
    () => (filtered ? data.events.filter((e) => matches.has(e.id)) : data.events),
    [data.events, matches, filtered],
  );

  const openEvent = useMemo(
    () => data.events.find((e) => e.id === state.openId) ?? null,
    [data.events, state.openId],
  );

  /** The deep-link target, captured once — later scrolling must not re-trigger it. */
  const initialId = useRef<string | null>(state.openId);

  const isStory = state.mode === 'story';

  /*  Lenis smooths the one surface that scrolls vertically: story mode.
      Explore mode's canvas scrolls horizontally through native overflow and is
      left entirely alone.

      Under prefers-reduced-motion it is never constructed. Building it and
      setting the duration to zero would still mean intercepting every wheel
      event to hand back the same position — a worse way to do nothing than not
      doing it.

      ScrollTrigger has to be told when Lenis moves the page, and Lenis has to
      be driven off GSAP's ticker rather than its own rAF, or the two run on
      separate clocks and pinned elements jitter by a frame. */
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    if (reduced || !isStory) return;

    const lenis = new Lenis({ lerp: 0.11, wheelMultiplier: 1, touchMultiplier: 1.5 });
    lenisRef.current = lenis;
    lenis.on('scroll', ScrollTrigger.update);

    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, [reduced, isStory]);

  /*  All programmatic scrolling goes through Lenis when Lenis exists.
      `scrollIntoView` sets scrollTop directly, which Lenis overwrites on its
      next frame with the position it still believes it is animating towards —
      so a deep link scrolled to the right section and was then dragged back to
      the top before anyone saw it. When Lenis is absent (reduced motion), the
      native call is the correct one. */
  const scrollToEl = useCallback((el: HTMLElement, immediate = false) => {
    const offset = -(toolbar.current?.offsetHeight ?? 0);
    const lenis = lenisRef.current;
    if (lenis) lenis.scrollTo(el, { immediate, offset });
    else el.scrollIntoView({ behavior: immediate ? 'auto' : 'smooth', block: 'start' });
  }, []);

  // Sections are measured on mount; a filter change replaces them wholesale.
  useEffect(() => {
    if (isStory) ScrollTrigger.refresh();
  }, [isStory, storyEvents]);

  // The body must not scroll behind an open drawer.
  useEffect(() => {
    if (!openEvent || isStory) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [openEvent, isStory]);

  const onActive = useCallback((id: string) => setActive(id), [setActive]);

  /*  The toolbar is sticky, so everything else that sticks has to know how tall
      it is — otherwise the year in the rail sits underneath it and is never
      seen. Its height is not a constant: the filter chips wrap to two rows on a
      laptop and five on a phone. So it is measured and published as a custom
      property that the rail and the sections both read. */
  const shell = useRef<HTMLDivElement>(null);
  const toolbar = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const bar = toolbar.current;
    const root = shell.current;
    if (!bar || !root) return;
    const ro = new ResizeObserver(([entry]) => {
      root.style.setProperty('--toolbar-h', `${Math.round(entry!.contentRect.height)}px`);
      ScrollTrigger.refresh();
    });
    ro.observe(bar);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={shell}
      style={{ ['--toolbar-h' as string]: '8.5rem' }}
      className={`bg-void font-text text-ink antialiased ${
        // Story mode lets the document scroll, which is what Lenis and
        // ScrollTrigger both expect. Explore mode is a fixed-height widget and
        // must not let the page move behind it.
        isStory ? 'min-h-dvh' : 'flex h-dvh flex-col overflow-hidden'
      }`}
    >
      <div ref={toolbar} className={isStory ? 'sticky top-0 z-30' : 'contents'}>
        <Toolbar
          data={data}
          state={state}
          matchCount={matches.size}
          filtered={filtered}
          base={base}
          onQuery={setQuery}
          onMode={setMode}
          onToggleConstellation={toggleConstellation}
          onToggleTier={toggleTier}
          onClear={clearFilters}
        />
      </div>

      {/* The canvas measures itself, so it must not render until there is a
          real viewport to measure. */}
      {!mounted ? (
        <div className="flex-1" aria-hidden="true" />
      ) : isStory ? (
        <StoryMode
          events={storyEvents}
          reduced={reduced}
          onActive={onActive}
          activeId={state.openId}
          initialId={initialId.current}
          scrollToEl={scrollToEl}
        />
      ) : narrow ? (
        <MobileTimeline data={data} matches={matches} filtered={filtered} onOpen={open} />
      ) : (
        <ExploreCanvas
          data={data}
          matches={matches}
          openId={state.openId}
          onOpen={open}
          reduced={reduced}
          filtered={filtered}
        />
      )}

      {/* Story mode has no drawer — the section IS the detail view. */}
      {!isStory && <EventDrawer event={openEvent} onClose={() => open(null)} reduced={reduced} />}
    </div>
  );
}
