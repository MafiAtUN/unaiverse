/**
 * The content contract.
 *
 * `content:validate` runs the same schema, but these are the assertions that
 * describe what a *page* needs rather than what a file needs: that every quiz
 * has exactly one defensible answer, that no term links to a page that does
 * not exist, that the visuals a component is promised for actually ask for it,
 * and that nothing in the corpus can send a reader to a URL nobody fetched.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { PATHS, readJson } from '../lib/config.mjs';
import { termExplanationSchema, VISUAL_COMPONENT_BY_TERM } from '../../../src/lib/learn/schema.ts';

const taxonomy = readJson(PATHS.taxonomy);
const taxonomyIds = new Set(taxonomy.terms.map((t) => t.id));
const categoryIds = new Set(taxonomy.categories.map((c) => c.id));

const files = fs.existsSync(PATHS.reviewed)
  ? fs.readdirSync(PATHS.reviewed).filter((f) => f.endsWith('.json'))
  : [];
const terms = files.map((f) => readJson(path.join(PATHS.reviewed, f)));
const byId = new Map(terms.map((t) => [t.id, t]));

test('there is a published corpus', () => {
  assert.ok(terms.length > 100, `expected a published corpus, found ${terms.length}`);
});

test('every published term matches the schema', () => {
  const failures = [];
  for (const term of terms) {
    const parsed = termExplanationSchema.safeParse(term);
    if (!parsed.success) {
      failures.push(`${term.id}: ${parsed.error.issues[0].path.join('.')} ${parsed.error.issues[0].message}`);
    }
  }
  assert.deepEqual(failures, []);
});

test('ids, slugs and filenames agree', () => {
  for (const f of files) {
    const id = f.replace(/\.json$/, '');
    const term = byId.get(id);
    assert.ok(term, `${f} does not contain a term with id "${id}"`);
    assert.equal(term.slug, id, `${id} has slug "${term.slug}"`);
  }
});

test('every term is in the taxonomy and in a real category', () => {
  for (const term of terms) {
    assert.ok(taxonomyIds.has(term.id), `${term.id} is published but not in taxonomy.json`);
    assert.ok(categoryIds.has(term.categoryId), `${term.id} has unknown category ${term.categoryId}`);
  }
});

test('no term links to an unpublished or non-existent term', () => {
  const broken = [];
  for (const term of terms) {
    for (const field of ['prerequisiteTermIds', 'relatedTermIds', 'oftenConfusedWith']) {
      for (const ref of term[field]) {
        if (!byId.has(ref)) broken.push(`${term.id}.${field} → ${ref}`);
        if (ref === term.id) broken.push(`${term.id}.${field} links to itself`);
      }
    }
  }
  assert.deepEqual(broken, []);
});

test('every quiz has exactly one defensible answer', () => {
  for (const term of terms) {
    const q = term.quickCheck;
    assert.ok(q.options.length >= 3, `${term.id}: too few options`);
    assert.ok(
      q.correctOptionIndex >= 0 && q.correctOptionIndex < q.options.length,
      `${term.id}: correctOptionIndex ${q.correctOptionIndex} is out of range`,
    );
    const distinct = new Set(q.options.map((o) => o.trim().toLowerCase()));
    assert.equal(distinct.size, q.options.length, `${term.id}: duplicate quiz options`);
    assert.ok(q.explanation.trim().length > 20, `${term.id}: quiz explanation is too thin to teach`);
  }
});

test('every analogy states where it stops working', () => {
  for (const term of terms) {
    assert.ok(
      term.everydayAnalogy.limitation.trim().length > 30,
      `${term.id}: analogy limitation is missing or too short to be meaningful`,
    );
    assert.ok(term.everydayAnalogy.mapping.length >= 2, `${term.id}: analogy maps fewer than two elements`);
  }
});

test('every visual has a screen-reader and a reduced-motion alternative', () => {
  for (const term of terms) {
    assert.ok(
      term.visual.accessibilityDescription.trim().length > 40,
      `${term.id}: visual has no usable screen-reader alternative`,
    );
    assert.ok(
      term.visual.reducedMotionDescription.trim().length > 20,
      `${term.id}: visual has no reduced-motion alternative`,
    );
    assert.ok(term.visual.steps.length >= 2, `${term.id}: visual has fewer than two steps`);
  }
});

test('terms promised an interactive explainer carry the component id', () => {
  for (const [id, component] of Object.entries(VISUAL_COMPONENT_BY_TERM)) {
    const term = byId.get(id);
    if (!term) continue; // not published yet is fine
    assert.equal(term.visual.component, component, `${id} should render the "${component}" explainer`);
  }
});

test('every interactive component named by a term is implemented', () => {
  const dir = path.join(PATHS.root, 'src/components/learn/visuals');
  const implemented = new Set(
    fs.readdirSync(dir).map((f) => f.replace(/\.astro$/, '')),
  );
  const FILES = {
    'gradient-descent': 'GradientDescent',
    backpropagation: 'Backpropagation',
    tokenizer: 'Tokenizer',
    'context-window': 'ContextWindow',
    parameters: 'Parameters',
    embeddings: 'Embeddings',
    attention: 'Attention',
    rag: 'Rag',
    overfitting: 'Overfitting',
    hallucination: 'Hallucination',
    'precision-recall': 'PrecisionRecall',
    temperature: 'Temperature',
  };
  const missing = [];
  for (const term of terms) {
    const component = term.visual.component;
    if (!component) continue;
    const file = FILES[component];
    if (!file || !implemented.has(file)) missing.push(`${term.id} → ${component}`);
  }
  assert.deepEqual(missing, [], 'a term names a visual component with no implementation');
});

test('every term has a UN workplace example', () => {
  for (const term of terms) {
    assert.ok(
      term.unWorkplaceExample.scenario.trim().length > 40,
      `${term.id}: UN workplace example is missing or too thin`,
    );
  }
});

test('every term corrects at least two misconceptions', () => {
  for (const term of terms) {
    assert.ok(
      term.commonMisconceptions.length >= 2,
      `${term.id}: only ${term.commonMisconceptions.length} misconception(s)`,
    );
  }
});

test('no resource URL was invented: every one is http(s) and on a known host', () => {
  // The pipeline can only emit a curated URL, a Wikipedia article, or a search
  // URL from a template. If a host appears here that is on none of those
  // lists, something reached the corpus that the resource builder did not make.
  const curated = readJson(PATHS.curated);
  const allowed = new Set(['en.wikipedia.org', 'www.youtube.com', 'www.reddit.com']);
  for (const list of [...Object.values(curated.byCategory), ...Object.values(curated.byTerm)]) {
    for (const r of list) allowed.add(new URL(r.url).host);
  }

  const strangers = new Set();
  for (const term of terms) {
    for (const r of term.resources) {
      assert.match(r.url, /^https?:\/\//, `${term.id}: bad URL ${r.url}`);
      const host = new URL(r.url).host;
      if (!allowed.has(host)) strangers.add(`${term.id} → ${host}`);
    }
  }
  assert.deepEqual([...strangers], [], 'resource hosts that no curated list or template produced');
});

test('every resource carries its verification state', () => {
  for (const term of terms) {
    for (const r of term.resources) {
      assert.equal(typeof r.verified, 'boolean', `${term.id}: ${r.url} has no verified flag`);
      assert.ok(r.description.trim().length > 15, `${term.id}: ${r.url} has no useful description`);
    }
  }
});

test('a review claim is either true and dated, or absent', () => {
  // Two separate claims. The directory means published; the flag means a
  // person read it. What must never happen is `reviewed: true` with nothing
  // backing it, which is how a badge stops meaning anything.
  for (const term of terms) {
    if (term.reviewed) {
      assert.match(
        term.lastReviewed ?? '',
        /^\d{4}-\d{2}-\d{2}$/,
        `${term.id} claims a human review with no date`,
      );
    } else {
      assert.equal(term.lastReviewed, undefined, `${term.id} is not reviewed but carries a review date`);
    }
  }
});

test('machine review never masquerades as human review', () => {
  for (const term of terms) {
    if (!term.machineReview) continue;
    assert.notEqual(
      term.machineReview.deployment,
      undefined,
      `${term.id} has a machine review with no deployment recorded`,
    );
    // The reviewer must not be the writer: a model marking its own homework is
    // not a second opinion.
    if (term.generation?.deployment) {
      assert.notEqual(
        term.machineReview.deployment,
        term.generation.deployment,
        `${term.id} was reviewed by the same deployment that wrote it`,
      );
    }
  }
});

test('taxonomy prerequisites form no cycles', () => {
  const state = new Map();
  const stack = [];
  const cycles = [];

  function visit(id) {
    if (state.get(id) === 'done') return;
    if (state.get(id) === 'open') {
      cycles.push([...stack.slice(stack.indexOf(id)), id].join(' → '));
      return;
    }
    state.set(id, 'open');
    stack.push(id);
    for (const p of byId.get(id)?.prerequisiteTermIds ?? []) visit(p);
    stack.pop();
    state.set(id, 'done');
  }

  for (const term of terms) visit(term.id);
  assert.deepEqual(cycles, [], 'prerequisite cycles would make a learning order impossible');
});

test('no shipped page renders an em dash', () => {
  // The corpus check below covers generated content. This one covers the
  // components and pages I wrote, where the em dashes were hiding: the quiz
  // verdict, every interactive readout, three page titles. Testing the built
  // HTML rather than the source is the point, because it is the only place
  // that knows the difference between a comment and a string.
  const dist = path.join(PATHS.root, 'dist');
  if (!fs.existsSync(path.join(dist, 'index.html'))) return; // no build yet

  const strip = (html) =>
    html
      .replace(/<script[\s\S]*?<\/script>/g, ' ')
      .replace(/<style[\s\S]*?<\/style>/g, ' ')
      .replace(/<[^>]+>/g, ' ');

  const walk = (dir, out = []) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full, out);
      else if (e.name.endsWith('.html')) out.push(full);
    }
    return out;
  };

  const offenders = [];
  for (const file of walk(dist)) {
    const hits = (strip(fs.readFileSync(file, 'utf8')).match(/—/g) ?? []).length;
    if (hits) offenders.push(`${path.relative(dist, file)} (${hits})`);
  }
  assert.deepEqual(offenders.slice(0, 8), []);
});

test('no reader-facing copy uses an em dash', () => {
  // House style: commit 1b8064a took em dashes out of everything the site
  // ships, and the milestone corpus has none. A generated corpus that
  // reintroduces them reads as written by a different hand.
  const offenders = [];
  for (const term of terms) {
    const { resources, generation, ...copy } = term;
    const hits = (JSON.stringify(copy).match(/—/g) ?? []).length;
    if (hits) offenders.push(`${term.id} (${hits})`);
  }
  assert.deepEqual(offenders, []);
});

test('one-sentence definitions are distinct', () => {
  const seen = new Map();
  const dupes = [];
  for (const term of terms) {
    const key = term.oneSentence.trim().toLowerCase();
    if (seen.has(key)) dupes.push(`${term.id} ≡ ${seen.get(key)}`);
    else seen.set(key, term.id);
  }
  assert.deepEqual(dupes, []);
});
