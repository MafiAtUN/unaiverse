/**
 * Scroll choreography (plan §8). Dynamically imported — never runs for
 * readers who asked for reduced motion.
 *
 * Two jobs, deliberately split by risk:
 *
 *   1. NODE REVEALS use a native IntersectionObserver and no library at all.
 *      This is content: if the reveal mechanism fails, 76 milestones are
 *      invisible. IntersectionObserver fires for elements already in view on
 *      the very first callback, needs no refresh lifecycle, and survives the
 *      filter bar hiding and showing nodes underneath it. An earlier version
 *      drove this from ScrollTrigger and left every node at opacity 0 until
 *      something scrolled — one missed refresh from a blank page.
 *
 *   2. THE BIG BANG uses GSAP ScrollTrigger, which is worth a dependency for
 *      a scrubbed timeline. It is decoration: if it never loads, the sky just
 *      doesn't detonate and every word is still on screen. GSAP is therefore
 *      only fetched when there is actually a galaxy to drive — a phone with
 *      the CSS sky never downloads it.
 */
import type { Galaxy } from './galaxy';

const REVEAL_CLASS = 'is-revealed';

function revealAll() {
  document
    .querySelectorAll<HTMLElement>('[data-node], .zone__head')
    .forEach((el) => el.classList.add(REVEAL_CLASS));
}

function setupReveals() {
  // No IntersectionObserver, no hiding. Content stays visible.
  if (!('IntersectionObserver' in window)) return;

  const targets = document.querySelectorAll<HTMLElement>('[data-node], .zone__head');
  if (!targets.length) return;

  // Only now is it safe to let the CSS hide anything: the observer that
  // undoes it is created on the next two lines.
  document.documentElement.classList.add('motion-ready');

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add(REVEAL_CLASS);
        io.unobserve(entry.target);
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0 },
  );

  targets.forEach((el) => io.observe(el));

  // Belt and braces. If anything is still unrevealed well after load — a
  // detached observer, a layout the observer never saw — show it anyway.
  // A late fade-in is a cosmetic flaw; invisible content is a broken site.
  window.setTimeout(() => {
    document
      .querySelectorAll<HTMLElement>(`[data-node]:not(.${REVEAL_CLASS})`)
      .forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.top < window.innerHeight * 1.5) el.classList.add(REVEAL_CLASS);
      });
  }, 4000);
}

async function setupBigBang(galaxy: Galaxy) {
  const { gsap } = await import('gsap');
  const { ScrollTrigger } = await import('gsap/ScrollTrigger');
  gsap.registerPlugin(ScrollTrigger);

  // Anchored to the CAPTION, not the whole section. The section also holds
  // the ChatGPT node, whose paper panel is open by default — scrubbing across
  // the full section formed the olive branches behind an opaque sheet of
  // paper. Tied to the heading, the emblem lands in clear sky.
  const caption = document.querySelector<HTMLElement>('[data-bigbang-flash]');
  if (caption) {
    ScrollTrigger.create({
      trigger: caption,
      start: 'top 92%',
      end: 'bottom 22%',
      scrub: 0.6,
      onUpdate: (self) => galaxy.setBang(self.progress),
    });
  }

  // Slow parallax over the whole page.
  ScrollTrigger.create({
    trigger: document.body,
    start: 'top top',
    end: 'bottom bottom',
    scrub: true,
    onUpdate: (self) => galaxy.setDrift(-self.progress * 8),
  });

  // Filtering and opening panels both move everything below them.
  document.addEventListener('unaiverse:filtered', () => ScrollTrigger.refresh());
  document.addEventListener('toggle', () => ScrollTrigger.refresh(), true);
}

export async function startMotion(galaxy: Galaxy | null) {
  setupReveals();

  if (!galaxy) return; // no galaxy, no reason to pay for GSAP

  try {
    await setupBigBang(galaxy);
  } catch (err) {
    console.warn('[unaiverse] Big Bang unavailable', err);
    revealAll(); // never let a decoration failure strand content
  }
}
