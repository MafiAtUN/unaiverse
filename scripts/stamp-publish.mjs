/**
 * Stamp a publish.
 *
 *   npm run publish:stamp          record the corpus as published today
 *   npm run publish:stamp -- --check   report what would be badged, change nothing
 *
 * The "new" and "updated" badges on the timeline and the agenda are computed
 * against `content/publish-log.json`, which this writes. Run it when a batch
 * of content changes goes live, and commit the result — that is the act that
 * clears the badges for readers who have now had a chance to see them.
 *
 * Deliberately not wired into `prebuild`. If it ran on every build the badges
 * would clear themselves the moment they were earned, and J3's delegate would
 * never see one.
 */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { hashMarkdown } from '../src/lib/publish-hash.ts';

const MILESTONES = path.join(process.cwd(), 'content', 'milestones');
const LOG = path.join(process.cwd(), 'content', 'publish-log.json');

const check = process.argv.includes('--check');

const today = new Date().toISOString().slice(0, 10);

let previous = { publishedAt: today, entries: {} };
try {
  previous = JSON.parse(await readFile(LOG, 'utf8'));
} catch {
  console.log('[stamp] no publish log yet — creating a baseline');
}

const files = (await readdir(MILESTONES)).filter((f) => f.endsWith('.md'));
const entries = {};
const added = [];
const changed = [];

for (const file of files.sort()) {
  const id = file.replace(/\.md$/, '');
  const hash = hashMarkdown(await readFile(path.join(MILESTONES, file), 'utf8'));
  const known = previous.entries?.[id];

  if (!known) added.push(id);
  else if (known.hash !== hash) changed.push(id);

  entries[id] = { hash, firstSeen: known?.firstSeen ?? today };
}

const removed = Object.keys(previous.entries ?? {}).filter((id) => !entries[id]);

console.log(
  `[stamp] ${files.length} milestones · ${added.length} new · ${changed.length} updated` +
    (removed.length ? ` · ${removed.length} removed` : ''),
);
for (const id of [...added.map((i) => `  + ${i}`), ...changed.map((i) => `  ~ ${i}`)]) {
  console.log(id);
}

if (check) {
  const dirty = added.length + changed.length + removed.length;
  console.log(dirty ? `[stamp] ${dirty} item(s) would be badged` : '[stamp] nothing has changed');
  process.exit(0);
}

await writeFile(LOG, `${JSON.stringify({ publishedAt: today, entries }, null, 2)}\n`);
console.log(`[stamp] wrote ${path.relative(process.cwd(), LOG)} at ${today}`);
