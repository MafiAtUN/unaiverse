#!/usr/bin/env node
/**
 * The content quality report.
 *
 * Answers the question a reviewer actually has: what is safe to publish, what
 * needs a human, and what is missing. Written to `content/learn/content-report.md`
 * so it can be read in a pull request rather than only in a terminal.
 *
 *   npm run content:report
 */
import fs from 'node:fs';
import path from 'node:path';
import { PATHS, readJson, writeJson, parseArgs, COLOURS } from './lib/config.mjs';
import { termExplanationSchema } from '../../src/lib/learn/schema.ts';

const { flags } = parseArgs();
const taxonomy = readJson(PATHS.taxonomy);
const manifest = readJson(PATHS.manifest, { terms: {} });
const linkReport = readJson(PATHS.linkReport, null);
const categories = new Map(taxonomy.categories.map((c) => [c.id, c]));

function load(dir) {
  if (!fs.existsSync(dir)) return new Map();
  return new Map(
    fs
      .readdirSync(dir)
      .filter((f) => f.endsWith('.json') && !f.includes('.attempt-'))
      .map((f) => [f.replace(/\.json$/, ''), readJson(path.join(dir, f))]),
  );
}

const reviewed = load(PATHS.reviewed);
const generated = load(PATHS.generated);
const rejected = load(PATHS.rejected);

/** What the site would render: reviewed wins, generated is the waiting room. */
const corpus = new Map([...generated, ...reviewed]);

/**
 * A crude grade-level estimate (Flesch–Kincaid). Crude is the point: it is a
 * tripwire for a paragraph that drifted into journal prose, not a score to
 * optimise. Anything over 14 gets a human's eye.
 */
function readingGrade(text) {
  const sentences = (text.match(/[.!?]+/g) ?? ['.']).length;
  const words = text.split(/\s+/).filter(Boolean);
  if (!words.length) return 0;
  const syllables = words.reduce((n, w) => n + countSyllables(w), 0);
  return 0.39 * (words.length / sentences) + 11.8 * (syllables / words.length) - 15.59;
}

function countSyllables(word) {
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (w.length <= 3) return 1;
  const groups = w
    .replace(/(?:es|ed|[^laeiouy]e)$/, '')
    .match(/[aeiouy]{1,2}/g);
  return Math.max(1, groups?.length ?? 1);
}

const rows = [];
for (const [id, term] of corpus) {
  const parsed = termExplanationSchema.safeParse(term);
  const grade = readingGrade(`${term.oneSentence} ${term.plainExplanation}`);
  rows.push({
    id,
    category: term.categoryId,
    difficulty: term.difficulty,
    status: reviewed.has(id) ? 'reviewed' : 'awaiting review',
    schemaValid: parsed.success,
    grade: Math.round(grade * 10) / 10,
    hasVisual: Boolean(term.visual?.steps?.length),
    hasComponent: Boolean(term.visual?.component),
    hasUnExample: Boolean(term.unWorkplaceExample?.scenario),
    hasAnalogyLimit: Boolean(term.everydayAnalogy?.limitation),
    misconceptions: term.commonMisconceptions?.length ?? 0,
    related: term.relatedTermIds?.length ?? 0,
    resources: term.resources?.length ?? 0,
    unverifiedLinks: (term.resources ?? []).filter((r) => !r.verified).length,
    promptVersion: term.generation?.promptVersion ?? '—',
  });
}

const missing = taxonomy.terms.filter((t) => !corpus.has(t.id));
const orphans = [...corpus.values()].filter(
  (t) => !t.relatedTermIds.length && !t.prerequisiteTermIds.length,
);
const badPrereqs = [];
for (const [id, term] of corpus) {
  for (const p of term.prerequisiteTermIds ?? []) {
    if (!corpus.has(p)) badPrereqs.push(`${id} → ${p}`);
  }
}
const outliers = rows.filter((r) => r.grade > 14 || r.grade < 4);
const duplicateSentences = (() => {
  const seen = new Map();
  const dupes = [];
  for (const [id, t] of corpus) {
    const key = t.oneSentence.trim().toLowerCase();
    if (seen.has(key)) dupes.push(`${id} ≡ ${seen.get(key)}`);
    else seen.set(key, id);
  }
  return dupes;
})();

const byCategory = taxonomy.categories.map((c) => {
  const inCat = rows.filter((r) => r.category === c.id);
  return {
    id: c.id,
    name: c.name,
    planned: taxonomy.terms.filter((t) => t.categoryId === c.id).length,
    written: inCat.length,
    reviewed: inCat.filter((r) => r.status === 'reviewed').length,
  };
});

const tokens = manifest.tokenTotals ?? { promptTokens: 0, completionTokens: 0 };

