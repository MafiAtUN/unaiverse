import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { scaleLinear, scaleTime } from 'd3-scale';
import { timeYear } from 'd3-time';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import type { TimelineDataset, TimelineEvent, Tier } from '../../lib/timeline-data';

/**
 * EXPLORE MODE
 * ============
 * A horizontal, draggable reading of the whole corpus.
 *
 * Two decisions worth stating, because both rejected an obvious alternative.
 *
 * 1. Scrolling is NATIVE overflow, not a transform driven by a wheel handler.
 *    Trackpad inertia, touch fling, the scrollbar, `scroll-snap` and
 *    `scrollIntoView` are all things browsers already do better than a custom
 *    implementation, and they are what "native-feeling" actually means. Pointer
 *    drag is layered on top for mouse users, who otherwise have no gesture.
 *
 * 2. The long-running tracks are ONE ribbon, not a row of bars each. 39 of the
 *    76 events carry an end date and most of them overlap, so packing them into
 *    non-colliding rows needs 28 rows — unreadable, and mostly whitespace. The
 *    honest signal is not which row a track sits in but how many are turning at
 *    once: one in 2014, seven by 2021, twenty-seven by mid-2024. That is a
 *    single band, and it is the picture of the decade the corpus is really about.
 */

const PX_PER_YEAR = 200;
/** Keeps the first and last stems off the edges of the scroll container. */
const EDGE_PAD = 96;

/**
 * The plot is a fixed height rather than a share of the viewport. A stem is a
 * mark, not a column — letting it grow to 70% of a tall screen turns the canvas
 * into a bar chart of nothing, since stem height encodes only tier.
 */
const PLOT_H = 300;

const TIER_STYLE: Record<Tier, { h: number; w: number; cls: string }> = {
  1: { h: 176, w: 3, cls: 'bg-yellow' },
  2: { h: 104, w: 2, cls: 'bg-pink' },
  3: { h: 52, w: 2, cls: 'bg-green' },
};

const ms = (isoDay: string) => Date.parse(`${isoDay}T00:00:00Z`);

export interface ExploreCanvasProps {
  data: TimelineDataset;
  matches: Set<string>;
  openId: string | null;
  onOpen: (id: string) => void;
  reduced: boolean;
  filtered: boolean;
}

