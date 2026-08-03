#!/usr/bin/env node
/**
 * Spread the examples across the duty stations instead of one.
 *
 *   npm run content:settings -- --audit    show every change, write nothing
 *   npm run content:settings               apply
 *
 * ── The problem ──────────────────────────────────────────────────────────
 * Of the 154 place names in the 307 shipped terms, 75 were Nairobi: 49%,
 * against 2 for New York and 3 for Vienna. Nobody chose that. It is what a
 * language model reaches for when a prompt asks it to sound global, and each
 * term was written on its own with no view of the other 306.
 *
 * It matters more than it looks. The stories where something goes wrong — the
 * clerk filling in details from memory, the technician taken in by a planted
 * instruction, the exam room where someone cheats — landed in the same place
 * over and over. A colleague at UNON opening five pages meets their own duty
 * station as the setting for carelessness five times, and the site is telling
 * them something it never meant to say. Since the redesign puts the everyday
 * example first on every term page, this is now the first thing a reader sees.
 *
 * ── Why a script and not another model pass ──────────────────────────────
 * The voice pass already ran, and this is what it produced: it edits one term
 * at a time and cannot see a distribution. Balance is a property of the whole
 * corpus, so it needs something that can hold the whole corpus in mind. A
 * deterministic rotation can guarantee what a per-term prompt can only ask for.
 *
 * The city is a backdrop and never load-bearing: no explanation depends on
 * which duty station it happens in. That is exactly what makes this safe to do
 * mechanically — and the two cases where it would not be safe are skipped, see
 * `impliesGeography`.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const DIRS = [
  path.join(ROOT, 'content', 'learn', 'reviewed'),
  path.join(ROOT, 'content', 'learn', 'generated'),
];
const audit = process.argv.includes('--audit');

/**
 * Real UN duty stations, headquarters and field together.
 *
 * Ordered so the rotation alternates between the two rather than running
 * through all the headquarters first: a reader browsing alphabetically should
 * not find five Genevas in a row either.
 */
const STATIONS = [
  'Geneva', 'Nairobi', 'New York', 'Bangkok', 'Vienna', 'Amman',
  'Rome', 'Santiago', 'Addis Ababa', 'Copenhagen', 'Beirut', 'Dakar',
  'Bonn', 'Panama City', 'Kathmandu', 'Bogotá', 'Lima', 'Arusha',
];

const CITY = /\b(Nairobi|Bangkok|Bogotá|Bogota|Geneva|New York|Vienna|Lima|Arusha|Addis Ababa|Amman|Dhaka|Manila|Jakarta|Accra|Dakar|Kigali|Cairo|Rome|Copenhagen|Santiago|Kathmandu|Beirut|Panama City)\b/g;

/** Fields a reader actually sees. Provenance and keywords are left alone. */
const FIELDS = [
  ['everydayAnalogy', 'title'],
  ['everydayAnalogy', 'story'],
  ['workedExample', 'scenario'],
  ['workedExample', 'input'],
  ['unWorkplaceExample', 'scenario'],
  ['unWorkplaceExample', 'relevance'],
  ['unWorkplaceExample', 'caution'],
  ['plainExplanation'],
  ['whyItMatters'],
];

/**
 * Two cities close together, joined by a word that makes them a route.
 *
 * "driving between Nairobi and Arusha" is a real 270 km road. Swapping the
 * ends for Copenhagen and Panama City turns a grounded detail into nonsense,
 * and the point of this script is to remove an unintended message, not to add
 * an absurdity. Terms like this keep whatever they already had.
 */
function impliesGeography(text) {
  return /\b(between|from|to|drive|driving|flight|flying|travel\w*|border|road|route)\b[^.]{0,40}\b(Nairobi|Bangkok|Bogotá|Geneva|New York|Vienna|Lima|Arusha|Amman|Rome|Santiago|Addis Ababa|Copenhagen|Beirut|Dakar|Bonn|Kathmandu)\b[^.]{0,25}\band\b/i.test(
    text,
  );
}

function seedOf(id) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h);
}

const read = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const getIn = (o, keys) => keys.reduce((cur, k) => (cur && typeof cur === 'object' ? cur[k] : undefined), o);
const setIn = (o, keys, v) => {
  let cur = o;
  for (const k of keys.slice(0, -1)) cur = cur?.[k];
  if (cur) cur[keys.at(-1)] = v;
};

// ── Pass 1: decide, from the whole corpus at once ────────────────────────
const source = DIRS.find((d) => fs.existsSync(d));
const ids = fs.readdirSync(source).filter((f) => f.endsWith('.json')).map((f) => f.replace(/\.json$/, '')).sort();

const plan = new Map(); // id → Map(oldCity → newCity)
let skipped = [];
let cursor = 0;

for (const id of ids) {
  const term = read(path.join(source, `${id}.json`));
  const text = FIELDS.map((f) => getIn(term, f) ?? '').join(' ');
  const found = [...new Set(text.match(CITY) ?? [])];
  if (!found.length) continue;

  if (impliesGeography(text)) {
    skipped.push(id);
    continue;
  }

  // Distinct replacements per term, walked around the ring so the corpus as a
  // whole comes out even rather than each term being independently random.
  const mapping = new Map();
  const start = seedOf(id) % STATIONS.length;
  for (const [i, city] of found.entries()) {
    mapping.set(city, STATIONS[(start + cursor + i * 5) % STATIONS.length]);
  }
  cursor += found.length;
  plan.set(id, mapping);
}

// ── Pass 2: apply ────────────────────────────────────────────────────────
let changed = 0;
let edits = 0;
const after = new Map();

for (const [id, mapping] of plan) {
  let touched = false;

  for (const dir of DIRS) {
    const file = path.join(dir, `${id}.json`);
    if (!fs.existsSync(file)) continue;
    const term = read(file);

    for (const keys of FIELDS) {
      const value = getIn(term, keys);
      if (typeof value !== 'string' || !value) continue;
      const next = value.replace(CITY, (m) => mapping.get(m) ?? m);
      if (next !== value) {
        if (dir === DIRS[0]) {
          edits++;
          if (audit) {
            const m = next.match(CITY);
            console.log(`  ${id}.${keys.join('.')}: ${[...mapping].map(([a, b]) => `${a}→${b}`).join(', ')}`);
          }
        }
        setIn(term, keys, next);
        touched = true;
      }
    }

    if (touched && !audit) fs.writeFileSync(file, `${JSON.stringify(term, null, 2)}\n`);
  }

  if (touched) {
    changed++;
    for (const city of mapping.values()) after.set(city, (after.get(city) ?? 0) + 1);
  }
}

console.log(
  `\n${audit ? '[audit] would change' : 'changed'} ${changed} term(s), ${edits} field(s)` +
    `${skipped.length ? `, skipped ${skipped.length} with a real route in them (${skipped.join(', ')})` : ''}`,
);
console.log('\nResulting distribution:');
for (const [city, n] of [...after].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${city.padEnd(13)} ${String(n).padStart(3)}  ${'█'.repeat(n)}`);
}
