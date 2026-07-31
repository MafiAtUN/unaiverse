import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { scaleLinear, scaleTime } from 'd3-scale';
// Named explicitly: `ReturnType<typeof scaleTime>` resolves to the overload
// whose output type is unresolved, so every x(date) downstream types as
// `unknown` and the arithmetic on it stops checking.
import type { ScaleTime } from 'd3-scale';
import { timeYear } from 'd3-time';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import type { TimelineDataset, TimelineEvent, Tier } from '../../lib/timeline-data';

/**
 * EXPLORE MODE
 * ============
 * A horizontal, draggable reading of the whole corpus.
 *
 * Three decisions worth stating, because each rejected an obvious alternative.
 *
 * 1. Scrolling is NATIVE overflow, not a transform driven by a wheel handler.
 *    Trackpad inertia, touch fling, the scrollbar, `scroll-snap` and
 *    `scrollIntoView` are all things browsers already do better than a custom
 *    implementation, and they are what "native-feeling" actually means. Pointer
 *    drag is layered on for mouse users, who otherwise have no gesture — but
 *    see the note on pointer capture below, which is subtle and cost a bug.
 *
 * 2. The long-running tracks are ONE ribbon, not a row of bars each. 39 of the
 *    76 events carry an end date and most overlap, so packing them into
 *    non-colliding rows needs 28 rows: unreadable, and mostly whitespace. The
 *    honest signal is how many are turning at once, and that is a single band.
 *
 * 3. Every mark carries its own information. A bare tick tells you nothing, so
 *    labels are placed by priority (Supernovas first, Stars into the gaps that
 *    survive) and anything still unlabelled reveals a full card on hover or
 *    keyboard focus. Nothing on this canvas is a line with no idea attached.
 */

/**
 * Room per year. Generous on purpose: 19 of the 76 events fall in 2024 alone,
 * and at the 200px this started with they sat ten pixels apart, which is too
 * close to point at reliably and far too close to label. More width costs
 * scrolling, and scrolling is the cheapest thing on this canvas.
 */
const PX_PER_YEAR = 420;
/** Keeps the first and last stems off the edges of the scroll container. */
const EDGE_PAD = 110;
/**
 * The plot is a fixed height rather than a share of the viewport. A stem is a
 * mark, not a column: letting it grow to 70% of a tall screen turns the canvas
 * into a bar chart of nothing, since stem height encodes only tier.
 */
const PLOT_H = 300;

/** Label geometry. Supernovas get more width and a bigger face than Stars. */
const LABEL = {
  1: { w: 176, cls: 'text-[0.8rem] leading-[1.25]' },
  2: { w: 132, cls: 'text-[0.68rem] leading-[1.3]' },
} as const;
/**
 * Row pitch has to clear a whole label, not a line of one. At 46px the rows
 * were shorter than the three-line titles sitting in them, so neighbouring
 * rows printed straight through each other. Labels are clamped to three lines
 * and the pitch is set to fit three lines plus breathing room.
 */
const LABEL_PITCH = 64;
/**
 * Labels hang from one baseline for every tier, measured from the foot of the
 * plot rather than from the top of their own stem.
 *
 * That distinction is the whole reason they used to collide. Stems are
 * different heights by tier, so anchoring a label to `100%` of its own stem put
 * a Star's row 2 at the same y as a Supernova's row 1 — and the packer, which
 * only ever compared rows, cheerfully allowed them to overlap horizontally
 * because it believed they were on separate lines. Sitting above the tallest
 * stem, one row is one y, and the packing means what it says.
 */
const LABEL_BASE = 194;
const LABEL_GAP = 14;
const MAX_ROWS = 5;

