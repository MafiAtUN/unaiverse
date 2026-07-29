/**
 * Copy the TimelineJS runtime out of node_modules and into public/.
 *
 * TimelineJS ships a prebuilt UMD bundle with no package entry point — no
 * `main`, no `module`, no `exports` — and its stylesheet reaches for icon fonts
 * with paths like `../js/../css/icons/tl-icons.woff2`, which only resolve if the
 * original `js/` + `css/` directory pair is preserved. So it is served as a
 * plain static asset rather than run through the bundler, and the layout below
 * is not rearrangeable.
 *
 * Regenerated on every dev/build (see package.json), so public/vendor/ is
 * gitignored: the version in package.json is the source of truth.
 */
import { cp, mkdir, rm, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'node_modules', '@knight-lab', 'timelinejs', 'dist');
const dest = join(root, 'public', 'vendor', 'timelinejs');

// Deliberately partial. The full dist is 8 MB — most of it source maps, 40-odd
// locale files and preset themes this site overrides anyway.
const ASSETS = [
  ['js/timeline.js', 'js/timeline.js'],
  ['js/timeline.js.LICENSE.txt', 'js/timeline.js.LICENSE.txt'],
  ['css/timeline.css', 'css/timeline.css'],
  ['css/icons', 'css/icons'],
];

try {
  await stat(src);
} catch {
  console.error(
    '[vendor-timeline] @knight-lab/timelinejs is not installed. Run `npm install` first.',
  );
  process.exit(1);
}

await rm(dest, { recursive: true, force: true });

for (const [from, to] of ASSETS) {
  const target = join(dest, to);
  await mkdir(dirname(target), { recursive: true });
  await cp(join(src, from), target, { recursive: true });
}

console.log(`[vendor-timeline] copied ${ASSETS.length} assets → public/vendor/timelinejs`);