const md = [];
md.push('# AI Literacy content report');
md.push('');
md.push(`Generated ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC by \`npm run content:report\`.`);
md.push('');
md.push('## Totals');
md.push('');
md.push('| Measure | Count |');
md.push('| --- | --- |');
md.push(`| Terms in taxonomy | ${taxonomy.terms.length} |`);
md.push(`| Terms written | ${corpus.size} |`);
md.push(`| Reviewed and published | ${reviewed.size} |`);
md.push(`| Awaiting review | ${corpus.size - reviewed.size} |`);
md.push(`| Rejected | ${rejected.size} |`);
md.push(`| Not yet written | ${missing.length} |`);
md.push(`| Schema failures | ${rows.filter((r) => !r.schemaValid).length} |`);
md.push(`| Missing visual specification | ${rows.filter((r) => !r.hasVisual).length} |`);
md.push(`| Hand-built interactive explainer | ${rows.filter((r) => r.hasComponent).length} |`);
md.push(`| Missing UN workplace example | ${rows.filter((r) => !r.hasUnExample).length} |`);
md.push(`| Missing analogy limitation | ${rows.filter((r) => !r.hasAnalogyLimit).length} |`);
md.push(`| Orphan terms (no prerequisites and no related terms) | ${orphans.length} |`);
md.push(`| Invalid prerequisite relationships | ${badPrereqs.length} |`);
md.push(`| Reading-level outliers (grade <4 or >14) | ${outliers.length} |`);
md.push(`| Duplicate one-sentence definitions | ${duplicateSentences.length} |`);
md.push(
  `| External links checked | ${linkReport ? `${linkReport.ok}/${linkReport.total} reachable` : 'not yet run'} |`,
);
md.push(`| Broken external links | ${linkReport ? linkReport.broken : '—'} |`);
md.push(
  `| Generation tokens | ${tokens.promptTokens.toLocaleString()} in / ${tokens.completionTokens.toLocaleString()} out |`,
);
md.push('');

// Which prompt each page was written under. A corpus split across versions is
// not a fault — it is the record of what `--regenerate-stale` would pick up.
const versions = new Map();
for (const r of rows) versions.set(r.promptVersion, (versions.get(r.promptVersion) ?? 0) + 1);
if (versions.size > 1 || !versions.has('—')) {
  md.push('### Written under which prompt version');
  md.push('');
  md.push('| Prompt version | Terms |');
  md.push('| --- | ---: |');
  for (const [v, n] of [...versions].sort()) md.push(`| ${v} | ${n} |`);
  md.push('');
  md.push('`npm run content:generate -- --regenerate-stale` rewrites anything below the current version.');
  md.push('');
}

md.push('## Coverage by category');
md.push('');
md.push('| Category | Planned | Written | Reviewed |');
md.push('| --- | ---: | ---: | ---: |');
for (const c of byCategory) {
  md.push(`| ${c.name} | ${c.planned} | ${c.written} | ${c.reviewed} |`);
}
md.push('');

if (linkReport?.results?.some((r) => !r.ok)) {
  md.push('## Unreachable links');
  md.push('');
  md.push('These are flagged "not verified" on the page rather than hidden. Fix or replace them in `content/learn/resources/curated.json`.');
  md.push('');
  for (const r of linkReport.results.filter((r) => !r.ok)) {
    md.push(`- \`${r.status || r.error}\` ${r.url}`);
  }
  md.push('');
}

if (outliers.length) {
  md.push('## Reading-level outliers');
  md.push('');
  md.push('Flesch–Kincaid grade estimate on the one-sentence definition plus the plain explanation. Target is roughly 8 to 10.');
  md.push('');
  for (const r of outliers.sort((a, b) => b.grade - a.grade)) {
    md.push(`- **${r.id}** — grade ${r.grade}`);
  }
  md.push('');
}

if (badPrereqs.length) {
  md.push('## Prerequisites pointing at unwritten terms');
  md.push('');
  for (const p of badPrereqs) md.push(`- ${p}`);
  md.push('');
}

if (duplicateSentences.length) {
  md.push('## Duplicate definitions');
  md.push('');
  for (const d of duplicateSentences) md.push(`- ${d}`);
  md.push('');
}

if (missing.length) {
  md.push('## Not yet written');
  md.push('');
  md.push(`${missing.length} term(s). Generate with \`npm run content:generate\`.`);
  md.push('');
  for (const c of taxonomy.categories) {
    const inCat = missing.filter((t) => t.categoryId === c.id);
    if (!inCat.length) continue;
    md.push(`**${c.name}** — ${inCat.map((t) => `\`${t.id}\``).join(', ')}`);
    md.push('');
  }
}

md.push('## Publication rule');
md.push('');
md.push('A term appears on the public site only when a file exists in `content/learn/reviewed/`. It gets there only through `npm run content:publish`, which refuses anything that fails schema validation. Everything in `content/learn/generated/` is a draft a model wrote and nobody has checked.');
md.push('');

writeJson(PATHS.manifest, { ...manifest, updatedAt: manifest.updatedAt ?? new Date().toISOString() });
fs.writeFileSync(PATHS.qualityReport, md.join('\n'));

if (flags.json) {
  console.log(JSON.stringify({ rows, byCategory, missing: missing.map((m) => m.id) }, null, 2));
} else {
  console.log(
    `${COLOURS.bold('content:report')} — ${corpus.size}/${taxonomy.terms.length} written · ` +
      `${COLOURS.green(`${reviewed.size} reviewed`)} · ${corpus.size - reviewed.size} awaiting review`,
  );
  console.log(COLOURS.dim(`→ ${path.relative(PATHS.root, PATHS.qualityReport)}`));
}