export function ExploreCanvas({
  data,
  matches,
  openId,
  onOpen,
  reduced,
  filtered,
}: ExploreCanvasProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState(1200);

  // Cursor for keyboard navigation. Distinct from `openId`: arrow keys move
  // through the timeline without opening anything, the way a list cursor does.
  const [cursor, setCursor] = useState(0);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setViewport(entry!.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const width = Math.max(viewport * 2.2, (data.events.length ? yearSpan(data) : 1) * PX_PER_YEAR);

  const x = useMemo(
    () =>
      scaleTime()
        .domain([new Date(ms(data.domain.start)), new Date(ms(data.domain.end))])
        .range([EDGE_PAD, width - EDGE_PAD]),
    [data.domain.start, data.domain.end, width],
  );

  const years = useMemo(() => x.ticks(timeYear.every(1) ?? 1), [x]);
  const ribbon = useMemo(() => buildRibbon(data.events, x), [data.events, x]);
  const labelRows = useMemo(() => packLabels(data.events, x), [data.events, x]);

  /* ── Entrance ──────────────────────────────────────────────────────
     One timeline for the whole canvas, not one ScrollTrigger per stem.
     Stems scale up from the axis on their own transform origin, so the
     browser composites the lot without a single layout pass. */
  const scope = useRef<HTMLDivElement>(null);
  useGSAP(
    () => {
      if (reduced) return;
      gsap.from('[data-stem]', {
        scaleY: 0,
        opacity: 0,
        duration: 0.5,
        ease: 'power3.out',
        stagger: { each: 0.008, from: 'start' },
      });
      gsap.from('[data-ribbon]', { opacity: 0, duration: 0.8, ease: 'power2.out', delay: 0.2 });
    },
    { scope, dependencies: [reduced] },
  );

  /* ── Pointer drag ──────────────────────────────────────────────────
     Mouse users get no fling gesture from the platform, so this supplies one.
     Touch is left entirely alone — the browser's own momentum is better than
     anything reimplemented here, and intercepting it makes the page feel dead. */
  const drag = useRef({ active: false, startX: 0, startLeft: 0, moved: 0, vx: 0, lastT: 0 });

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.pointerType === 'touch' || e.button !== 0) return;
    const el = scrollerRef.current;
    if (!el) return;
    drag.current = {
      active: true,
      startX: e.clientX,
      startLeft: el.scrollLeft,
      moved: 0,
      vx: 0,
      lastT: performance.now(),
    };
    el.setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const el = scrollerRef.current;
    const d = drag.current;
    if (!d.active || !el) return;
    const dx = e.clientX - d.startX;
    const now = performance.now();
    const dt = Math.max(1, now - d.lastT);
    d.vx = ((el.scrollLeft - (d.startLeft - dx)) / dt) * -1;
    d.lastT = now;
    d.moved = Math.max(d.moved, Math.abs(dx));
    el.scrollLeft = d.startLeft - dx;
  }, []);

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      const el = scrollerRef.current;
      const d = drag.current;
      if (!d.active || !el) return;
      d.active = false;
      el.releasePointerCapture(e.pointerId);

      // Coast, unless the reader asked for stillness or barely moved.
      if (reduced || Math.abs(d.vx) < 0.15) return;
      const target = el.scrollLeft + d.vx * 220;
      gsap.to(el, {
        scrollLeft: Math.max(0, Math.min(el.scrollWidth - el.clientWidth, target)),
        duration: 0.7,
        ease: 'power2.out',
        overwrite: true,
      });
    },
    [reduced],
  );

  /** A drag that travelled should not also fire the click on the stem under it. */
  const suppressClick = useCallback((e: React.MouseEvent) => {
    if (drag.current.moved > 6) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, []);

  const centreOn = useCallback(
    (index: number) => {
      const el = scrollerRef.current;
      const ev = data.events[index];
      if (!el || !ev) return;
      el.scrollTo({
        left: x(new Date(ms(ev.start))) - el.clientWidth / 2,
        behavior: reduced ? 'auto' : 'smooth',
      });
    },
    [data.events, x, reduced],
  );

  const step = useCallback(
    (delta: number) => {
      setCursor((c) => {
        const next = Math.max(0, Math.min(data.events.length - 1, c + delta));
        centreOn(next);
        return next;
      });
    },
    [centreOn, data.events.length],
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowRight':
          e.preventDefault();
          step(1);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          step(-1);
          break;
        case 'Home':
          e.preventDefault();
          setCursor(0);
          centreOn(0);
          break;
        case 'End': {
          e.preventDefault();
          const last = data.events.length - 1;
          setCursor(last);
          centreOn(last);
          break;
        }
        case 'Enter':
        case ' ': {
          const ev = data.events[cursor];
          if (ev) {
            e.preventDefault();
            onOpen(ev.id);
          }
          break;
        }
      }
    },
    [centreOn, cursor, data.events, onOpen, step],
  );

  // A deep link should land you looking at the event, not at 2014.
  useEffect(() => {
    if (!openId) return;
    const i = data.events.findIndex((e) => e.id === openId);
    if (i >= 0) {
      setCursor(i);
      centreOn(i);
    }
    // Only when the linked event changes — not on every re-render of the scale.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openId, data.events]);

  return (
    <div ref={scope} className="relative flex h-full min-h-0 flex-col bg-void">
      <div
        ref={scrollerRef}
        tabIndex={0}
        role="application"
        aria-label="Timeline of UN artificial-intelligence milestones. Use the left and right arrow keys to move between events, Enter to open one."
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClickCapture={suppressClick}
        className="explore-scroller relative h-full min-h-0 overflow-x-auto overflow-y-hidden outline-none"
      >
        <div className="relative flex h-full flex-col" style={{ width }}>
          {/* ── Zones ─────────────────────────────────────────────── */}
          <div className="relative h-8 shrink-0 border-b border-hairline">
            {data.zones.map((z, i) => {
              const left = x(new Date(ms(z.start)));
              const right = x(new Date(ms(z.end)));
              return (
                <div
                  key={z.id}
                  className="absolute inset-y-0 flex items-center overflow-hidden border-l border-hairline px-3"
                  style={{ left, width: Math.max(0, right - left) }}
                >
                  {/*  Sticky so a zone still names itself once you have
                      scrolled into the middle of it. The band is time-bound;
                      its label should not have to be. */}
                  <span
                    className="sticky left-3 truncate font-code text-eyebrow uppercase"
                    style={{ color: ZONE_INK[i % ZONE_INK.length] }}
                  >
                    {z.title}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Deliberate air between the zone band and the plot: the Supernova
              labels climb into it, so it is the annotation layer rather than
              padding. The brief's "generous whitespace" lives here. */}
          <div className="flex-1" />

          {/* ── Plot ──────────────────────────────────────────────────
              The ribbon and the stems share one baseline, because they are two
              readings of the same axis: the filled area is how much machinery
              was turning at that moment, the stems are the events that happened
              on top of it. Drawing them in separate bands broke that. */}
          <div className="relative shrink-0" style={{ height: PLOT_H }}>
            <svg
              data-ribbon
              className="absolute inset-0 h-full w-full"
              viewBox={`0 0 ${width} ${PLOT_H}`}
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <path d={ribbon.area} className="fill-green/8" />
              <path d={ribbon.line} className="stroke-green/55" fill="none" strokeWidth={1.5} />
            </svg>

            {data.events.map((ev, i) => (
              <Stem
                key={ev.id}
                event={ev}
                left={x(new Date(ms(ev.start)))}
                dimmed={filtered && !matches.has(ev.id)}
                active={openId === ev.id}
                cursored={cursor === i}
                labelRow={labelRows.get(ev.id)}
                onOpen={onOpen}
                onFocus={() => setCursor(i)}
              />
            ))}
          </div>

          {/* ── Axis ──────────────────────────────────────────────── */}
          <div className="relative h-14 shrink-0 border-t border-hairline-strong">
            {years.map((d) => (
              <div key={+d} className="absolute top-0 bottom-0" style={{ left: x(d) }}>
                <div className="h-2 w-px bg-hairline-strong" />
                <span className="absolute top-3 -translate-x-1/2 font-code text-eyebrow text-ink-faint">
                  {d.getUTCFullYear()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/*  Legend and hint sit OUTSIDE the scroller. Inside it they are pinned to
          a moment in 2013 and disappear the instant you scrub away from it —
          which is exactly what happened the first time. */}
      <div className="pointer-events-none absolute inset-x-0 top-11 flex items-start justify-between px-6">
        <p className="font-code text-eyebrow uppercase text-ink-faint">
          Long-running tracks active
          <span className="ml-2 text-green">peak {ribbon.peak}</span>
        </p>
        <p className="hidden font-code text-eyebrow uppercase text-ink-faint md:block">
          Drag, scroll or use ← → · Enter opens
        </p>
      </div>

      <style>{`
        /* Soft snapping: the axis stays free to scrub, but releasing near a
           stem settles onto it. "proximity" rather than "mandatory" is the
           whole point: mandatory would make dragging past a dense year feel
           like it was fighting back. */
        .explore-scroller { scroll-snap-type: x proximity; scrollbar-width: thin; }
        .explore-scroller [data-stem-hit] { scroll-snap-align: center; }
        .explore-scroller::-webkit-scrollbar { height: 10px; }
        .explore-scroller::-webkit-scrollbar-thumb {
          background: var(--hairline-strong); border-radius: 99px;
        }
        @media (prefers-reduced-motion: reduce) {
          .explore-scroller { scroll-snap-type: none; }
        }
      `}</style>
    </div>
  );
}

const ZONE_INK = ['var(--ink-faint)', 'var(--riso-pink)', 'var(--riso-green)', 'var(--riso-yellow)'];

/** Width a Supernova label is allowed, and the vertical pitch between rows. */
const LABEL_W = 168;
const LABEL_PITCH = 52;

/**
 * Nine Supernovas, seven of them between 2023 and 2026 — centred labels at one
 * height overlap into an unreadable smear. So they stack: each label takes the
 * lowest row where it does not collide with one already placed, and a leader
 * line drops back to its stem.
 *
 * This is also what the empty upper half of the canvas is for. The labels climb
 * into it, which turns dead space into the annotation layer of a chart rather
 * than padding.
 */
function packLabels(events: TimelineEvent[], x: ReturnType<typeof scaleTime>): Map<string, number> {
  const rows: number[] = [];
  const out = new Map<string, number>();

  for (const e of events) {
    if (e.tier !== 1) continue;
    const left = x(new Date(ms(e.start))) - LABEL_W / 2;
    const right = left + LABEL_W;

    let row = rows.findIndex((edge) => left > edge + 16);
    if (row < 0) row = rows.length;
    rows[row] = right;
    out.set(e.id, row);
  }
  return out;
}

interface StemProps {
  event: TimelineEvent;
  left: number;
  dimmed: boolean;
  active: boolean;
  cursored: boolean;
  labelRow?: number;
  onOpen: (id: string) => void;
  onFocus: () => void;
}

/**
 * One event. The button is a generous invisible hit area; the visible mark is
 * the thin stem inside it, so a 2px-wide tick is still comfortably clickable
 * and reachable by touch without drawing a 44px block on the canvas.
 */
function Stem({ event, left, dimmed, active, cursored, labelRow, onOpen, onFocus }: StemProps) {
  const t = TIER_STYLE[event.tier];
  const labelled = event.tier === 1 && labelRow !== undefined;
  const lift = labelled ? labelRow! * LABEL_PITCH : 0;

  return (
    <button
      type="button"
      data-stem-hit
      onClick={() => onOpen(event.id)}
      onFocus={onFocus}
      aria-label={`${event.title}. ${event.dateDisplay}. ${event.tierName}.`}
      aria-current={active ? 'true' : undefined}
      tabIndex={-1}
      className="group absolute bottom-0 flex w-11 -translate-x-1/2 cursor-pointer flex-col items-center justify-end bg-transparent outline-none"
      style={{
        left,
        height: t.h,
        opacity: dimmed ? 0.12 : 1,
        transition: 'opacity 240ms cubic-bezier(0.4,0,0.2,1)',
      }}
    >
      {/*  Supernova titles are the only labels on the canvas, and they overflow
          the 44px hit area on purpose — the label is a caption on the mark, not
          something crushed into the width of a button. */}
      {labelled && (
        <>
          <span
            aria-hidden="true"
            className={`pointer-events-none absolute bottom-full left-1/2 w-px -translate-x-1/2 transition-colors ${
              active ? 'bg-yellow/70' : 'bg-hairline'
            }`}
            style={{ height: lift + 8 }}
          />
          <span
            className={`pointer-events-none absolute left-1/2 -translate-x-1/2 text-center font-head text-[0.78rem] leading-[1.25] transition-colors ${
              active ? 'text-yellow' : 'text-ink-dim group-hover:text-ink'
            }`}
            style={{ bottom: `calc(100% + ${lift + 12}px)`, width: LABEL_W }}
          >
            {event.title}
          </span>
        </>
      )}

      <span
        data-stem
        className={`${t.cls} origin-bottom rounded-full transition-[width] duration-200`}
        style={{
          width: active || cursored ? t.w + 2 : t.w,
          height: '100%',
          boxShadow: active
            ? '0 0 0 3px color-mix(in oklab, var(--riso-pink) 28%, transparent)'
            : undefined,
        }}
      />
    </button>
  );
}

function yearSpan(data: TimelineDataset): number {
  return (
    new Date(ms(data.domain.end)).getUTCFullYear() -
    new Date(ms(data.domain.start)).getUTCFullYear() +
    1
  );
}

/**
 * Turn the spans into a step function of "how many tracks are running now",
 * then into an SVG area. Built as a step rather than a smooth curve because
 * the underlying quantity is a count — it genuinely jumps.
 */
function buildRibbon(events: TimelineEvent[], x: ReturnType<typeof scaleTime>) {
  const deltas: { t: number; d: number }[] = [];
  for (const e of events) {
    if (!e.end) continue;
    deltas.push({ t: ms(e.start), d: 1 });
    deltas.push({ t: ms(e.end), d: -1 });
  }
  deltas.sort((a, b) => a.t - b.t);

  const points: { t: number; c: number }[] = [];
  let count = 0;
  let peak = 0;
  for (const { t, d } of deltas) {
    count += d;
    peak = Math.max(peak, count);
    points.push({ t, c: count });
  }
  if (!points.length) return { area: '', line: '', peak: 0 };

  // Topping out at 70% of the plot keeps the ribbon under the Supernova stems
  // rather than swallowing them — it is context, not the subject.
  const y = scaleLinear().domain([0, peak]).range([PLOT_H, PLOT_H * 0.3]);
  const [x0, x1] = x.range();

  let line = `M${x0},${y(0)}`;
  let prev = y(0);
  for (const p of points) {
    const px = Math.max(x0, Math.min(x1, x(new Date(p.t))));
    line += ` L${px},${prev} L${px},${y(p.c)}`;
    prev = y(p.c);
  }
  line += ` L${x1},${prev}`;

  return { area: `${line} L${x1},${PLOT_H} L${x0},${PLOT_H} Z`, line, peak };
}
