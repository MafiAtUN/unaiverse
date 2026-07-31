#!/usr/bin/env node
/**
 * Generate term explanations with Azure OpenAI.
 *
 * Development-time only. The output is JSON on disk in `content/learn/generated/`,
 * which a human then reviews and promotes with `content:publish`. The public
 * site reads `content/learn/reviewed/` and nothing else, so an unreviewed page
 * cannot ship by accident and a credential cannot reach a browser.
 *
 *   npm run content:generate                        # everything not yet done
 *   npm run content:generate -- --term token        # one term
 *   npm run content:generate -- --category agents   # one category
 *   npm run content:generate -- --limit 10 --concurrency 4
 *   npm run content:generate -- --dry-run           # print the prompt, call nothing
 *   npm run content:generate -- --fixtures          # no credentials: use the recorded fixture
 *   npm run content:generate -- --term token --force        # overwrite an existing file
 *   npm run content:generate -- --regenerate-stale          # anything below PROMPT_VERSION
 *
 * `--force` is required to touch anything already reviewed. Reviewed content is
 * a human's work; a batch run must never silently overwrite it.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { PATHS, readJson, writeJson, parseArgs, ensureDirs, COLOURS } from './lib/config.mjs';
import { createClient, pool, AzureError } from './lib/azure.mjs';
import { PROMPT_VERSION, SYSTEM_PROMPT, buildTermPrompt } from './lib/prompt.mjs';
import { loadResourceInputs, buildResources, attachNotes } from './lib/resources.mjs';
import { TERM_RESPONSE_SCHEMA, stripNulls } from './lib/response-schema.mjs';
import { generatedTermSchema, VISUAL_COMPONENT_BY_TERM } from '../../src/lib/learn/schema.ts';

const { flags } = parseArgs();
ensureDirs();

const taxonomy = readJson(PATHS.taxonomy);
const categories = new Map(taxonomy.categories.map((c) => [c.id, c]));
const termsById = new Map(taxonomy.terms.map((t) => [t.id, t]));
const resourceInputs = loadResourceInputs();
const manifest = readJson(PATHS.manifest, { version: 1, promptVersion: PROMPT_VERSION, terms: {} });

/**
 * The Phase 2 essentials lead the queue. A run that is interrupted, rate-limited
 * or cancelled should still leave the site with the fifty terms a newcomer
 * actually needs, not fifty entries from the deep end of the optimiser chapter.
 */
const PRIORITY = [
  'artificial-intelligence', 'algorithm', 'model', 'data', 'machine-learning', 'deep-learning',
  'generative-ai', 'training', 'inference', 'neural-network', 'weight', 'bias-term',
  'loss-function', 'gradient', 'gradient-descent', 'learning-rate', 'backpropagation',
  'overfitting', 'underfitting', 'accuracy', 'precision', 'recall', 'large-language-model',
  'token', 'tokenisation', 'prompt', 'context-window', 'parameter', 'hallucination',
  'transformer', 'attention', 'embedding', 'vector-database', 'semantic-search',
  'retrieval-augmented-generation', 'fine-tuning', 'foundation-model', 'multimodal-model',
  'ai-agent', 'tool-use', 'human-in-the-loop', 'algorithmic-bias', 'explainability',
  'human-oversight', 'prompt-injection', 'deepfake', 'ai-safety', 'ai-ethics', 'ai-governance',
  'ai-divide',
];
const priorityRank = new Map(PRIORITY.map((id, i) => [id, i]));

function orderKey(t) {
  return [priorityRank.get(t.id) ?? 1000 + taxonomy.terms.indexOf(t), t.id];
}

// ── Which terms are we generating? ─────────────────────────────────────────
const isReviewed = (id) => fs.existsSync(path.join(PATHS.reviewed, `${id}.json`));
const isGenerated = (id) => fs.existsSync(path.join(PATHS.generated, `${id}.json`));

let targets = taxonomy.terms.slice();
if (flags.term) {
  const wanted = String(flags.term).split(',').map((s) => s.trim());
  targets = targets.filter((t) => wanted.includes(t.id));
  if (!targets.length) {
    console.error(COLOURS.red(`No such term id: ${flags.term}`));
    process.exit(1);
  }
} else if (flags.category) {
  targets = targets.filter((t) => t.categoryId === flags.category);
}

