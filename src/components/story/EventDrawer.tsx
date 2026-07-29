import { useCallback, useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import type { TimelineEvent } from '../../lib/timeline-data';

/**
 * The detail panel.
 *
 * It is printed stock over the ink-black canvas — solid `--paper`, not a
 * frosted sheet. That is the site's own idea carried through: long-form text
 * sits on paper so reading feels like documents rather than terminals. A blur
 * would put the timeline's own stems behind every line of body copy, which is
 * the opposite of legible, and would date the page to about 2021.
 */

export interface EventDrawerProps {
  event: TimelineEvent | null;
  onClose: () => void;
  reduced: boolean;
}

export function EventDrawer({ event, onClose, reduced }: EventDrawerProps) {
  const panel = useRef<HTMLDivElement>(null);
  const scrim = useRef<HTMLDivElement>(null);
  /** Where focus came from, so it can be handed back on close. */
  const opener = useRef<HTMLElement | null>(null);

  const open = event !== null;

  useEffect(() => {
    if (open) opener.current = document.activeElement as HTMLElement | null;
  }, [open]);

  useGSAP(
    () => {
      if (!open || !panel.current) return;

      if (reduced) {
        gsap.set([panel.current, scrim.current], { clearProps: 'all' });
      } else {
        gsap
          .timeline()
          .from(scrim.current, { opacity: 0, duration: 0.25, ease: 'none' })
          .from(panel.current, { xPercent: 100, duration: 0.42, ease: 'power3.out' }, 0)
          .from(
            panel.current!.querySelectorAll('[data-reveal]'),
            { y: 12, opacity: 0, duration: 0.4, stagger: 0.045, ease: 'power2.out' },
            0.14,
          );
      }

      // Focus the panel itself rather than the close button: a screen reader
      // then reads the heading, which is what the reader actually wants to know.
      panel.current.focus({ preventScroll: true });
    },
    { dependencies: [open, event?.id, reduced] },
  );

  /*  Focus trap. Deliberately hand-rolled and about fifteen lines: the drawer
      has one region and one exit, and a dependency for that would be larger
      than the thing it replaces. */
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !panel.current) return;

      const focusable = panel.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable.length) return;
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    },
    [onClose],
  );

  const close = useCallback(() => {
    onClose();
    opener.current?.focus?.();
  }, [onClose]);

  if (!event) return null;

  return (
    <div className="fixed inset-0 z-50" onKeyDown={onKeyDown}>
      <div
        ref={scrim}
        onClick={close}
        className="absolute inset-0 bg-void-deep/72"
        aria-hidden="true"
      />

      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
        tabIndex={-1}
        className="absolute inset-y-0 right-0 flex w-[min(38rem,94vw)] flex-col bg-paper text-paper-ink outline-none"
      >
        <header className="flex items-start justify-between gap-4 border-b border-paper-hairline px-8 py-5">
          <p data-reveal className="font-code text-eyebrow uppercase text-paper-ink-faint">
            {event.dateDisplay}
            {event.symbol && <span className="ml-2 text-pink-print">{event.symbol}</span>}
          </p>
          <button
            type="button"
            onClick={close}
            className="-mt-1 -mr-2 shrink-0 rounded px-2 py-1 font-code text-eyebrow uppercase text-paper-ink-faint hover:text-paper-ink"
          >
            Close ✕
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-8 py-7">
          <p data-reveal className="font-code text-eyebrow uppercase text-paper-ink-faint">
            {event.tierName} · {event.constellationGlyph} {event.constellationLabel}
          </p>

          <h2
            id="drawer-title"
            data-reveal
            className="mt-3 font-head text-[clamp(1.6rem,1.1rem+1.6vw,2.4rem)] leading-[1.08] tracking-[-0.02em] text-balance"
          >
            {event.title}
          </h2>

          {event.badges.length > 0 && (
            <ul data-reveal className="mt-4 flex flex-wrap gap-2">
              {event.badges.map((b) => (
                <li
                  key={b}
                  className="rounded-full border border-paper-hairline px-2.5 py-1 font-code text-[0.625rem] uppercase tracking-[0.1em] text-paper-ink-dim"
                >
                  {b}
                </li>
              ))}
            </ul>
          )}

          {/* The judgement leads; the record follows. */}
          {event.why && (
            <p
              data-reveal
              className="mt-7 border-l-2 border-green-print pl-4 font-head text-lede text-paper-ink"
            >
              {event.why}
            </p>
          )}

          {event.tldr && (
            <p data-reveal className="mt-5 font-head text-lede text-pink-print">
              {event.tldr}
            </p>
          )}

          {event.media && (
            <figure data-reveal className="mt-7">
              <img
                src={event.media.url}
                alt={event.media.caption ?? event.title}
                loading="lazy"
                decoding="async"
                className="w-full bg-paper-sunk"
              />
              <figcaption className="mt-2 font-code text-[0.6875rem] leading-relaxed text-paper-ink-faint">
                {event.media.caption}
                {event.media.credit && <span className="block mt-1">{event.media.credit}</span>}
              </figcaption>
            </figure>
          )}

          <div data-reveal className="mt-7 space-y-4 text-[0.95rem] leading-[1.68] text-paper-ink-dim">
            {event.body.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>

          {event.receipts.length > 0 && (
            <section data-reveal className="mt-9 border-t border-paper-hairline pt-5">
              <h3 className="font-code text-eyebrow uppercase text-paper-ink-faint">Sources</h3>
              <ol className="mt-3 space-y-2">
                {event.receipts.map((r, i) => (
                  <li key={r.url} className="flex gap-3 text-[0.85rem]">
                    <span className="font-code text-paper-ink-faint tabular-nums">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-pink-print underline decoration-pink-print/40 underline-offset-2 hover:decoration-current"
                    >
                      {r.label}
                    </a>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
