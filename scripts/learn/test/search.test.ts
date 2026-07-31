/**
 * Search behaviour.
 *
 * These are the cases from the brief, plus the ones that actually bite: a
 * fuzzy matcher tuned until "back propogation" works will happily match
 * "token" to "taken", so the negative assertions matter as much as the
 * positive ones.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { search, normalise, editDistance, tokens } from '../../../src/lib/learn/search.ts';
import { PATHS } from '../lib/config.mjs';

/** Build the index the same way `src/pages/learn/search.json.ts` does. */
function loadIndex() {
  const taxonomy = JSON.parse(fs.readFileSync(PATHS.taxonomy, 'utf8'));
  const categoryName = new Map(taxonomy.categories.map((c: any) => [c.id, c.name]));
  const files = fs.existsSync(PATHS.reviewed)
    ? fs.readdirSync(PATHS.reviewed).filter((f) => f.endsWith('.json'))
    : [];
  return files.map((f) => {
    const t = JSON.parse(fs.readFileSync(path.join(PATHS.reviewed, f), 'utf8'));
    return {
      i: t.id,
      t: t.term,
      ...(t.acronym ? { y: t.acronym } : {}),
      a: t.aliases,
      c: t.categoryId,
      n: categoryName.get(t.categoryId) ?? t.categoryId,
      d: t.difficulty,
      s: t.oneSentence,
      k: t.searchKeywords,
    };
  });
}

const index = loadIndex();
const topId = (q: string) => search(q, index, 5)[0]?.entry.i;
const idsFor = (q: string, n = 8) => search(q, index, n).map((h) => h.entry.i);

test('the index was built', () => {
  assert.ok(index.length > 100, `expected a populated index, got ${index.length}`);
});

test('exact term names win', () => {
  assert.equal(topId('token'), 'token');
  assert.equal(topId('overfitting'), 'overfitting');
  assert.equal(topId('hallucination'), 'hallucination');
});

test('typos still find the term', () => {
  // The four named in the brief.
  assert.ok(idsFor('back propogation').includes('backpropagation'));
  assert.ok(idsFor('gradient decent').includes('gradient-descent'));
  // Plus the ones people actually type.
  assert.ok(idsFor('halucination').includes('hallucination'));
  assert.ok(idsFor('embeddings').includes('embedding'));
  assert.ok(idsFor('tokenization').includes('tokenisation'));
});

test('acronyms resolve to the full term', () => {
  assert.equal(topId('LLM'), 'large-language-model');
  assert.ok(idsFor('RAG').includes('retrieval-augmented-generation'));
  assert.ok(idsFor('AGI').includes('artificial-general-intelligence'));
});

test('a description of the concept finds it', () => {
  assert.ok(
    idsFor('memory limit').includes('context-window'),
    'a reader who says "memory limit" means the context window',
  );
});

test('search is case and punctuation insensitive', () => {
  assert.equal(topId('Large Language Model'), 'large-language-model');
  assert.equal(topId('large-language-model'), 'large-language-model');
  assert.equal(topId('  LARGE   language  model '), 'large-language-model');
});

test('a multi-word query prefers the phrase over scattered words', () => {
  assert.equal(topId('context window'), 'context-window');
  assert.equal(topId('learning rate'), 'learning-rate');
});

test('nonsense returns nothing rather than a confident wrong answer', () => {
  assert.equal(search('zzzzqqqxyw', index).length, 0);
  assert.equal(search('', index).length, 0);
  assert.equal(search('   ', index).length, 0);
});

test('fuzzy matching does not fire on short different words', () => {
  // "cat" and "car" are one edit apart and must never match each other.
  assert.equal(editDistance('cat', 'car', 2), 1);
  const hits = search('cat', index, 5);
  for (const hit of hits) {
    assert.ok(
      normalise(`${hit.entry.t} ${hit.entry.a.join(' ')} ${hit.entry.k.join(' ')}`).includes('cat'),
      `"cat" should only match entries that really contain it, got ${hit.entry.i}`,
    );
  }
});

test('every query returns results ordered by score', () => {
  const hits = search('model', index, 20);
  for (let i = 1; i < hits.length; i++) {
    assert.ok(hits[i - 1]!.score >= hits[i]!.score, 'results must be sorted by descending score');
  }
});

test('edit distance is bounded and symmetric', () => {
  assert.equal(editDistance('abc', 'abc'), 0);
  assert.equal(editDistance('kitten', 'sitting', 3), 3);
  // Beyond the bound it reports max+1 rather than the true distance.
  assert.ok(editDistance('completely', 'different', 2) > 2);
  assert.equal(editDistance('ab', 'ba', 2), editDistance('ba', 'ab', 2));
});

test('normalise strips diacritics and punctuation', () => {
  assert.equal(normalise('Café—AI!'), 'cafe ai');
  assert.deepEqual(tokens('Retrieval-Augmented Generation'), ['retrieval', 'augmented', 'generation']);
});

test('every published term is findable by its own name', () => {
  const unfindable: string[] = [];
  for (const entry of index) {
    const hits = search(entry.t, index, 5).map((h) => h.entry.i);
    if (!hits.includes(entry.i)) unfindable.push(entry.i);
  }
  assert.deepEqual(unfindable, [], 'these terms cannot be found by typing their own name');
});

test('every alias finds its term', () => {
  const broken: string[] = [];
  for (const entry of index) {
    for (const alias of entry.a) {
      if (alias.length < 3) continue;
      const hits = search(alias, index, 10).map((h) => h.entry.i);
      if (!hits.includes(entry.i)) broken.push(`${entry.i} ← "${alias}"`);
    }
  }
  assert.deepEqual(broken, [], 'these aliases do not lead to their term');
});