if (flags['regenerate-stale']) {
  targets = targets.filter((t) => (manifest.terms[t.id]?.promptVersion ?? '0') !== PROMPT_VERSION);
} else if (!flags.force) {
  // Never regenerate reviewed content unless asked (brief §12).
  targets = targets.filter((t) => !isReviewed(t.id) && !isGenerated(t.id));
}
if (flags.force && flags.term === undefined && !flags.category) {
  console.error(
    COLOURS.red('--force without --term or --category would overwrite the whole corpus. Refusing.'),
  );
  process.exit(1);
}

targets.sort((a, b) => {
  const [ar, aid] = orderKey(a);
  const [br, bid] = orderKey(b);
  return ar - br || aid.localeCompare(bid);
});

if (flags.limit) targets = targets.slice(0, Number(flags.limit));

if (!targets.length) {
  console.log(COLOURS.green('Nothing to generate. Everything is already generated or reviewed.'));
  process.exit(0);
}

// ── Prompt inputs ──────────────────────────────────────────────────────────
/**
 * Candidate ids the model may link to. Everything in the same category, plus
 * whatever the taxonomy already knows this term relates to. Supplying the list
 * is what makes "use valid ids" enforceable rather than hopeful.
 */
function candidatesFor(term) {
  const ids = new Set([
    ...taxonomy.terms.filter((t) => t.categoryId === term.categoryId).map((t) => t.id),
    ...(term.prerequisites ?? []),
    ...(term.confusedWith ?? []),
    // Terms that name this one as a prerequisite are natural "next steps".
    ...taxonomy.terms.filter((t) => (t.prerequisites ?? []).includes(term.id)).map((t) => t.id),
  ]);
  ids.delete(term.id);
  return [...ids].map((id) => {
    const t = termsById.get(id);
    const hint = (term.confusedWith ?? []).includes(id)
      ? 'often confused with this term'
      : (term.prerequisites ?? []).includes(id)
        ? 'prerequisite'
        : undefined;
    return { id, term: t.term, hint };
  });
}

function assemble(term, generated, resources) {
  const category = categories.get(term.categoryId);
  const validIds = new Set(taxonomy.terms.map((t) => t.id));
  const clean = (list) => [...new Set((list ?? []).filter((id) => validIds.has(id) && id !== term.id))];

  const visual = { ...generated.visual };
  const component = VISUAL_COMPONENT_BY_TERM[term.id];
  if (component) visual.component = component;

  const body = {
    id: term.id,
    slug: term.id,
    term: term.term,
    ...(term.acronym ? { acronym: term.acronym } : {}),
    aliases: term.aliases ?? [],
    categoryId: term.categoryId,
    subcategory: category.name,
    difficulty: term.difficulty,
    audiences: term.audiences ?? ['everyone'],
    prerequisiteTermIds: clean(term.prerequisites),
    relatedTermIds: clean(generated.relatedTermIds),
    oftenConfusedWith: clean([...(generated.oftenConfusedWith ?? []), ...(term.confusedWith ?? [])]),
    oneSentence: generated.oneSentence,
    plainExplanation: generated.plainExplanation,
    everydayAnalogy: generated.everydayAnalogy,
    visual,
    workedExample: generated.workedExample,
    unWorkplaceExample: generated.unWorkplaceExample,
    whyItMatters: generated.whyItMatters,
    whereYouMayHearIt: generated.whereYouMayHearIt,
    commonMisconceptions: generated.commonMisconceptions,
    simpleVsTechnical: generated.simpleVsTechnical,
    keyTakeaway: generated.keyTakeaway,
    quickCheck: generated.quickCheck,
    resources: attachNotes(resources, generated.resourceNotes),
    searchKeywords: [
      ...new Set(
        [
          ...(generated.searchKeywords ?? []),
          term.term.toLowerCase(),
          ...(term.aliases ?? []).map((a) => a.toLowerCase()),
          ...(term.acronym ? [term.acronym.toLowerCase()] : []),
        ].map((s) => s.trim()).filter(Boolean),
      ),
    ].slice(0, 20),
    ...(generated.contested ? { contested: generated.contested } : {}),
    contentVersion: PROMPT_VERSION,
    reviewed: false,
  };
  return body;
}

