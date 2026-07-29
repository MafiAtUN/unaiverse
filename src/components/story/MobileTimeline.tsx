import { useMemo } from 'react';
import type { TimelineDataset, TimelineEvent, Tier } from '../../lib/timeline-data';

/**
 * The narrow-screen reading of Explore mode.
 *
 * A different component, not a restyling. A horizontal time axis squeezed into
 * 390px is unreadable at any density, and the two obvious escapes — a carousel,
 * or a centre line with cards alternating left and right — were both ruled out
 * for the same reason: they turn a chronology into a decoration and hide how
 * much of it there is.
 *
 * So: a vertical list grouped by year, with the year sticky. It scrolls
 * natively, every event is a real link, and the density that makes the desktop
 * canvas worth looking at survives as "2024 has nineteen entries".
 */

const TIER_MARK: Record<Tier, string> = {
  1: 'bg-yellow w-1.5',
  2: 'bg-pink w-1',
  3: 'bg-green w-1',
};

export interface MobileTimelineProps {
  data: TimelineDataset;
  matches: Set<string>;
  filtered: boolean;
  onOpen: (id: string) => void;
}

export function MobileTimeline({ data, matches, filtered, onOpen }: MobileTimelineProps) {
  const byYear = useMemo(() => {
    const groups = new Map<number, TimelineEvent[]>();
    for (const e of data.events) {
      if (filtered && !matches.has(e.id)) continue;
      const y = Number(e.start.slice(0, 4));
      const list = groups.get(y);
      if (list) list.push(e);
      else groups.set(y, [e]);
    }
    return [...groups.entries()].sort((a, b) => a[0] - b[0]);
  }, [data.events, matches, filtered]);

  if (!byYear.length) {
    return (
      <p className="px-5 py-16 text-center font-code text-eyebrow uppercase text-ink-faint">
        Nothing matches those filters.
      </p>
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      {byYear.map(([year, events]) => (
        <section key={year}>
          <h2 className="sticky top-0 z-10 flex items-baseline gap-3 border-y border-hairline bg-void-deep/95 px-5 py-2 backdrop-blur-none">
            <span className="font-head text-2xl tracking-[-0.02em]">{year}</span>
            <span className="font-code text-eyebrow uppercase text-ink-faint tabular-nums">
              {events.length} {events.length === 1 ? 'entry' : 'entries'}
            </span>
          </h2>

          <ul>
            {events.map((e) => (
              <li key={e.id}>
                <button
                  type="button"
                  onClick={() => onOpen(e.id)}
                  className="flex w-full items-stretch gap-4 border-b border-hairline px-5 py-4 text-left active:bg-void-raised"
                >
                  <span className={`${TIER_MARK[e.tier]} shrink-0 rounded-full`} aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-code text-eyebrow uppercase text-ink-faint">
                      {e.dateDisplay}
                    </span>
                    <span className="mt-1 block font-head text-[1.05rem] leading-snug text-ink">
                      {e.title}
                    </span>
                    {e.why && (
                      <span className="mt-1.5 block text-[0.85rem] leading-relaxed text-ink-faint">
                        {e.why}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
