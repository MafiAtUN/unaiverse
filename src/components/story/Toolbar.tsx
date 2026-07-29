import { useId } from 'react';
import type { TimelineDataset, Tier } from '../../lib/timeline-data';
import type { Mode, StoryState } from './useStoryState';

export interface ToolbarProps {
  data: TimelineDataset;
  state: StoryState;
  matchCount: number;
  filtered: boolean;
  base: string;
  onQuery: (q: string) => void;
  onMode: (m: Mode) => void;
  onToggleConstellation: (id: string) => void;
  onToggleTier: (t: Tier) => void;
  onClear: () => void;
}

const TIER_DOT: Record<Tier, string> = { 1: 'bg-yellow', 2: 'bg-pink', 3: 'bg-green' };

export function Toolbar({
  data,
  state,
  matchCount,
  filtered,
  base,
  onQuery,
  onMode,
  onToggleConstellation,
  onToggleTier,
  onClear,
}: ToolbarProps) {
  const searchId = useId();

  return (
    <header className="shrink-0 border-b border-hairline bg-void-deep">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3 px-5 py-3">
        <a
          href={base}
          className="font-code text-eyebrow uppercase text-ink-faint transition-colors hover:text-ink"
        >
          ← The galaxy
        </a>

        <p className="font-head text-[0.95rem] tracking-[0.01em]">
          <span className="font-semibold">UNAIVERSE</span>
          <span className="mx-1.5 text-ink-faint">/</span>
          <span className="text-ink-dim">Story</span>
        </p>

        {/* Two modes, one control. A segmented pair rather than tabs: there is
            no panel relationship here, just a choice of reading. */}
        <div
          role="group"
          aria-label="Reading mode"
          className="flex overflow-hidden rounded-full border border-hairline"
        >
          {(['story', 'explore'] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => onMode(m)}
              aria-pressed={state.mode === m}
              className={`px-3.5 py-1.5 font-code text-eyebrow uppercase transition-colors ${
                state.mode === m ? 'bg-ink text-void' : 'text-ink-faint hover:text-ink'
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-3">
          <label htmlFor={searchId} className="sr-only">
            Search milestones
          </label>
          <input
            id={searchId}
            type="search"
            value={state.query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="Search 76 milestones…"
            className="w-52 rounded-full border border-hairline bg-void px-4 py-1.5 font-code text-[0.75rem] text-ink placeholder:text-ink-faint focus:border-pink focus:outline-none"
          />
          <p aria-live="polite" className="font-code text-eyebrow uppercase text-ink-faint tabular-nums">
            {filtered ? `${matchCount} of ${data.events.length}` : `${data.events.length} milestones`}
          </p>
        </div>
      </div>

      {/*  On a phone these chips wrap to five rows and eat a third of the
          screen before a single milestone is visible. One scrollable row
          instead — the counts stay legible and the list keeps the height. */}
      <div className="filter-row flex items-center gap-2 overflow-x-auto border-t border-hairline px-5 py-2.5 md:flex-wrap md:overflow-x-visible">
        {data.tiers.map((t) => {
          const on = state.tiers.includes(t.id);
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onToggleTier(t.id)}
              aria-pressed={on}
              className={`flex shrink-0 items-center gap-2 rounded-full border px-3 py-1 font-code text-[0.625rem] uppercase tracking-[0.1em] whitespace-nowrap transition-colors ${
                on ? 'border-ink bg-ink text-void' : 'border-hairline text-ink-faint hover:text-ink'
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${TIER_DOT[t.id]}`} />
              {t.name}
              <span className="tabular-nums opacity-60">{t.count}</span>
            </button>
          );
        })}

        <span className="mx-1 h-4 w-px bg-hairline" aria-hidden="true" />

        {data.constellations.map((c) => {
          const on = state.constellations.includes(c.id);
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onToggleConstellation(c.id)}
              aria-pressed={on}
              className={`shrink-0 rounded-full border px-3 py-1 font-code text-[0.625rem] uppercase tracking-[0.1em] whitespace-nowrap transition-colors ${
                on ? 'border-ink bg-ink text-void' : 'border-hairline text-ink-faint hover:text-ink'
              }`}
            >
              {c.label}
              <span className="ml-1.5 tabular-nums opacity-60">{c.count}</span>
            </button>
          );
        })}

        {filtered && (
          <button
            type="button"
            onClick={onClear}
            className="ml-auto font-code text-eyebrow uppercase text-pink hover:underline"
          >
            Clear
          </button>
        )}
      </div>
    </header>
  );
}