function hashOf(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, 16);
}

/** Strip a stray ```json fence, which a model occasionally emits despite instructions. */
function parseModelJson(text) {
  let t = text.trim();
  if (t.startsWith('```')) t = t.replace(/^```[a-z]*\s*/i, '').replace(/```\s*$/, '');
  const first = t.indexOf('{');
  const last = t.lastIndexOf('}');
  if (first > 0 || last < t.length - 1) t = t.slice(first, last + 1);
  return JSON.parse(t);
}

/** Turn a Zod failure into instructions a model can act on. */
function feedbackFrom(error, resourceCount) {
  const out = error.issues.slice(0, 12).map((i) => {
    const where = i.path.join('.') || '(root)';
    return `${where}: ${i.message}`;
  });
  out.push(
    `Reminder: resourceNotes must have exactly ${resourceCount} entries, one per supplied link, in order.`,
  );
  return out;
}

// ── Fixtures, for a machine with no credentials ────────────────────────────
function fixtureFor(term) {
  const file = path.join(PATHS.fixtures, `${term.id}.json`);
  if (fs.existsSync(file)) return readJson(file);
  const generic = path.join(PATHS.fixtures, '_generic.json');
  if (!fs.existsSync(generic)) {
    throw new Error(`No fixture for ${term.id} and no scripts/learn/fixtures/_generic.json`);
  }
  const template = fs.readFileSync(generic, 'utf8');
  return JSON.parse(
    template.replace(/__TERM__/g, term.term.replace(/"/g, '\\"')).replace(/__ID__/g, term.id),
  );
}

// ── Run ────────────────────────────────────────────────────────────────────
const useFixtures = Boolean(flags.fixtures);
const dryRun = Boolean(flags['dry-run']);
const concurrency = Number(flags.concurrency ?? 4);
const maxTokens = Number(flags['max-tokens'] ?? 16000);

let client = null;
if (!useFixtures && !dryRun) {
  try {
    client = createClient();
  } catch (error) {
    console.error(COLOURS.red(error.message));
    process.exit(1);
  }
}

console.log(
  `${COLOURS.bold(`Generating ${targets.length} term(s)`)}` +
    ` · prompt ${PROMPT_VERSION}` +
    ` · ${useFixtures ? 'fixtures' : dryRun ? 'dry run' : `deployment ${client.config.deployment}`}` +
    ` · concurrency ${concurrency}`,
);

const failures = [];
let done = 0;

const results = await pool(targets, concurrency, async (term) => {
  const category = categories.get(term.categoryId);
  const resources = buildResources(term, category, resourceInputs);
  const existing = isGenerated(term.id) ? readJson(path.join(PATHS.generated, `${term.id}.json`)) : null;

  let feedback = null;
  let attempts = 0;
  let lastError = null;

  for (let attempt = 1; attempt <= 3; attempt++) {
    attempts = attempt;
    const user = buildTermPrompt({
      taxonomyTerm: term,
      category,
      candidates: candidatesFor(term),
      resources,
      existing: flags.force ? existing : null,
      visualComponent: VISUAL_COMPONENT_BY_TERM[term.id],
      validationFeedback: feedback,
    });

    if (dryRun) {
      console.log(COLOURS.dim(`\n──── ${term.id} ────`));
      console.log(user);
      return { id: term.id, skipped: 'dry-run' };
    }

    let raw;
    let meta = { model: 'fixture', attempts: 1, usage: {} };
    if (useFixtures) {
      raw = JSON.stringify(fixtureFor(term));
    } else {
      const response = await client.chat({
        system: SYSTEM_PROMPT,
        user,
        maxTokens,
        jsonSchema: TERM_RESPONSE_SCHEMA,
      });
      raw = response.content;
      meta = response;
    }

    let candidate;
    try {
      candidate = stripNulls(parseModelJson(raw));
    } catch (error) {
      lastError = `model returned unparseable JSON: ${error.message}`;
      feedback = ['Your previous answer was not valid JSON. Return one JSON object and nothing else.'];
      continue;
    }

    const parsed = generatedTermSchema.safeParse(candidate);
    if (!parsed.success) {
      lastError = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
      feedback = feedbackFrom(parsed.error, resources.length);
      // Keep the rejected answer. Debugging a schema mismatch from the error
      // message alone is guesswork, and these files are also the evidence a
      // reviewer needs when a term keeps coming back wrong.
      writeJson(path.join(PATHS.rejected, `${term.id}.attempt-${attempt}.json`), {
        at: new Date().toISOString(),
        issues: parsed.error.issues.slice(0, 20),
        raw: candidate,
      });
      continue;
    }

    const body = assemble(term, parsed.data, resources);
    body.generation = {
      model: meta.model ?? 'unknown',
      deployment: useFixtures ? 'fixture' : client.config.deployment,
      promptVersion: PROMPT_VERSION,
      generatedAt: new Date().toISOString(),
      contentHash: hashOf({ ...body, generation: undefined }),
      attempts,
      promptTokens: meta.usage?.prompt_tokens,
      completionTokens: meta.usage?.completion_tokens,
    };

    writeJson(path.join(PATHS.generated, `${term.id}.json`), body);
    manifest.terms[term.id] = {
      status: 'generated',
      promptVersion: PROMPT_VERSION,
      contentHash: body.generation.contentHash,
      generatedAt: body.generation.generatedAt,
      attempts,
      model: body.generation.model,
      promptTokens: body.generation.promptTokens ?? 0,
      completionTokens: body.generation.completionTokens ?? 0,
    };
    done++;
    process.stdout.write(
      `${COLOURS.green('✓')} ${term.id}${attempts > 1 ? COLOURS.yellow(` (${attempts} attempts)`) : ''}  ${COLOURS.dim(`${done}/${targets.length}`)}\n`,
    );
    return { id: term.id, attempts };
  }

  failures.push({ id: term.id, error: lastError ?? 'unknown' });
  manifest.terms[term.id] = {
    status: 'failed',
    promptVersion: PROMPT_VERSION,
    error: String(lastError).slice(0, 400),
    attemptedAt: new Date().toISOString(),
  };
  process.stdout.write(`${COLOURS.red('✗')} ${term.id} — ${String(lastError).slice(0, 160)}\n`);
  return { id: term.id, failed: true };
});

for (const r of results) {
  if (!r.ok) {
    const message = r.error instanceof AzureError ? `${r.error.message} ${r.error.body ?? ''}` : String(r.error);
    failures.push({ id: '(unknown)', error: message });
    console.error(COLOURS.red(`✗ ${message}`));
  }
}

if (!dryRun) {
  manifest.promptVersion = PROMPT_VERSION;
  manifest.updatedAt = new Date().toISOString();
  const totals = Object.values(manifest.terms).reduce(
    (acc, t) => ({
      promptTokens: acc.promptTokens + (t.promptTokens ?? 0),
      completionTokens: acc.completionTokens + (t.completionTokens ?? 0),
    }),
    { promptTokens: 0, completionTokens: 0 },
  );
  manifest.tokenTotals = totals;
  writeJson(PATHS.manifest, manifest);

  console.log('');
  console.log(
    `${COLOURS.bold('Done.')} ${COLOURS.green(`${done} generated`)}` +
      (failures.length ? ` · ${COLOURS.red(`${failures.length} failed`)}` : '') +
      ` · tokens this corpus: ${totals.promptTokens.toLocaleString()} in / ${totals.completionTokens.toLocaleString()} out`,
  );
  if (failures.length) {
    writeJson(path.join(PATHS.root, 'content/learn/generation-failures.json'), {
      at: new Date().toISOString(),
      failures,
    });
    console.log(COLOURS.yellow('Failures written to content/learn/generation-failures.json'));
    console.log(COLOURS.dim('Re-run the same command to retry only what is missing.'));
  }
  console.log(COLOURS.dim('Next: npm run content:validate, then review and npm run content:publish'));
}
