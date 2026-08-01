#!/usr/bin/env node
/**
 * Rewrite the examples so a UN colleague recognises their own week in them.
 *
 * Changes the setting and the register, never the mechanism. `oneSentence` and
 * `plainExplanation` are not offered to the model at all: they are the part a
 * newcomer reads, they have already been through generation and an adversarial
 * review, and this pass has no business in them.
 *
 *   npm run content:voice -- --term overfitting --audit    # show the diff, write nothing
 *   npm run content:voice -- --limit 8                     # pilot
 *   npm run content:voice                                  # everything not yet done
 *   npm run content:voice -- --force --term overfitting    # redo one
 *
 * Every rewrite is re-validated against the site's schema, and any document
 * symbol that is not on the approved list is refused, which is the guard that
 * stops "more specific" turning into "quietly invented".
 */
import fs from 'node:fs';
import path from 'node:path';
import { PATHS, readJson, writeJson, parseArgs, COLOURS, loadEnv } from './lib/config.mjs';
import { createClient, pool } from './lib/azure.mjs';
import {
  VOICE_PROMPT_VERSION,
  VOICE_SYSTEM_PROMPT,
  buildVoicePrompt,
  VOICE_RESPONSE_SCHEMA,
} from './lib/voice-prompt.mjs';
import { stripNulls } from './lib/response-schema.mjs';
import { termExplanationSchema } from '../../src/lib/learn/schema.ts';

const { flags } = parseArgs();
loadEnv();

const taxonomy = readJson(PATHS.taxonomy);
const categories = new Map(taxonomy.categories.map((c) => [c.id, c]));
const references = readJson(path.join(PATHS.root, 'content/learn/voice/approved-references.json'));
const APPROVED = Object.entries(references.documentSymbols);
const APPROVED_SET = new Set(APPROVED.map(([s]) => s.toUpperCase()));

const deployment =
  (typeof flags.model === 'string' && flags.model) ||
  process.env.AZURE_OPENAI_DEPLOYMENT_GPT56_SOL ||
  process.env.AZURE_OPENAI_DEPLOYMENT;

const auditOnly = Boolean(flags.audit);
const concurrency = Number(flags.concurrency ?? 8);

/**
 * Anything shaped like a UN document symbol. Deliberately greedy: it is far
 * better to flag a false positive a human glances at than to let one invented
 * "A/RES/79/412" reach a page that a delegate might quote.
 */
const SYMBOL_RE = /\b(?:A|S|E|ST|CCW|HRC|UNEP|TD)\/[A-Z0-9][A-Z0-9./-]*\d\b/g;

function invalidSymbols(text) {
  return [...new Set((text.match(SYMBOL_RE) ?? []).filter((s) => !APPROVED_SET.has(s.toUpperCase())))];
}

const locate = (id) => {
  const r = path.join(PATHS.reviewed, `${id}.json`);
  return fs.existsSync(r) ? r : null;
};

let targets = taxonomy.terms.map((t) => t.id).filter(locate);
if (flags.term) {
  const wanted = String(flags.term).split(',').map((s) => s.trim());
  targets = targets.filter((id) => wanted.includes(id));
} else if (flags.category) {
  const inCat = new Set(taxonomy.terms.filter((t) => t.categoryId === flags.category).map((t) => t.id));
  targets = targets.filter((id) => inCat.has(id));
}
if (!flags.force) {
  targets = targets.filter((id) => readJson(locate(id)).voicePass?.promptVersion !== VOICE_PROMPT_VERSION);
}
if (flags.limit) targets = targets.slice(0, Number(flags.limit));

if (!targets.length) {
  console.log(COLOURS.green('Nothing to do. Use --force to redo.'));
  process.exit(0);
}

process.env.AZURE_OPENAI_DEPLOYMENT = deployment;
let client;
try {
  client = createClient();
} catch (error) {
  console.error(COLOURS.red(error.message));
  process.exit(1);
}

console.log(
  `${COLOURS.bold(`UN voice pass over ${targets.length} term(s)`)} with ${COLOURS.yellow(deployment)}` +
    ` · prompt ${VOICE_PROMPT_VERSION}` +
    `${auditOnly ? COLOURS.dim(' · audit only') : ''} · concurrency ${concurrency}`,
);
console.log(COLOURS.dim('Setting and register only. The definition and the plain explanation are not touched.'));
console.log('');

const summary = { changed: 0, unchanged: 0, refused: 0, failed: 0 };
const refusals = [];
let done = 0;

