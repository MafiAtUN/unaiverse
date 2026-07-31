#!/usr/bin/env node
/**
 * Adversarial second-model review.
 *
 * A different model from the one that wrote the corpus reads each page looking
 * for what is wrong, and may rewrite a bounded set of fields. It CANNOT mark
 * anything reviewed: `reviewed: true` means a person read it, and this is not
 * a person. Output goes to `machineReview` and the site labels it as such.
 *
 *   npm run content:review -- --term weight --audit     # report, change nothing
 *   npm run content:review -- --term weight             # apply the fixes it can justify
 *   npm run content:review -- --limit 50 --concurrency 6
 *   npm run content:review -- --errors-only             # only apply ERROR-severity fixes
 *   npm run content:review -- --reviewer gpt-5.5        # a third opinion
 *
 * Applies to `content/learn/reviewed/` when a term is published there, else to
 * `content/learn/generated/`. Every rewrite is re-validated against the same
 * Zod schema the site uses, and rejected if it does not fit.
 */
import fs from 'node:fs';
import path from 'node:path';
import { PATHS, readJson, writeJson, parseArgs, ensureDirs, COLOURS, loadEnv } from './lib/config.mjs';
import { createClient, pool } from './lib/azure.mjs';
import {
  REVIEW_PROMPT_VERSION,
  REVIEW_SYSTEM_PROMPT,
  buildReviewPrompt,
  REVIEW_RESPONSE_SCHEMA,
} from './lib/review-prompt.mjs';
import { stripNulls } from './lib/response-schema.mjs';
import { termExplanationSchema } from '../../src/lib/learn/schema.ts';

const { flags } = parseArgs();
ensureDirs();
loadEnv();

const taxonomy = readJson(PATHS.taxonomy);
const categories = new Map(taxonomy.categories.map((c) => [c.id, c]));

/** Reviewer defaults to gpt-5.6-sol: newer than the writer, and not the writer. */
const reviewerDeployment =
  (typeof flags.reviewer === 'string' && flags.reviewer) ||
  process.env.AZURE_OPENAI_DEPLOYMENT_GPT56_SOL ||
  process.env.AZURE_OPENAI_DEPLOYMENT_GPT55 ||
  process.env.AZURE_OPENAI_DEPLOYMENT;

const auditOnly = Boolean(flags.audit);
const errorsOnly = Boolean(flags['errors-only']);
const concurrency = Number(flags.concurrency ?? 6);

/** Where a term currently lives. Reviewed wins; that is what the site renders. */
function locate(id) {
  const reviewed = path.join(PATHS.reviewed, `${id}.json`);
  if (fs.existsSync(reviewed)) return reviewed;
  const generated = path.join(PATHS.generated, `${id}.json`);
  if (fs.existsSync(generated)) return generated;
  return null;
}

let targets = taxonomy.terms.map((t) => t.id).filter((id) => locate(id));
if (flags.term) {
  const wanted = String(flags.term).split(',').map((s) => s.trim());
  targets = targets.filter((id) => wanted.includes(id));
} else if (flags.category) {
  const inCat = new Set(taxonomy.terms.filter((t) => t.categoryId === flags.category).map((t) => t.id));
  targets = targets.filter((id) => inCat.has(id));
}
if (!flags.force && !flags.term) {
  // Do not re-review what this prompt version has already looked at.
  targets = targets.filter((id) => {
    const doc = readJson(locate(id));
    return doc.machineReview?.promptVersion !== REVIEW_PROMPT_VERSION;
  });
}
if (flags.limit) targets = targets.slice(0, Number(flags.limit));

if (!targets.length) {
  console.log(COLOURS.green('Nothing to review. Use --force to re-review.'));
  process.exit(0);
}

// The neighbours a term claims to be distinct from, so the reviewer can check.
const oneLiners = new Map();
for (const t of taxonomy.terms) {
  const file = locate(t.id);
  if (file) oneLiners.set(t.id, readJson(file).oneSentence);
}

let client;
try {
  client = createClient();
} catch (error) {
  console.error(COLOURS.red(error.message));
  process.exit(1);
}
// Point the client at the reviewer deployment rather than the writer's.
process.env.AZURE_OPENAI_DEPLOYMENT = reviewerDeployment;
client = createClient();

