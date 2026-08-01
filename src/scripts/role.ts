/**
 * ROLE MEMORY
 * ===========
 * The visitor picks their role once and the whole site filters to it (brief §3).
 *
 * The store is deliberately tiny and synchronous: one localStorage key, one
 * attribute on <html>, one event. Everything that reacts to a role — the take
 * shown on a milestone, the label in the picker, the cheat-sheet link — reads
 * the attribute or listens for the event. Nothing imports state from anything
 * else, so a page can use the role without pulling in the picker, and the
 * picker works on a page that renders no takes.
 *
 * Set on <html> rather than <body> so CSS can respond before first paint via
 * the inline bootstrap in Base.astro. Without that, a reader with a saved role
 * sees the general framing flash and then swap — the exact "which one is mine"
 * confusion the redesign exists to remove.
 */

export const ROLE_KEY = 'unaiverse:role';
export const ROLE_EVENT = 'unaiverse:rolechange';

/** The role with no takes bound to it — see GENERAL_ROLE in lib/taxonomy. */
export const GENERAL = 'curious';

/**
 * Valid ids, mirrored from lib/taxonomy rather than imported.
 *
 * This module is loaded as a client script from several pages; importing the
 * taxonomy would drag PERSONAS, ZONES, ORGANS, VENUES and their prose into
 * every one of those bundles to validate one string. The list is checked
 * against the source of truth at build time — see the assertion in
 * components/RolePicker.astro, which fails the build if the two drift.
 */
export const ROLE_IDS = [
  'curious',
  'peace-security',
  'development',
  'human-rights',
  'data-digital',
  'front-office',
  'opga',
  'builders',
  'missions',
] as const;

export type Role = (typeof ROLE_IDS)[number];

function valid(value: unknown): value is Role {
  return typeof value === 'string' && (ROLE_IDS as readonly string[]).includes(value);
}

/**
 * The stored role, or the general default.
 *
 * Private browsing and locked-down enterprise profiles throw on localStorage
 * access rather than returning null, and a thrown error here would take the
 * page's whole script with it. A visitor whose browser refuses to remember
 * things still gets a working site; they just get asked again next time.
 */
export function getRole(): Role {
  try {
    const saved = localStorage.getItem(ROLE_KEY);
    if (valid(saved)) return saved;
  } catch {
    /* storage unavailable — fall through to the default */
  }
  return GENERAL;
}

/** True once the visitor has actually chosen, as opposed to being defaulted. */
export function hasChosen(): boolean {
  try {
    return valid(localStorage.getItem(ROLE_KEY));
  } catch {
    return false;
  }
}

export function setRole(role: string): Role {
  const next = valid(role) ? role : GENERAL;
  try {
    localStorage.setItem(ROLE_KEY, next);
  } catch {
    /* not remembered, but still applied for this page view */
  }
  apply(next);
  return next;
}

/** Reflect the role onto the document and tell every listener. */
export function apply(role: Role): void {
  document.documentElement.dataset.role = role;
  document.dispatchEvent(new CustomEvent(ROLE_EVENT, { detail: { role } }));
}

/** Subscribe to role changes. Returns an unsubscribe function. */
export function onRoleChange(fn: (role: Role) => void): () => void {
  const handler = (e: Event) => fn((e as CustomEvent<{ role: Role }>).detail.role);
  document.addEventListener(ROLE_EVENT, handler);
  return () => document.removeEventListener(ROLE_EVENT, handler);
}
