/**
 * COPY TO CLIPBOARD — one delegated listener for the whole document.
 *
 * Lifted out of CopyButton.astro when search results grew copy buttons of
 * their own: those buttons are created after the page has loaded, so anything
 * that binds per element at startup would miss them. A single listener on
 * `document` handles both — buttons rendered at build time and buttons that
 * appear when someone types.
 *
 * Import it for the side effect (`import '../scripts/copy'`). Astro bundles
 * the module once no matter how many components ask for it, so the listener
 * is attached exactly once.
 */

/**
 * navigator.clipboard needs a secure context. The site is served over HTTPS
 * from GitHub Pages so that is the live path, but `astro dev` on a bare IP and
 * any future intranet mirror are not secure contexts, and a copy button that
 * silently does nothing is worse than one that never appeared.
 */
async function write(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to the selection path */
  }

  try {
    const scratch = document.createElement('textarea');
    scratch.value = text;
    // Off-screen rather than hidden: a display:none textarea cannot be
    // selected, and the selection is the whole mechanism here.
    scratch.setAttribute('readonly', '');
    scratch.style.cssText = 'position:fixed;top:-9999px;opacity:0';
    document.body.append(scratch);
    scratch.select();
    const ok = document.execCommand('copy');
    scratch.remove();
    return ok;
  } catch {
    return false;
  }
}

const timers = new WeakMap<HTMLElement, number>();

document.addEventListener('click', async (e) => {
  const button = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-copy]');
  if (!button) return;

  const ok = await write(button.dataset.copy ?? '');
  const said = button.querySelector<HTMLElement>('[data-copy-said]');

  if (ok) button.dataset.copied = '';
  if (said) said.textContent = ok ? 'Copied' : 'Press ⌘C';

  clearTimeout(timers.get(button));
  timers.set(
    button,
    window.setTimeout(() => {
      delete button.dataset.copied;
      if (said) said.textContent = '';
    }, 2000),
  );
});

export {};
