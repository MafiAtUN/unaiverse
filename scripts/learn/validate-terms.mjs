#!/usr/bin/env node
/**
 * Validate every generated and reviewed term.
 *
 * Runs with no credentials, so CI and any contributor can check the corpus.
 * Exits non-zero on an error, which is what makes "the site build cannot ship
 * broken content" true rather than aspirational.
 *
 *   npm run content:validate
 *   npm run content:validate -- --reviewed-only
 *   npm run content:validate -- --json
 */
import fs from 'node:fs';
import path from 'node:path';
import { PATHS, readJson, parseArgs, COLOURS } from './lib/config.mjs';
import { termExplanationSchema } from '../../src/lib/learn/schema.ts';

const { flags } = parseArgs();
const taxonomy = readJson(PATHS.taxonomy);
const categoryIds = new Set(taxonomy.categories.map((c) => c.id));
const taxonomyIds = new Set(taxonomy.terms.map((t) => t.id));

const errors = [];
const warnings = [];

function listDir(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.json') && !f.includes('.attempt-'))
    .map((f) => ({ id: f.replace(/\.json$/, ''), file: path.join(dir, f) }));
}

const sources = flags['reviewed-only']
  ? [{ label: 'reviewed', dir: PATHS.reviewed }]
  : [
      { label: 'reviewed', dir: PATHS.reviewed },
      { label: 'generated', dir: PATHS.generated },
    ];

/** id → the record that would actually be published (reviewed wins). */
const corpus = new Map();
for (const { label, dir } of sources) {
  for (const { id, file } of listDir(dir)) {
    let json;
    try {
      json = readJson(file);
    } catch (error) {
      errors.push({ id, where: label, message: `unparseable JSON: ${error.message}` });
      continue;
    }
    const parsed = termExplanationSchema.safeParse(json);
    if (!parsed.success) {
      for (const issue of parsed.error.issues.slice(0, 8)) {
        errors.push({ id, where: label, message: `${issue.path.join('.') || '(root)'}: ${issue.message}` });
      }
      continue;
    }
    if (!corpus.has(id)) corpus.set(id, { ...parsed.data, __source: label });
  }
}

// ── Cross-record integrity ─────────────────────────────────────────────────
const publishedIds = new Set(corpus.keys());

for (const [id, term] of corpus) {
  const where = term.__source;

  if (term.id !== id) errors.push({ id, where, message: `id "${term.id}" does not match filename` });
  if (term.slug !== id) errors.push({ id, where, message: `slug "${term.slug}" does not match filename` });
  if (!taxonomyIds.has(id)) errors.push({ id, where, message: 'not present in taxonomy.json' });
  if (!categoryIds.has(term.categoryId)) {
    errors.push({ id, where, message: `unknown categoryId "${term.categoryId}"` });
  }

  // A link to a term that is not published yet renders as a dead chip.
  for (const [field, list] of [
    ['prerequisiteTermIds', term.prerequisiteTermIds],
    ['relatedTermIds', term.relatedTermIds],
    ['oftenConfusedWith', term.oftenConfusedWith],
  ]) {
    for (const ref of list) {
      if (!taxonomyIds.has(ref)) {
        errors.push({ id, where, message: `${field} → "${ref}" is not a taxonomy id` });
      } else if (!publishedIds.has(ref)) {
        warnings.push({ id, where, message: `${field} → "${ref}" exists but is not written yet` });
      }
      if (ref === id) errors.push({ id, where, message: `${field} links to itself` });
    }
  }

  // The three things whose absence would make the page teach something wrong.
  if (!term.everydayAnalogy.limitation?.trim()) {
    errors.push({ id, where, message: 'analogy has no stated limitation' });
  }
  if (!term.visual.accessibilityDescription?.trim()) {
    errors.push({ id, where, message: 'visual has no screen-reader alternative' });
  }
  if (!term.visual.reducedMotionDescription?.trim()) {
    errors.push({ id, where, message: 'visual has no reduced-motion alternative' });
  }

  // Anthropomorphism sweep. Not a hard error — "the model knows" is sometimes
  // legitimately quoted or explicitly corrected — but a reviewer should look.
  const prose = [term.oneSentence, term.plainExplanation, term.keyTakeaway, term.whyItMatters].join(' ');
  const anthro = prose.match(
    /\b(the model|the system|the AI|it)\s+(understands|thinks|knows|believes|wants|decides|realises|feels)\b/gi,
  );
  if (anthro) {
    warnings.push({ id, where, message: `possible anthropomorphism: "${anthro[0]}"` });
  }

  // A quiz whose "correct" option is not defensible is worse than no quiz.
  if (term.quickCheck.options.length < 3) {
    errors.push({ id, where, message: 'quick check needs at least three options' });
  }

  for (const r of term.resources) {
    if (!/^https?:\/\//.test(r.url)) errors.push({ id, where, message: `bad resource URL: ${r.url}` });
  }

  if (term.reviewed && !term.lastReviewed) {
    warnings.push({ id, where, message: 'marked reviewed but has no lastReviewed date' });
  }
}

// Duplicate prose across terms usually means the generator produced a template.
const seenSentences = new Map();
for (const [id, term] of corpus) {
  const key = term.oneSentence.trim().toLowerCase();
  if (seenSentences.has(key)) {
    warnings.push({ id, where: term.__source, message: `identical oneSentence to "${seenSentences.get(key)}"` });
  } else seenSentences.set(key, id);
}

// ── Report ─────────────────────────────────────────────────────────────────
if (flags.json) {
  console.log(JSON.stringify({ checked: corpus.size, errors, warnings }, null, 2));
} else {
  console.log(`${COLOURS.bold('content:validate')} — ${corpus.size} term(s) checked`);
  for (const e of errors) console.log(`  ${COLOURS.red('error')} ${e.id} [${e.where}] ${e.message}`);
  for (const w of warnings.slice(0, 40)) {
    console.log(`  ${COLOURS.yellow('warn ')} ${w.id} [${w.where}] ${w.message}`);
  }
  if (warnings.length > 40) console.log(COLOURS.dim(`  …and ${warnings.length - 40} more warnings`));
  console.log('');
  console.log(
    errors.length
      ? COLOURS.red(`${errors.length} error(s), ${warnings.length} warning(s)`)
      : COLOURS.green(`No errors. ${warnings.length} warning(s).`),
  );
}

process.exit(errors.length ? 1 : 0);
