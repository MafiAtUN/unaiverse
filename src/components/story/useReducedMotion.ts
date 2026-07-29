import { useEffect, useState } from 'react';

/**
 * Whether the reader has asked for less motion.
 *
 * Starts `true` on the server and on the very first client render. That is the
 * safe default in both directions: nothing animates before we know, so a reader
 * who wants stillness never catches a frame of movement, and a reader who
 * doesn't loses only the entrance animation of whatever mounted first.
 *
 * Live, not read-once — macOS lets you flip the setting without reloading.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  return reduced;
}

/** True once mounted on the client. Guards anything that must not run in SSR. */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

/**
 * Matches a media query reactively. Used for the mobile fallback, which is a
 * different component tree rather than a restyling of the same one — a
 * horizontal axis and a vertical list have nothing structural in common.
 */
export function useMediaQuery(query: string, initial = false): boolean {
  const [matches, setMatches] = useState(initial);

  useEffect(() => {
    const mq = window.matchMedia(query);
    const sync = () => setMatches(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, [query]);

  return matches;
}
