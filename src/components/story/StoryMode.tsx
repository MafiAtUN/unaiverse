import { useCallback, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import type { TimelineEvent } from '../../lib/timeline-data';

gsap.registerPlugin(ScrollTrigger, useGSAP);

/**
 * STORY MODE
 * ==========
 * One event, one viewport. The left rail is sticky and quiet — a running head
 * in a book — and the right column carries everything.
 *
 * On animation budget: there is ONE ScrollTrigger per section, driving one
 * timeline whose children are staggered. Not one per eyebrow, headline, rule
 * and paragraph — that would be six hundred triggers for seventy-six sections,
 * all of them recalculating on every resize. The only extra trigger is the
 * media parallax, and only on the five sections that actually have a
 * photograph.
 *
 * Everything animates on transform and opacity. Nothing here reads or writes
 * layout during scroll.
 */

const REVEAL_START = 'top 72%';

export interface StoryModeProps {
  events: TimelineEvent[];
  reduced: boolean;
  /** Reported as sections pass, so the URL and the rail stay in step. */
  onActive: (id: string, index: number) => void;
  activeId: string | null;
  /** Scrolled to once on mount when the page was opened on a deep link. */
  initialId: string | null;
  /** Routed through Lenis when it is running; see Story.tsx. */
  scrollToEl: (el: HTMLElement, immediate?: boolean) => void;
}

export function StoryMode({
  events,
  reduced,
  onActive,
  activeId,
  initialId,
  scrollToEl,
}: StoryModeProps) {
  const scope = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  const active = events[index] ?? events[0] ?? null;

  useGSAP(
    () => {
      const sections = gsap.utils.toArray<HTMLElement>('[data-section]');
      if (!sections.length) return;

      /*  Jump to the deep-linked section BEFORE the triggers exist. Created
          first, they immediately fire onToggle for whatever is on screen —
          section one — and publish that to the URL, so the address you arrived
          on is gone before the jump even happens. */
      if (initialId) {
        const target = document.getElementById(`sec-${initialId}`);
        if (target) scrollToEl(target, true);
      }

      sections.forEach((section, i) => {
        const reveals = section.querySelectorAll('[data-reveal]');
        const rule = section.querySelector('[data-rule]');

        // Reduced motion still gets the section-tracking trigger below, just
        // nothing that moves. The content is simply already there.
        const tl = reduced
          ? null
          : gsap
              .timeline({ paused: true })
              .from(reveals, {
                y: 14,
                opacity: 0,
                duration: 0.55,
                stagger: 0.05,
                ease: 'power2.out',
              })
              .from(rule, { scaleX: 0, duration: 0.6, ease: 'power2.out' }, 0.08);

        ScrollTrigger.create({
          trigger: section,
          start: REVEAL_START,
          end: 'bottom 28%',
          onEnter: () => tl?.play(),
          onEnterBack: () => tl?.play(),
          onToggle: (self) => {
            if (!self.isActive) return;
            setIndex(i);
            const ev = events[i];
            if (ev) onActive(ev.id, i);
          },
        });

        // Parallax, only where there is something to parallax.
        const media = section.querySelector('[data-media]');
        if (media && !reduced) {
          gsap.to(media, {
            yPercent: -7,
            ease: 'none',
            scrollTrigger: { trigger: section, start: 'top bottom', end: 'bottom top', scrub: true },
          });
        }
      });

      ScrollTrigger.refresh();
    },
    { scope, dependencies: [events, reduced] },
  );

  const jump = useCallback(
    (id: string) => {
      const el = document.getElementById(`sec-${id}`);
      if (el) scrollToEl(el);
    },
    [scrollToEl],
  );

  if (!events.length) {
    return (
      <p className="px-8 py-32 text-center font-code text-eyebrow uppercase text-ink-faint">
        Nothing matches those filters.
      </p>
    );
  }

  return (
    <div ref={scope} className="grid grid-cols-1 md:grid-cols-[minmax(0,20rem)_1fr]">
      <StickyRail
        events={events}
        active={active}
        index={index}
        activeId={activeId}
        onJump={jump}
      />

      <div>
        {events.map((e, i) => (
          <Section key={e.id} event={e} n={i + 1} total={events.length} />
        ))}
      </div>
    </div>
  );
}

/* ── The rail ────────────────────────────────────────────────────────── */

function StickyRail({
  events,
  active,
  index,
  activeId,
  onJump,
}: {
  events: TimelineEvent[];
  active: TimelineEvent | null;
  index: number;
  activeId: string | null;
  onJump: (id: string) => void;
}) {
  if (!active) return null;
  const year = active.start.slice(0, 4);

  return (
    <aside
      style={{ top: 'var(--toolbar-h)', height: 'calc(100dvh - var(--toolbar-h))' }}
      className="sticky z-20 self-start border-b border-hairline bg-void px-5 py-4 max-md:h-auto! md:border-b-0 md:border-r md:px-8 md:py-12"
    >
      <div className="flex items-center gap-5 md:block">
        {/*  The year behaves like a running head: it changes when you cross
            into a new one, and is otherwise still. */}
        <p
          key={year}
          className="story-year font-head text-[clamp(2rem,1.2rem+3vw,4rem)] leading-none tracking-[-0.03em] tabular-nums"
        >
          {year}
        </p>

        <div className="min-w-0 md:mt-4">
          <p className="truncate font-code text-eyebrow uppercase text-ink-faint">
            {active.zoneTitle}
          </p>
          <p className="mt-1 font-code text-eyebrow uppercase text-ink-faint tabular-nums">
            {String(index + 1).padStart(2, '0')} / {events.length}
          </p>
        </div>
      </div>

      {/*  Seventy-six hairlines, one per milestone. Decorative rather than
          focusable: making each a tab stop would put seventy-six of them in
          front of the first paragraph of prose. The sections themselves are
          the document order a keyboard reader travels. */}
      <ol
        aria-hidden="true"
        className="mt-8 hidden max-h-[52vh] flex-col gap-[3px] overflow-hidden md:flex"
      >
        {events.map((e, i) => (
          <li key={e.id}>
            <button
              type="button"
              tabIndex={-1}
              onClick={() => onJump(e.id)}
              title={e.title}
              className="block h-px w-full cursor-pointer border-0 p-0 transition-[background-color,width] duration-300"
              /*  Uniform ticks, and only the current one extends. Encoding
                  tier as width too turned the rail into a ragged barcode —
                  loud, in the one part of the layout whose whole job is to be
                  quiet. Tier is already carried by the eyebrow of every
                  section and by the stems in Explore. */
              style={{
                backgroundColor:
                  e.id === activeId
                    ? 'var(--riso-pink)'
                    : i < index
                      ? 'rgb(241 238 228 / 0.32)'
                      : 'rgb(241 238 228 / 0.12)',
                height: e.id === activeId ? 3 : 1,
                width: e.id === activeId ? '100%' : '42%',
              }}
            />
          </li>
        ))}
      </ol>

      <style>{`
        /*  Keyed on the year, so React remounts the node and the animation
            re-runs only when the year genuinely changes — not on every section. */
        .story-year { animation: year-in 420ms cubic-bezier(0.16,1,0.3,1) both; }
        @keyframes year-in {
          from { opacity: 0; transform: translateY(0.35em); }
          to   { opacity: 1; transform: none; }
        }
        @media (prefers-reduced-motion: reduce) {
          .story-year { animation: none; }
        }
      `}</style>
    </aside>
  );
}

/* ── One event ───────────────────────────────────────────────────────── */

function Section({ event, n, total }: { event: TimelineEvent; n: number; total: number }) {
  return (
    <section
      id={`sec-${event.id}`}
      data-section
      aria-labelledby={`h-${event.id}`}
      /*  Height and scroll-margin both discount the sticky toolbar, so a
          section fills exactly the space left over and a deep link lands with
          its eyebrow visible instead of tucked behind the filters. */
      style={{
        minHeight: 'calc(100dvh - var(--toolbar-h))',
        scrollMarginTop: 'var(--toolbar-h)',
      }}
      className="flex flex-col justify-center border-b border-hairline px-5 py-20 md:px-16 md:py-24"
    >
      <div className="max-w-[46rem]">
        <p data-reveal className="font-code text-eyebrow uppercase text-ink-faint">
          <span className="text-ink-dim">{event.dateDisplay}</span>
          <span className="mx-2">·</span>
          {event.tierName}
          <span className="mx-2">·</span>
          {event.constellationLabel}
          {event.symbol && <span className="ml-2 text-yellow">{event.symbol}</span>}
        </p>

        <h2
          id={`h-${event.id}`}
          data-reveal
          className="mt-5 font-head text-display text-balance"
        >
          {event.title}
        </h2>

        <div data-rule className="mt-8 h-px origin-left bg-hairline-strong" />

        {/*  The judgement leads and the record follows. It is the one editorial
            inversion in the layout, and the reason the page reads as a view
            rather than an encyclopedia entry. */}
        {event.why && (
          <p data-reveal className="mt-8 font-head text-lede text-ink">
            {event.why}
          </p>
        )}

        {event.tldr && (
          <p data-reveal className="mt-4 font-head text-lede text-pink">
            {event.tldr}
          </p>
        )}

        <div data-reveal className="mt-7 space-y-4 text-[1rem] leading-[1.72] text-ink-dim">
          {event.body.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>

        {event.media && (
          <figure data-reveal className="mt-10">
            {/*  Capped rather than free-flowing. An unbounded portrait frame
                turns one section into three screens of scrolling and breaks
                the one-event-one-viewport rule the mode is built on. The 1.08
                scale is the headroom the parallax travels into. */}
            <div className="max-h-[58vh] overflow-hidden">
              <img
                data-media
                src={event.media.url}
                alt={event.media.caption ?? event.title}
                loading="lazy"
                decoding="async"
                className="h-full max-h-[58vh] w-full scale-[1.08] bg-void-raised object-cover"
              />
            </div>
            <figcaption className="mt-3 font-code text-[0.6875rem] leading-relaxed text-ink-faint">
              {event.media.caption}
              {event.media.credit && <span className="mt-1 block">{event.media.credit}</span>}
            </figcaption>
          </figure>
        )}

        {event.badges.length > 0 && (
          <ul data-reveal className="mt-8 flex flex-wrap gap-2">
            {event.badges.map((b) => (
              <li
                key={b}
                className="rounded-full border border-hairline px-2.5 py-1 font-code text-[0.625rem] uppercase tracking-[0.1em] text-ink-faint"
              >
                {b}
              </li>
            ))}
          </ul>
        )}

        {event.receipts.length > 0 && (
          <div data-reveal className="mt-10 border-t border-hairline pt-6">
            <h3 className="font-code text-eyebrow uppercase text-ink-faint">
              Sources
              <span className="ml-3 tabular-nums opacity-60">
                {String(n).padStart(2, '0')} / {total}
              </span>
            </h3>
            <ol className="mt-4 grid gap-2 sm:grid-cols-2">
              {event.receipts.map((r, i) => (
                <li key={r.url} className="flex gap-3 text-[0.85rem]">
                  <span className="font-code text-ink-faint tabular-nums">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-pink underline decoration-pink/35 underline-offset-2 transition-colors hover:decoration-current"
                  >
                    {r.label}
                  </a>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </section>
  );
}