console.log(
  `${COLOURS.bold(`Reviewing ${targets.length} term(s)`)} with ${COLOURS.yellow(reviewerDeployment)}` +
    ` · review prompt ${REVIEW_PROMPT_VERSION}` +
    ` · ${auditOnly ? COLOURS.dim('audit only, nothing will be written') : errorsOnly ? 'applying ERROR fixes only' : 'applying fixes'}` +
    ` · concurrency ${concurrency}`,
);
console.log(
  COLOURS.dim('This does not mark anything reviewed. `reviewed: true` means a person read it.'),
);
console.log('');

/** Map the reviewer's flat correction keys onto the nested record. */
function applyCorrections(doc, corrected, allowed) {
  const applied = [];
  const set = (key, fn) => {
    if (corrected[key] === undefined || corrected[key] === null) return;
    if (!allowed.has(key)) return;
    fn(corrected[key]);
    applied.push(key);
  };

  set('oneSentence', (v) => (doc.oneSentence = v));
  set('plainExplanation', (v) => (doc.plainExplanation = v));
  set('whyItMatters', (v) => (doc.whyItMatters = v));
  set('keyTakeaway', (v) => (doc.keyTakeaway = v));
  set('analogyLimitation', (v) => (doc.everydayAnalogy.limitation = v));
  set('workedExampleResult', (v) => (doc.workedExample.result = v));
  set('unWorkplaceExampleCaution', (v) => (doc.unWorkplaceExample.caution = v));
  set('simpleVsTechnicalSimple', (v) => (doc.simpleVsTechnical.simple = v));
  set('simpleVsTechnicalTechnical', (v) => (doc.simpleVsTechnical.technical = v));
  set('quickCheckExplanation', (v) => (doc.quickCheck.explanation = v));
  set('quickCheckCorrectOptionIndex', (v) => (doc.quickCheck.correctOptionIndex = v));

  return applied;
}

const summary = { pass: 0, revise: 0, reject: 0, failed: 0 };
const allIssues = [];
let done = 0;

const results = await pool(targets, concurrency, async (id) => {
  const file = locate(id);
  const doc = readJson(file);
  const meta = taxonomy.terms.find((t) => t.id === id);

  const neighbours = [...new Set([...(doc.oftenConfusedWith ?? []), ...(meta?.confusedWith ?? [])])]
    .map((n) => ({ term: taxonomy.terms.find((t) => t.id === n)?.term ?? n, oneSentence: oneLiners.get(n) }))
    .filter((n) => n.oneSentence);

  const response = await client.chat({
    system: REVIEW_SYSTEM_PROMPT,
    user: buildReviewPrompt({ term: doc, neighbours, category: categories.get(doc.categoryId) }),
    maxTokens: 16000,
    jsonSchema: REVIEW_RESPONSE_SCHEMA,
  });

  let verdictBody;
  try {
    verdictBody = stripNulls(JSON.parse(response.content));
  } catch {
    summary.failed++;
    console.log(`${COLOURS.red('✗')} ${id} — reviewer returned unparseable JSON`);
    return null;
  }

  const issues = (verdictBody.issues ?? []).map((i) => ({
    field: String(i.field).slice(0, 80),
    severity: i.severity,
    problem: String(i.problem).slice(0, 600),
    ...(i.fix ? { fix: String(i.fix).slice(0, 600) } : {}),
  }));
  for (const i of issues) allIssues.push({ id, ...i });

  const errors = issues.filter((i) => i.severity === 'error');
  const warnings = issues.filter((i) => i.severity === 'warning');
  summary[verdictBody.verdict] = (summary[verdictBody.verdict] ?? 0) + 1;

  let applied = [];
  if (!auditOnly && verdictBody.corrected) {
    // Which fields we are willing to take. In --errors-only mode a rewrite is
    // only accepted if an ERROR was raised against that field.
    const allowed = new Set(Object.keys(verdictBody.corrected));
    if (errorsOnly) {
      const errorFields = new Set(errors.map((e) => e.field));
      for (const key of [...allowed]) {
        const touchesError = [...errorFields].some((f) => key.toLowerCase().includes(f.toLowerCase().split('.')[0]) || f.toLowerCase().includes(key.toLowerCase()));
        if (!touchesError) allowed.delete(key);
      }
    }

    const candidate = structuredClone(doc);
    applied = applyCorrections(candidate, verdictBody.corrected, allowed);

    if (applied.length) {
      candidate.machineReview = {
        model: response.model,
        deployment: reviewerDeployment,
        promptVersion: REVIEW_PROMPT_VERSION,
        reviewedAt: new Date().toISOString(),
        verdict: verdictBody.verdict,
        issues,
        applied,
      };
      // A rewrite that breaks the schema is discarded, not shipped.
      const parsed = termExplanationSchema.safeParse(candidate);
      if (parsed.success) {
        writeJson(file, parsed.data);
      } else {
        console.log(
          `${COLOURS.yellow('!')} ${id} — reviewer rewrite rejected by the schema (${parsed.error.issues[0].path.join('.')}), keeping the original`,
        );
        applied = [];
      }
    }
  }

  if (!applied.length) {
    // Still record that the review happened, even when nothing changed.
    doc.machineReview = {
      model: response.model,
      deployment: reviewerDeployment,
      promptVersion: REVIEW_PROMPT_VERSION,
      reviewedAt: new Date().toISOString(),
      verdict: verdictBody.verdict,
      issues,
      applied: [],
    };
    if (!auditOnly) {
      const parsed = termExplanationSchema.safeParse(doc);
      if (parsed.success) writeJson(file, parsed.data);
    }
  }

  done++;
  const mark =
    verdictBody.verdict === 'reject'
      ? COLOURS.red('✗')
      : verdictBody.verdict === 'revise'
        ? COLOURS.yellow('~')
        : COLOURS.green('✓');
  console.log(
    `${mark} ${id.padEnd(38)} ${verdictBody.verdict.padEnd(7)} ` +
      `${errors.length}E ${warnings.length}W` +
      (applied.length ? COLOURS.green(` · rewrote ${applied.join(', ')}`) : '') +
      COLOURS.dim(`  ${done}/${targets.length}`),
  );

  return { id, verdict: verdictBody.verdict, issues, applied };
});