const results = await pool(targets, concurrency, async (id) => {
  const file = locate(id);
  const doc = readJson(file);

  const response = await client.chat({
    system: VOICE_SYSTEM_PROMPT,
    user: buildVoicePrompt({ term: doc, approvedSymbols: APPROVED, category: categories.get(doc.categoryId) }),
    maxTokens: 14000,
    jsonSchema: VOICE_RESPONSE_SCHEMA,
  });

  let out;
  try {
    out = stripNulls(JSON.parse(response.content));
  } catch {
    summary.failed++;
    console.log(`${COLOURS.red('✗')} ${id} unparseable`);
    return null;
  }

  const candidate = structuredClone(doc);
  const applied = [];

  if (out.unWorkplaceExample?.scenario) {
    candidate.unWorkplaceExample = {
      scenario: out.unWorkplaceExample.scenario,
      relevance: out.unWorkplaceExample.relevance ?? doc.unWorkplaceExample.relevance,
      ...(out.unWorkplaceExample.caution ?? doc.unWorkplaceExample.caution
        ? { caution: out.unWorkplaceExample.caution ?? doc.unWorkplaceExample.caution }
        : {}),
    };
    applied.push('unWorkplaceExample');
  }
  if (out.workedExample?.scenario && out.workedExample.process?.length) {
    candidate.workedExample = {
      scenario: out.workedExample.scenario,
      ...(out.workedExample.input ? { input: out.workedExample.input } : {}),
      process: out.workedExample.process,
      result: out.workedExample.result ?? doc.workedExample.result,
    };
    applied.push('workedExample');
  }
  if (out.whereYouMayHearIt?.length >= 2) {
    candidate.whereYouMayHearIt = out.whereYouMayHearIt.slice(0, 5);
    applied.push('whereYouMayHearIt');
  }
  if (out.keyTakeaway) {
    candidate.keyTakeaway = out.keyTakeaway;
    applied.push('keyTakeaway');
  }
  if (out.everydayAnalogy?.story) {
    candidate.everydayAnalogy = {
      ...doc.everydayAnalogy,
      title: out.everydayAnalogy.title ?? doc.everydayAnalogy.title,
      story: out.everydayAnalogy.story,
    };
    applied.push('everydayAnalogy');
  }

  if (!applied.length) {
    summary.unchanged++;
    done++;
    console.log(`${COLOURS.dim('·')} ${id.padEnd(38)} left as it was${COLOURS.dim(`  ${done}/${targets.length}`)}`);
    return null;
  }

  // ── The two guards ───────────────────────────────────────────────────────
  const changedText = JSON.stringify({
    a: candidate.unWorkplaceExample,
    b: candidate.workedExample,
    c: candidate.whereYouMayHearIt,
    d: candidate.keyTakeaway,
    e: candidate.everydayAnalogy,
  });

  const bad = invalidSymbols(changedText);
  if (bad.length) {
    summary.refused++;
    refusals.push({ id, reason: `invented document symbol: ${bad.join(', ')}` });
    console.log(`${COLOURS.red('✗')} ${id.padEnd(38)} refused: invented symbol ${bad.join(', ')}`);
    return null;
  }
  if (changedText.includes('—')) {
    summary.refused++;
    refusals.push({ id, reason: 'em dash' });
    console.log(`${COLOURS.yellow('!')} ${id.padEnd(38)} refused: em dash`);
    return null;
  }

  candidate.voicePass = {
    model: response.model,
    deployment,
    promptVersion: VOICE_PROMPT_VERSION,
    revisedAt: new Date().toISOString(),
    applied,
    note: String(out.note ?? '').slice(0, 400),
  };

  const parsed = termExplanationSchema.safeParse(candidate);
  if (!parsed.success) {
    summary.refused++;
    const where = parsed.error.issues[0].path.join('.');
    refusals.push({ id, reason: `schema: ${where} ${parsed.error.issues[0].message}` });
    console.log(`${COLOURS.yellow('!')} ${id.padEnd(38)} refused: schema (${where})`);
    return null;
  }

  if (!auditOnly) writeJson(file, parsed.data);
  summary.changed++;
  done++;
  console.log(
    `${COLOURS.green('✓')} ${id.padEnd(38)} ${applied.join(', ')}${COLOURS.dim(`  ${done}/${targets.length}`)}`,
  );
  return { id, applied };
});

for (const r of results) {
  if (!r.ok) {
    summary.failed++;
    console.error(COLOURS.red(`✗ ${r.error?.message ?? r.error}`));
  }
}

if (refusals.length) {
  writeJson(path.join(PATHS.root, 'content/learn/voice/refusals.json'), { at: new Date().toISOString(), refusals });
}

console.log('');
console.log(
  `${COLOURS.bold('Done.')} ${COLOURS.green(`${summary.changed} rewritten`)} · ${summary.unchanged} left alone` +
    (summary.refused ? ` · ${COLOURS.red(`${summary.refused} refused`)}` : '') +
    (summary.failed ? ` · ${summary.failed} failed` : ''),
);
if (refusals.length) console.log(COLOURS.dim('Refusals in content/learn/voice/refusals.json'));
if (!auditOnly) console.log(COLOURS.dim('Next: npm run content:validate && npm test'));
