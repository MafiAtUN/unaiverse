/**
 * Unique element ids for components that can appear more than once on a page.
 *
 * A component that hard-codes `id="role-picker-label"` works perfectly until
 * the day someone renders two of it, at which point both regions'
 * `aria-labelledby` resolve to the same element and one of them is silently
 * mislabelled — a failure with no visual symptom at all.
 *
 * A counter rather than a random suffix, so two builds of the same content
 * produce byte-identical HTML.
 */
const counters = new Map<string, number>();

export function uid(prefix: string): string {
  const n = (counters.get(prefix) ?? 0) + 1;
  counters.set(prefix, n);
  return `${prefix}-${n}`;
}