for (const r of results) {
  if (!r.ok) {
    summary.failed++;
    console.error(COLOURS.red(`✗ ${r.error?.message ?? r.error}`));
  }
}

// ── Report ─────────────────────────────────────────────────────────────────
const reportPath = path.join(PATHS.root, 'content/learn/review-report.md');
const errors = allIssues.filter((i) => i.severity === 'error');
const warnings = allIssues.filter((i) => i.severity === 'warning');

const md = ['# Second-model review report', ''];
md.push(
  `Generated ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC by \`npm run content:review\`, ` +
    `using **${reviewerDeployment}** against content written by a different model.`,
);
md.push('');
md.push('**This is not human review.** A model reviewing a model catches arithmetic, circular definitions, indefensible quiz answers and blurred distinctions. It does not catch a confidently wrong account of how something works. `reviewed: true` still means a person read the page.');
md.push('');
md.push('| Verdict | Terms |');
md.push('| --- | ---: |');
md.push(`| pass | ${summary.pass ?? 0} |`);
md.push(`| revise | ${summary.revise ?? 0} |`);
md.push(`| reject | ${summary.reject ?? 0} |`);
md.push(`| reviewer failed | ${summary.failed} |`);
md.push('');
md.push(`Issues raised: **${errors.length} errors**, ${warnings.length} warnings, ${allIssues.length - errors.length - warnings.length} nits.`);
md.push('');

if (errors.length) {
  md.push('## Errors');
  md.push('');
  md.push('Things the reviewer says are false or indefensible. Each needs a human decision.');
  md.push('');
  for (const i of errors) {
    md.push(`- **${i.id}** \`${i.field}\` — ${i.problem}${i.fix ? `  \n  *Proposed:* ${i.fix}` : '  \n  *No fix proposed: a human must check this.*'}`);
  }
  md.push('');
}

if (warnings.length) {
  md.push('## Warnings');
  md.push('');
  for (const i of warnings.slice(0, 120)) {
    md.push(`- **${i.id}** \`${i.field}\` — ${i.problem}`);
  }
  if (warnings.length > 120) md.push(`- …and ${warnings.length - 120} more`);
  md.push('');
}

fs.writeFileSync(reportPath, md.join('\n'));

console.log('');
console.log(
  `${COLOURS.bold('Done.')} ${COLOURS.green(`${summary.pass ?? 0} pass`)} · ` +
    `${COLOURS.yellow(`${summary.revise ?? 0} revise`)} · ${COLOURS.red(`${summary.reject ?? 0} reject`)}` +
    (summary.failed ? ` · ${summary.failed} reviewer failures` : ''),
);
console.log(`${errors.length} error(s), ${warnings.length} warning(s) → ${path.relative(PATHS.root, reportPath)}`);
if (!auditOnly) console.log(COLOURS.dim('Re-run npm run content:validate and npm test before committing.'));
