#!/usr/bin/env node
/**
 * Promote reviewed content from `generated/` to `reviewed/`.
 *
 * This is the gate. The site renders `content/learn/reviewed/` only, so nothing
 * a model wrote reaches a reader until a person has run this command for that
 * term. It refuses to promote anything that fails schema validation, and it
 * stamps `reviewed: true` plus the date, so the page can tell the reader when
 * a human last looked at it.
 *
 *   npm run content:publish -- --term token
 *   npm run content:publish -- --term token --by "M. Islam" --note "checked tokenizer claim"
 *   npm run content:publish -- --category foundations
 *   npm run content:publish -- --all                 # everything that validates
 *   npm run content:publish -- --term token --reject --note "analogy is wrong"
 *   npm run content:publish -- --list                # what is waiting for review
 *   npm run content:publish -- --unreview --all      # withdraw an unearned review claim
 *
 * Note the two different things `reviewed/` and `reviewed: true` mean. The
 * directory means "published, the site renders this". The flag means "a person
 * read it". A page can be the first without being the second, and when it is,
 * it says so.
 */
import fs from 'node:fs';
import path from 'node:path';
import { PATHS, readJson, writeJson, parseArgs, ensureDirs, COLOURS } from './lib/config.mjs';
import { termExplanationSchema } from '../../src/lib/learn/schema.ts';

const { flags } = parseArgs();
ensureDirs();

const taxonomy = readJson(PATHS.taxonomy);
const categoryOf = new Map(taxonomy.terms.map((t) => [t.id, t.categoryId]));
const manifest = readJson(PATHS.manifest, { terms: {} });

const pending = fs
  .readdirSync(PATHS.generated)
  .filter((f) => f.endsWith('.json') && !f.includes('.attempt-'))
  .map((f) => f.replace(/\.json$/, ''));

if (flags.list) {
  const reviewed = new Set(
    fs.existsSync(PATHS.reviewed) ? fs.readdirSync(PATHS.reviewed).map((f) => f.replace(/\.json$/, '')) : [],
  );
  const waiting = pending.filter((id) => !reviewed.has(id));
  console.log(`${COLOURS.bold(`${waiting.length} term(s) awaiting review`)} (${reviewed.size} already published)`);
  for (const id of waiting) console.log(`  ${id}  ${COLOURS.dim(categoryOf.get(id) ?? '?')}`);
  process.exit(0);
}

// ── Withdrawing a review claim ─────────────────────────────────────────────
if (flags.unreview) {
  const ids = flags.term
    ? String(flags.term).split(',').map((s) => s.trim())
    : fs.readdirSync(PATHS.reviewed).filter((f) => f.endsWith('.json')).map((f) => f.replace(/\.json$/, ''));
  let cleared = 0;
  for (const id of ids) {
    const file = path.join(PATHS.reviewed, `${id}.json`);
    if (!fs.existsSync(file)) continue;
    const body = readJson(file);
    if (!body.reviewed) continue;
    body.reviewed = false;
    delete body.lastReviewed;
    delete body.reviewerNotes;
    writeJson(file, body);
    manifest.terms[id] = { ...(manifest.terms[id] ?? {}), status: 'published-unreviewed' };
    delete manifest.terms[id].reviewedAt;
    delete manifest.terms[id].reviewer;
    cleared++;
  }
  manifest.updatedAt = new Date().toISOString();
  writeJson(PATHS.manifest, manifest);
  console.log(
    `${COLOURS.yellow(`${cleared} term(s) no longer claim to have been read by a person.`)}\n` +
      COLOURS.dim('They stay published. Their pages now say so instead of implying a review that did not happen.'),
  );
  process.exit(0);
}

let targets = [];
if (flags.term) targets = String(flags.term).split(',').map((s) => s.trim());
else if (flags.category) targets = pending.filter((id) => categoryOf.get(id) === flags.category);
else if (flags.all) targets = pending;
else {
  console.error(
    COLOURS.red('Choose what to publish: --term <id>, --category <id>, --all, or --list to see what is waiting.'),
  );
  process.exit(1);
}

const reviewer = typeof flags.by === 'string' ? flags.by : undefined;
const note = typeof flags.note === 'string' ? flags.note : undefined;
const today = new Date().toISOString().slice(0, 10);

let published = 0;
let rejected = 0;
const failures = [];

for (const id of targets) {
  const src = path.join(PATHS.generated, `${id}.json`);
  if (!fs.existsSync(src)) {
    failures.push(`${id}: nothing in content/learn/generated/`);
    continue;
  }
  const body = readJson(src);

  if (flags.reject) {
    writeJson(path.join(PATHS.rejected, `${id}.json`), {
      ...body,
      rejectedAt: new Date().toISOString(),
      rejectedBy: reviewer,
      reviewerNotes: note,
    });
    fs.rmSync(src);
    manifest.terms[id] = { ...(manifest.terms[id] ?? {}), status: 'rejected', rejectedAt: today, reviewerNotes: note };
    rejected++;
    console.log(`${COLOURS.yellow('↩')} ${id} rejected`);
    continue;
  }

  const candidate = {
    ...body,
    reviewed: true,
    lastReviewed: today,
    ...(note ? { reviewerNotes: note } : {}),
    ...(reviewer ? { reviewedBy: reviewer } : {}),
  };
  delete candidate.reviewedBy; // not in the schema; the note carries attribution

  const parsed = termExplanationSchema.safeParse(candidate);
  if (!parsed.success) {
    failures.push(
      `${id}: ${parsed.error.issues.slice(0, 3).map((i) => `${i.path.join('.')} ${i.message}`).join('; ')}`,
    );
    continue;
  }

  writeJson(path.join(PATHS.reviewed, `${id}.json`), parsed.data);
  manifest.terms[id] = {
    ...(manifest.terms[id] ?? {}),
    status: 'reviewed',
    reviewedAt: today,
    ...(reviewer ? { reviewer } : {}),
    ...(note ? { reviewerNotes: note } : {}),
  };
  published++;
  console.log(`${COLOURS.green('✓')} ${id} published`);
}

manifest.updatedAt = new Date().toISOString();
writeJson(PATHS.manifest, manifest);

console.log('');
console.log(
  `${COLOURS.bold('Done.')} ${published} published` +
    (rejected ? ` · ${rejected} rejected` : '') +
    (failures.length ? ` · ${COLOURS.red(`${failures.length} refused`)}` : ''),
);
for (const f of failures) console.log(`  ${COLOURS.red('✗')} ${f}`);
process.exit(failures.length ? 1 : 0);