const TIER_STYLE: Record<Tier, { h: number; w: number; cls: string; glow: string }> = {
  1: { h: 176, w: 3, cls: 'bg-yellow', glow: 'var(--riso-yellow)' },
  2: { h: 106, w: 2, cls: 'bg-pink', glow: 'var(--riso-pink)' },
  3: { h: 54, w: 2, cls: 'bg-green', glow: 'var(--riso-green)' },
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

  const years = useMemo(() => x.ticks(timeYear), [x]);
  const ribbon = useMemo(() => buildRibbon(data.events, x), [data.events, x]);
  const xs = useMemo(() => layoutX(data.events, x), [data.events, x]);
  const labels = useMemo(() => packLabels(data.events, xs), [data.events, xs]);
  const cells = useMemo(() => hitCells(data.events, xs), [data.events, xs]);

  const todayX = useMemo(() => {
    const now = Date.now();
    const [d0, d1] = x.domain() as [Date, Date];
    return now >= +d0 && now <= +d1 ? x(new Date(now)) : null;
  }, [x]);

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
     Capture is taken on the first MOVE past a threshold, never on pointerdown.
     That ordering is the whole fix for a bug that made every stem unclickable:
     a captured pointer retargets its events to the capturing element, so the
     browser fired `click` on the scroller and the button underneath never saw
     it. Deferring capture means a plain click is never captured at all, and a
     drag still gets capture the moment it becomes a drag.

     Touch is left entirely alone. The browser's own momentum beats anything
     reimplemented here, and intercepting it makes the page feel dead. */
  const drag = useRef({ down: false, dragging: false, startX: 0, startLeft: 0, vx: 0, lastT: 0 });

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.pointerType === 'touch' || e.button !== 0) return;
    const el = scrollerRef.current;
    if (!el) return;
    drag.current = {
      down: true,
      dragging: false,
      startX: e.clientX,
      startLeft: el.scrollLeft,
      vx: 0,
      lastT: performance.now(),
    };
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const el = scrollerRef.current;
    const d = drag.current;
    if (!d.down || !el) return;

    const dx = e.clientX - d.startX;
    if (!d.dragging) {
      if (Math.abs(dx) < 5) return;
      d.dragging = true;
      el.setPointerCapture(e.pointerId);
    }

    const next = d.startLeft - dx;
    const now = performance.now();
    /*  Velocity in px/ms, smoothed and floored on dt.
        A raw sample over a 1 ms frame turns a 30 px step into 30 px/ms, which
        the coast below then multiplies into thousands of pixels — one flick
        used to throw the canvas most of the way to 2028. The floor bounds a
        single sample's contribution and the EMA stops the last frame before
        release from deciding everything. */
    const dt = Math.max(8, now - d.lastT);
    const sample = (next - el.scrollLeft) / dt;
    d.vx = d.vx * 0.7 + sample * 0.3;
    d.lastT = now;
    el.scrollLeft = next;
  }, []);

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      const el = scrollerRef.current;
      const d = drag.current;
      if (!d.down || !el) return;
      const wasDragging = d.dragging;
      d.down = false;
      d.dragging = false;
      if (wasDragging && el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);

      if (!wasDragging || reduced || Math.abs(d.vx) < 0.2) return;
      // Coast, bounded to less than one screen. A flick should carry you into
      // the next stretch of the decade, not to the far end of it.
      const cap = el.clientWidth * 0.8;
      const coast = Math.max(-cap, Math.min(cap, d.vx * 140));
      gsap.to(el, {
        scrollLeft: Math.max(0, Math.min(el.scrollWidth - el.clientWidth, el.scrollLeft + coast)),
        duration: 0.8,
        ease: 'power2.out',
        overwrite: true,
      });
    },
    [reduced],
  );

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

  const select = useCallback(
    (id: string, index: number) => {
      setCursor(index);
      onOpen(id);
    },
    [onOpen],
  );

  useEffect(() => {
    if (!openId) return;
    const i = data.events.findIndex((e) => e.id === openId);
    if (i >= 0) {
      setCursor(i);
      centreOn(i);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openId, data.events]);

  return (
    <div ref={scope} className="relative flex h-full min-h-0 flex-col bg-void">
      <div
        ref={scrollerRef}
        tabIndex={0}
        role="application"
        aria-label="Timeline of UN artificial-intelligence milestones. Click any mark to open it, or use the left and right arrow keys to move between them."
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="explore-scroller relative h-full min-h-0 overflow-x-auto overflow-y-hidden outline-none"
      >
        <div className="relative flex h-full flex-col" style={{ width }}>
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
                  {/*  The Big Bang zone is a single day, so at any zoom its
                      band is a couple of pixels wide and its name truncates to
                      "T." — a label that says nothing and looks like damage.
                      Below a readable width the band speaks for itself. */}
                  {right - left > 64 && (
                    <span
                      className="sticky left-3 truncate font-code text-eyebrow uppercase"
                      style={{ color: ZONE_INK[i % ZONE_INK.length] }}
                    >
                      {z.title}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex-1" />

          <div className="plot relative shrink-0" style={{ height: PLOT_H }}>
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

            {/*  Where "now" is. On a corpus that runs to 2028 the line between
                what has happened and what is merely mandated is the single most
                useful piece of orientation on the canvas. */}
            {todayX !== null && (
              <div
                className="pointer-events-none absolute inset-y-0 border-l border-dashed border-ink-faint/40"
                style={{ left: todayX }}
              >
                <span className="absolute -top-5 -translate-x-1/2 font-code text-[0.5625rem] uppercase tracking-[0.14em] text-ink-faint">
                  today
                </span>
              </div>
            )}

            {data.events.map((ev, i) => (
              <Stem
                key={ev.id}
                event={ev}
                index={i}
                cell={cells[i]!}
                canvasWidth={width}
                dimmed={filtered && !matches.has(ev.id)}
                active={openId === ev.id}
                cursored={cursor === i}
                labelRow={labels.get(ev.id)}
                onSelect={select}
              />
            ))}
          </div>

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

      <div className="pointer-events-none absolute inset-x-0 top-11 flex items-start justify-between px-6">
        <p className="font-code text-eyebrow uppercase text-ink-faint">
          Long-running tracks active
          <span className="ml-2 text-green">peak {ribbon.peak}</span>
        </p>
        <p className="hidden font-code text-eyebrow uppercase text-ink-faint md:block">
          Hover to read · click to open · drag or ← → to travel
        </p>
      </div>

      <style>{`
        /* Soft snapping: the axis stays free to scrub, but releasing near a
           mark settles onto it. "proximity" rather than "mandatory" is the
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

        /*  Weight by tier, handled in CSS rather than inline style so that the
            hover rule below can override it without an !important war. The less
            important marks sit back; hovering one brings it fully forward and
            pushes everything else further back, which is what makes a dense
            year readable instead of a thicket. */
        .plot [data-stem-hit] { opacity: var(--o, 1); transition: opacity 200ms ease; }
        .plot [data-tier="1"] { --o: 1; }
        .plot [data-tier="2"] { --o: 0.82; }
        .plot [data-tier="3"] { --o: 0.5; }
        .plot:hover [data-stem-hit]:not(:hover) { --o: 0.3; }
        .plot [data-tier="1"] { z-index: 30; }
        .plot [data-tier="2"] { z-index: 20; }
        .plot [data-tier="3"] { z-index: 10; }
        .plot [data-stem-hit]:hover,
        .plot [data-stem-hit][data-on="1"] { --o: 1; z-index: 60; }
        /*  Three lines and no more. An uncapped title runs to five lines and
            walks straight into the row above it. */
        .stem-label {
          display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 3;
          overflow: hidden;
        }
        .plot [data-dim="1"] { --o: 0.08; pointer-events: none; }
        .plot:hover [data-dim="1"]:not(:hover) { --o: 0.08; }

        /*  The card. Shown on hover AND on the keyboard cursor, so arrowing
            along the axis reads exactly the same as pointing at it. */
        .stem-card {
          opacity: 0; visibility: hidden; transform: translateY(4px);
          transition: opacity 160ms ease, transform 160ms ease, visibility 160ms;
        }
        [data-stem-hit]:hover .stem-card,
        [data-stem-hit][data-on="1"] .stem-card {
          opacity: 1; visibility: visible; transform: none;
        }
        @media (prefers-reduced-motion: reduce) {
          .stem-card { transition: none; transform: none; }
        }
      `}</style>
    </div>
  );
}

const ZONE_INK = ['var(--ink-faint)', 'var(--riso-pink)', 'var(--riso-green)', 'var(--riso-yellow)'];

interface Cell {
  /** Left edge of this mark's exclusive hit area. */
  left: number;
  width: number;
  /** Distance from `left` to the mark's true position on the axis. */
  offset: number;
}

interface StemProps {
  event: TimelineEvent;
  index: number;
  cell: Cell;
  canvasWidth: number;
  dimmed: boolean;
  active: boolean;
  cursored: boolean;
  labelRow?: number;
  onSelect: (id: string, index: number) => void;
}

const CARD_W = 280;

/**
 * One event. The button is the hit area and the thin stem inside it is the
 * visible mark, so a 2px tick stays comfortably clickable without drawing a
 * 44px block on the canvas.
 *
 * The hit area is sized by `hitCells`, not fixed: see the note there.
 */
function Stem({
  event,
  index,
  cell,
  canvasWidth,
  dimmed,
  active,
  cursored,
  labelRow,
  onSelect,
}: StemProps) {
  const t = TIER_STYLE[event.tier];
  const label = labelRow !== undefined ? LABEL[event.tier as 1 | 2] : null;
  const lift = labelRow !== undefined ? LABEL_BASE + labelRow * LABEL_PITCH : 0;
  const on = active || cursored;
  const centre = cell.left + cell.offset;

  // Keep the card inside the canvas near either end rather than letting it
  // hang off into nothing.
  const shift =
    centre - CARD_W / 2 < 8
      ? CARD_W / 2 - centre + 8
      : centre + CARD_W / 2 > canvasWidth - 8
        ? canvasWidth - 8 - centre - CARD_W / 2
        : 0;

  return (
    <button
      type="button"
      data-stem-hit
      data-tier={event.tier}
      data-dim={dimmed ? '1' : undefined}
      data-on={on ? '1' : undefined}
      onClick={() => onSelect(event.id, index)}
      aria-label={`${event.title}. ${event.dateDisplay}. ${event.tierName}, ${event.constellationLabel}.`}
      aria-current={active ? 'true' : undefined}
      tabIndex={-1}
      className="group absolute bottom-0 cursor-pointer bg-transparent outline-none"
      style={{ left: cell.left, width: cell.width, height: t.h }}
    >
      {/*  The always-on label, for the marks that earned one. Positioned from
          the mark's true x rather than the centre of its hit cell, which are
          not the same once cells are trimmed against their neighbours. */}
      {label && (
        <>
          <span
            aria-hidden="true"
            className={`pointer-events-none absolute w-px -translate-x-1/2 ${
              on ? 'bg-ink-faint' : 'bg-hairline'
            }`}
            style={{ left: cell.offset, bottom: t.h, height: Math.max(0, lift - t.h - 4) }}
          />
          <span
            className={`stem-label pointer-events-none absolute -translate-x-1/2 text-center font-head transition-colors ${label.cls} ${
              on ? 'text-ink' : 'text-ink-dim group-hover:text-ink'
            }`}
            style={{ left: cell.offset, bottom: lift, width: label.w }}
          >
            {event.title}
          </span>
        </>
      )}

      {/*  The card. This is what stops an unlabelled tick from being a line
          with no idea attached: date, title, where it sits in the taxonomy,
          and the one-line judgement, for every one of the seventy-six. */}
      <span
        className="stem-card pointer-events-none absolute bottom-full z-50 mb-3 block rounded-md border border-hairline-strong bg-void-panel p-3.5 text-left shadow-2xl"
        style={{
          left: cell.offset,
          width: CARD_W,
          transform: `translateX(calc(-50% + ${shift}px))`,
        }}
      >
        <span className="block font-code text-[0.625rem] uppercase tracking-[0.12em] text-ink-faint">
          {event.dateDisplay}
        </span>
        <span className="mt-1.5 block font-head text-[0.9rem] leading-snug text-ink">
          {event.title}
        </span>
        <span className="mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-1 font-code text-[0.5625rem] uppercase tracking-[0.1em] text-ink-faint">
          <span
            className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
            style={{ backgroundColor: t.glow }}
          />
          {event.tierName} · {event.constellationLabel}
          {event.symbol && <span className="text-yellow">· {event.symbol}</span>}
        </span>
        {event.why && (
          <span className="mt-2.5 block border-t border-hairline pt-2.5 text-[0.78rem] leading-[1.5] text-ink-dim">
            {event.why}
          </span>
        )}
        <span className="mt-2.5 block font-code text-[0.5625rem] uppercase tracking-[0.12em] text-pink">
          Click to open
        </span>
      </span>

      <span
        data-stem
        className={`${t.cls} absolute bottom-0 origin-bottom -translate-x-1/2 rounded-full transition-[width,box-shadow] duration-200`}
        style={{
          left: cell.offset,
          width: on ? t.w + 3 : t.w,
          height: '100%',
          boxShadow: on ? `0 0 14px 1px ${t.glow}` : undefined,
        }}
      />
    </button>
  );
}

/**
 * Where each mark is actually drawn.
 *
 * Identical to the scale everywhere except for exact collisions: eleven of the
 * milestones share a date with at least one other (four separate events fall on
 * 22 September 2024), and two marks at the same pixel cannot both be pointed
 * at no matter how the hit areas are sliced. Tied marks are therefore fanned
 * around their true position by a few pixels each.
 *
 * At 420px to the year that nudge is under a week of apparent drift, and the
 * card and the drawer both print the real date, so nothing here can mislead
 * about when something happened.
 */
function layoutX(events: TimelineEvent[], x: ScaleTime<number, number>): number[] {
  const raw = events.map((e) => x(new Date(ms(e.start))));
  const out = [...raw];

  // Runs of marks closer together than this are spread apart, symmetrically
  // about the run's own midpoint so the cluster stays where it belongs on the
  // axis rather than drifting off to one side.
  const MIN_SEP = 13;
  const EPS = 0.01;

  // Iterated, because spreading one cluster can push its edge into the next
  // one. Each pass merges whatever the last pass collided and re-spreads it;
  // this settles in two or three rounds on this corpus, and the bound is a
  // backstop rather than a limit anything real reaches.
  for (let pass = 0; pass < 8; pass++) {
    let moved = false;
    let i = 0;
    while (i < out.length) {
      let j = i;
      while (j + 1 < out.length && out[j + 1]! - out[j]! < MIN_SEP - EPS) j++;
      const n = j - i + 1;
      if (n > 1) {
        const mid = (out[i]! + out[j]!) / 2;
        const start = mid - ((n - 1) * MIN_SEP) / 2;
        for (let k = 0; k < n; k++) out[i + k] = start + k * MIN_SEP;
        moved = true;
      }
      i = j + 1;
    }
    if (!moved) break;
  }
  return out;
}

/**
 * Give every mark an exclusive slice of the axis to be clicked in.
 *
 * A fixed 44px hit area sounds generous and was the reason the canvas felt
 * broken: in the dense years the marks sit closer than that, so the boxes
 * overlapped three deep and whichever was painted last swallowed the pointer.
 * You aimed at one mark and opened its neighbour.
 *
 * Cells now run to the midpoint between neighbours and stop there. No tier gets
 * a guaranteed minimum, because a minimum is just an overlap with a nicer name
 * and it left a third of the corpus unclickable. A crowded mark gets a narrow
 * cell, which is honest: it IS crowded. What it never does is disappear
 * underneath the mark next to it.
 */
function hitCells(events: TimelineEvent[], xs: number[]): Cell[] {
  const MAX = 44;

  return events.map((_, i) => {
    const c = xs[i]!;
    const prev = i > 0 ? (xs[i - 1]! + c) / 2 : c - MAX;
    const next = i < xs.length - 1 ? (c + xs[i + 1]!) / 2 : c + MAX;

    const left = Math.max(c - MAX / 2, prev);
    const right = Math.min(c + MAX / 2, next);

    return { left, width: Math.max(right - left, 4), offset: c - left };
  });
}

function yearSpan(data: TimelineDataset): number {
  return (
    new Date(ms(data.domain.end)).getUTCFullYear() -
    new Date(ms(data.domain.start)).getUTCFullYear() +
    1
  );
}

/**
 * Decide which marks carry a permanent label, and on which row.
 *
 * Priority, not chronology: the nine Supernovas are placed first and claim
 * whatever space they need, then the twenty-seven Stars are fitted into the
 * gaps that survive. A Star is never allowed to displace a Supernova, and
 * anything that cannot be placed without colliding simply goes unlabelled and
 * relies on its hover card. That is what keeps a dense year readable rather
 * than a wall of overlapping type.
 *
 * Rows are tracked as occupied intervals rather than a single right edge,
 * because the second pass runs back over time that the first pass already
 * covered and needs to find the real holes in it.
 */
function packLabels(events: TimelineEvent[], xs: number[]): Map<string, number> {
  const rows: [number, number][][] = [];
  const out = new Map<string, number>();

  const place = (e: TimelineEvent, i: number, w: number) => {
    const centre = xs[i]!;
    const left = centre - w / 2;
    const right = centre + w / 2;

    for (let r = 0; r < rows.length; r++) {
      const clear = rows[r]!.every(([a, b]) => right < a - LABEL_GAP || left > b + LABEL_GAP);
      if (clear) {
        rows[r]!.push([left, right]);
        out.set(e.id, r);
        return;
      }
    }
    if (rows.length >= MAX_ROWS) return;
    rows.push([[left, right]]);
    out.set(e.id, rows.length - 1);
  };

  events.forEach((e, i) => { if (e.tier === 1) place(e, i, LABEL[1].w); });
  events.forEach((e, i) => { if (e.tier === 2) place(e, i, LABEL[2].w); });
  return out;
}

/**
 * Turn the spans into a step function of "how many tracks are running now",
 * then into an SVG area. Built as a step rather than a smooth curve because
 * the underlying quantity is a count: it genuinely jumps.
 */
function buildRibbon(events: TimelineEvent[], x: ScaleTime<number, number>) {
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

  // Topping out below the Supernova stems keeps the ribbon context, not subject.
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
