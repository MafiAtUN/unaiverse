#!/usr/bin/env node
/**
 * TAKE GENERATION PIPELINE — CONTENT_SPEC.md §7
 * =============================================
 * Generates the 156 takes listed in `takes_manifest.json` by calling the Azure
 * OpenAI deployment named in `.env`, and writes them to `src/data/takes.json`
 * in the canonical shape the loader (`src/lib/takes.ts`) expects.
 *
 *   node scripts/generate-takes.mjs                 # everything still missing
 *   node scripts/generate-takes.mjs --persona opga  # one persona at a time (§7)
 *   node scripts/generate-takes.mjs --limit 3       # smoke test
 *   node scripts/generate-takes.mjs --model gpt-5.4-pro
 *   node scripts/generate-takes.mjs --force         # regenerate, ignore existing
 *
 * Resumable by design: existing takes in the output file are kept and skipped,
 * and the file is rewritten after every completion — kill it any time.
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, renameSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MANIFEST = join(ROOT, 'takes_manifest.json');
const MILESTONES = join(ROOT, 'content/milestones');
const OUT = join(ROOT, 'src/data/takes.json');

// ---------------------------------------------------------------- env

function loadEnv(file) {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    const value = m[2].replace(/^["']|["']$/g, '');
    if (!(m[1] in process.env)) process.env[m[1]] = value;
  }
}
loadEnv(join(ROOT, '.env'));

const ARGS = parseArgs(process.argv.slice(2));

const BASE_URL = (process.env.AZURE_OPENAI_BASE_URL || '').replace(/\/$/, '');
const API_KEY = process.env.AZURE_OPENAI_API_KEY;
// Default to the full model, not mini: 60 words of persona voice with a hard
// no-invented-facts rule is a quality task, and 156 of them is still pocket change.
const MODEL = ARGS.model || process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-5.4';
const CONCURRENCY = Number(ARGS.concurrency || 6);
const MAX_WORDS = 70;

if (!BASE_URL || !API_KEY) {
  fail('AZURE_OPENAI_BASE_URL and AZURE_OPENAI_API_KEY must be set in .env');
}

// ---------------------------------------------------------------- personas (CONTENT_SPEC §3)

const PERSONAS = {
  'peace-security': {
    name: '🕊️ Peace & Security',
    covers: 'DPPA, DPO, ODA, peace operations and their mission support staff',
    answers:
      'mandates, lethal autonomous weapons, early warning, mission technology, Security Council dynamics',
    notes: '',
  },
  development: {
    name: '🌍 Development & Policy',
    covers: 'DESA, UNDP, Resident Coordinator Offices, SDG and agency policy staff',
    answers: 'capacity-building, the AI divide, SDG linkage, financing',
    notes: '',
  },
  'human-rights': {
    name: '⚖️ Human Rights',
    covers: 'OHCHR, Human Rights Council-facing staff, protection officers',
    answers: 'rights language, due diligence, surveillance, accountability hooks',
    notes: '',
  },
  'data-digital': {
    name: '💻 Data & Digital',
    covers: 'OICT, data cells, UN 2.0 teams, statisticians',
    answers:
      'what is technically real versus declaratory; standards, interoperability, internal adoption',
    notes: '',
  },
  'front-office': {
    name: '🎩 Front Office',
    covers: 'chiefs of staff, speechwriters, briefing-note writers',
    answers:
      'the 30-second brief, the safe citable line, what lands on the principal’s desk next',
    notes:
      'Write for someone who has ninety seconds before a meeting. The quotable line matters more than the analysis.',
  },
  opga: {
    name: '🏛️ OPGA',
    covers: 'the Office of the President of the General Assembly',
    answers:
      'what sits under GA authority versus the SG’s; what the PGA must convene, appoint or steer; member-state dynamics (consensus versus vote); what strengthens GA centrality; usable lines for PGA statements',
    notes:
      'This is an INSTITUTIONAL lens, not a personal one. Track the GA-versus-Secretariat centre of gravity: resolutions, mandated processes, review cycles, appointments and modalities are its native language. Where other personas ask "what does this mean for my work", OPGA asks "what does this obligate or empower the Assembly — and its President — to do, and by when".',
  },
  builders: {
    name: '🛠️ Builders',
    covers: 'AI practitioners in and around the UN system who want to build things',
    answers:
      'what is actually usable: datasets, standards, guidance-as-compliance-checklist, sandboxes, funding channels, pilots worth learning from; what to align with so a prototype survives review',
    notes:
      'The most concrete lens on the site. Zero ceremony. If the event produced nothing a builder can use, comply with or learn from, say so honestly — e.g. "nothing to build with here, but it shapes the rules you will build under".',
  },
  missions: {
    name: '🗺️ Permanent Missions',
    covers: 'Member State delegations in New York and Geneva, and capital desk officers',
    answers:
      'negotiation posture and history (consensus versus vote, who led what); which processes need delegate coverage and when; what to report to capital; where influence is still up for grabs',
    notes:
      'Capital-facing where OPGA is Assembly-facing. Answer the delegate’s three eternal questions: do I need to cover this, what do I tell my capital, is there still room to shape it? Mind small missions especially — for a three-diplomat delegation, "this is the one AI meeting worth staffing" is the most valuable sentence on the site. ABSOLUTE NEUTRALITY RULE: never characterise any State’s or group’s position as good, bad, winning or losing — describe processes and opportunities, not sides.',
  },
};

// CONTENT_SPEC §5. Shown to every call so the register is anchored; the
// persona's own example goes last where one exists.
const EXAMPLES = [
  {
    persona: 'opga',
    label: 'A/RES/79/325 (Scientific Panel + Global Dialogue) — OPGA take',
    so_what:
      'The GA — not the Secretariat — owns both flagship AI mechanisms: the Panel reports through GA processes and the Dialogue’s modalities, co-chairs and calendar run on Assembly decisions.',
    watch_for:
      'The May 2027 Dialogue in New York — co-chair selection and modalities land squarely in PGA territory.',
    use_it:
      'The strongest single proof point that the Assembly is the centre of gravity in global AI governance; safe in any PGA statement.',
  },
  {
    persona: 'builders',
    label: 'CEB Principles for Ethical Use of AI (2022) — Builders take',
    so_what:
      'This is the de facto compliance baseline for anything you build inside the UN system — align early or stall at review.',
    watch_for:
      'Entity-level implementations and Secretariat guidance on generative AI, which turn principles into checklists.',
    use_it:
      'Map your concept note to the principles explicitly (symbol: CEB/2022/2/Add.1) — reviewers look for it.',
  },
  {
    persona: 'missions',
    label: 'A/RES/79/325 (Scientific Panel + Global Dialogue) — Permanent Missions take',
    so_what:
      'Two new standing processes your delegation now needs to cover — the Panel’s reporting cycle and the recurring Global Dialogue — with working methods still taking shape.',
    watch_for:
      'The May 2027 Dialogue in New York: modalities and statement slots reward early engagement.',
    use_it:
      'If you can only staff one AI process, this is it — and the Panel’s reports are free, citable technical backing for national statements.',
  },
  {
    persona: 'front-office',
    label: 'Global Digital Compact — Front Office take',
    so_what:
      'First universal AI-governance commitments your principal can cite without caveats — adopted by consensus, all 193.',
    watch_for:
      'The high-level GDC review at the GA’s 82nd session; implementation language is being negotiated now.',
    use_it: 'Cite as A/RES/79/1, Annex I. Safe line: "the first truly universal agreement on AI governance."',
  },
];

// ---------------------------------------------------------------- prompts

function systemPrompt(personaId) {
  const p = PERSONAS[personaId];
  const examples = [
    ...EXAMPLES.filter((e) => e.persona !== personaId),
    ...EXAMPLES.filter((e) => e.persona === personaId),
  ];

  return `You write "takes" for UNAIVERSE, an interactive website about the UN's work on AI. A take tells one specific professional audience what a milestone means for them.

AUDIENCE FOR THIS TAKE
${p.name} — ${p.covers}.
Their take answers: ${p.answers}.
${p.notes ? `Persona note: ${p.notes}` : ''}

FORMAT — exactly three beats, ${MAX_WORDS} words maximum across all three combined (aim for ~60):
so_what:   one sentence — what this changes for this reader's work
watch_for: the concrete next thing to track — a mandated report, review date, negotiation, deadline
use_it:    how to deploy it — a citable line, a document symbol, a meeting to attend, a checklist to apply

RULES
- Use ONLY facts in the milestone entry below. Do not add events, dates, numbers, symbols or claims from your own knowledge. If the entry lacks something a beat needs, write the beat without it — a beat grounded in the entry beats a beat that is merely satisfying.
- Second person ("you"), active voice, plain verbs. No filler, no hedging, no throat-clearing ("This milestone represents…").
- Vary your openings. Do not reach for the same construction every time — "You now have…" and "You have…" are worn out. Lead with the change, the fact, or the verb where that reads better.
- Wit is welcome; sarcasm only at the expense of hype or bureaucratic pace in general — NEVER at the UN, its officials, its staff or any Member State. Nothing that would embarrass anyone in a screenshot.
- If the entry is marked UNVERIFIED, do not state the unverified detail as fact.
- The "use it" beat must contain something genuinely actionable — a symbol, a date, a line, a link, a checklist. Not vibes.
- Do not repeat the beat labels inside the values, and do not use markdown.

WORKED EXAMPLES OF THE REGISTER (other milestones — do not reuse their facts)
${examples
  .map(
    (e) =>
      `${e.label}\n  so_what: ${e.so_what}\n  watch_for: ${e.watch_for}\n  use_it: ${e.use_it}`,
  )
  .join('\n\n')}`;
}

function userPrompt(milestone) {
  const fm = milestone.frontmatter;
  return `MILESTONE ENTRY

Title: ${fm.title}
Date: ${fm.date_display}
Document symbol: ${fm.symbol && fm.symbol !== 'null' ? fm.symbol : '(none)'}
Badges: ${fm.badges || '(none)'}
${fm.unverified === 'true' ? 'STATUS: UNVERIFIED — some details are not yet confirmed. Do not state them as fact.\n' : ''}
${milestone.body}`;
}

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['so_what', 'watch_for', 'use_it'],
  properties: {
    so_what: { type: 'string' },
    watch_for: { type: 'string' },
    use_it: { type: 'string' },
  },
};

// ---------------------------------------------------------------- corpus

function readMilestones() {
  const out = new Map();
  for (const file of readdirSync(MILESTONES).filter((f) => f.endsWith('.md'))) {
    const raw = readFileSync(join(MILESTONES, file), 'utf8');
    const m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (!m) continue;
    const frontmatter = {};
    for (const line of m[1].split('\n')) {
      const kv = line.match(/^([a-z_]+):\s*(.*)$/);
      if (kv) frontmatter[kv[1]] = kv[2].replace(/^["']|["']$/g, '').trim();
    }
    out.set(file.replace(/\.md$/, ''), { frontmatter, body: m[2].trim() });
  }
  return out;
}

// ---------------------------------------------------------------- API

async function callModel(messages, attempt = 0) {
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: { 'api-key': API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      messages,
      max_completion_tokens: 2000,
      response_format: {
        type: 'json_schema',
        json_schema: { name: 'take', strict: true, schema: SCHEMA },
      },
    }),
  });

  if (res.status === 429 || res.status >= 500) {
    if (attempt >= 5) throw new Error(`${res.status} after ${attempt} retries`);
    const wait = Number(res.headers.get('retry-after')) * 1000 || 2000 * 2 ** attempt;
    await sleep(wait);
    return callModel(messages, attempt + 1);
  }
  if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 300)}`);

  const json = await res.json();
  const choice = json.choices?.[0];
  if (choice?.message?.refusal) throw new Error(`refused: ${choice.message.refusal}`);
  const content = choice?.message?.content;
  if (!content) throw new Error(`empty completion (finish_reason: ${choice?.finish_reason})`);
  return JSON.parse(content);
}

const wordCount = (t) => (t.so_what + ' ' + t.watch_for + ' ' + t.use_it).trim().split(/\s+/).length;

/**
 * The word ceiling is the one rule the model reliably drifts past — everything
 * else it holds. Re-ask up to three times and keep the shortest version that
 * still carries the facts; never return something longer than we started with.
 */
async function tighten(take, messages, rounds = 3) {
  let best = take;
  const thread = [...messages];

  for (let i = 0; i < rounds && wordCount(best) > MAX_WORDS; i++) {
    thread.push(
      { role: 'assistant', content: JSON.stringify(best) },
      {
        role: 'user',
        content:
          `That is ${wordCount(best)} words across the three beats. The ceiling is ${MAX_WORDS} and it is hard — the site's layout depends on it. ` +
          `Cut ${wordCount(best) - MAX_WORDS + 5} words: drop qualifiers, restated context and any fact that repeats between beats. ` +
          `Keep every document symbol, date and number. Same JSON shape.`,
      },
    );
    const retry = await callModel(thread);
    if (wordCount(retry) < wordCount(best)) best = retry;
  }
  return best;
}

async function generateTake(slot, milestone) {
  const messages = [
    { role: 'system', content: systemPrompt(slot.persona) },
    { role: 'user', content: userPrompt(milestone) },
  ];

  const take = await tighten(await callModel(messages), messages);

  return {
    milestone_id: slot.milestone_id,
    persona: slot.persona,
    so_what: take.so_what.trim(),
    watch_for: take.watch_for.trim(),
    use_it: take.use_it.trim(),
    _model: MODEL,
  };
}

/** --trim: hand an existing take back to the model and ask only for compression. */
async function trimTake(slot, milestone) {
  const prior = existing.get(`${slot.milestone_id}::${slot.persona}`);
  const messages = [
    { role: 'system', content: systemPrompt(slot.persona) },
    { role: 'user', content: userPrompt(milestone) },
  ];
  const take = await tighten({ ...prior }, messages);
  return { ...prior, ...take, _model: MODEL };
}

// ---------------------------------------------------------------- run

const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));
const milestones = readMilestones();

const existing = new Map();
if (existsSync(OUT) && !ARGS.force) {
  const prior = JSON.parse(readFileSync(OUT, 'utf8'));
  for (const t of prior.takes ?? prior) existing.set(`${t.milestone_id}::${t.persona}`, t);
}

let slots = manifest.takes;
if (ARGS.persona) {
  const wanted = ARGS.persona.split(',').map((s) => s.trim());
  for (const p of wanted) if (!PERSONAS[p]) fail(`unknown persona "${p}"`);
  slots = slots.filter((s) => wanted.includes(s.persona));
}

if (ARGS.milestone) slots = slots.filter((s) => s.milestone_id.includes(ARGS.milestone));

// --trim: leave the writing alone, just bring over-length takes under the ceiling.
const todo = ARGS.trim
  ? slots.filter((s) => {
      const t = existing.get(`${s.milestone_id}::${s.persona}`);
      return t && wordCount(t) > MAX_WORDS;
    })
  : slots.filter((s) => !existing.has(`${s.milestone_id}::${s.persona}`));
const queue = ARGS.limit ? todo.slice(0, Number(ARGS.limit)) : todo;
const TOTAL = queue.length;

console.log(
  `[takes] model ${MODEL} · ${manifest.takes.length} slots in manifest · ` +
    `${existing.size} already written · generating ${queue.length}` +
    (ARGS.persona ? ` (persona: ${ARGS.persona})` : ''),
);
if (!queue.length) {
  console.log('[takes] nothing to do.');
  process.exit(0);
}

const failures = [];
let done = 0;

function flush() {
  const ordered = manifest.takes
    .map((s) => existing.get(`${s.milestone_id}::${s.persona}`))
    .filter(Boolean);
  const tmp = OUT + '.tmp';
  writeFileSync(
    tmp,
    JSON.stringify(
      {
        generated_by: 'scripts/generate-takes.mjs',
        model: MODEL,
        count: ordered.length,
        expected: manifest.total_takes,
        takes: ordered,
      },
      null,
      2,
    ) + '\n',
  );
  renameSync(tmp, OUT);
}

async function worker() {
  for (;;) {
    const slot = queue.shift();
    if (!slot) return;
    const milestone = milestones.get(slot.milestone_id);
    if (!milestone) {
      failures.push({ slot, error: 'milestone file not found' });
      continue;
    }
    try {
      const take = ARGS.trim
        ? await trimTake(slot, milestone)
        : await generateTake(slot, milestone);
      existing.set(`${slot.milestone_id}::${slot.persona}`, take);
      flush();
      done++;
      console.log(
        `  ${String(done).padStart(3)}/${TOTAL}  ${slot.persona.padEnd(14)} ${slot.milestone_id}  (${wordCount(take)}w)`,
      );
    } catch (err) {
      failures.push({ slot, error: String(err.message || err) });
      console.error(`  ✗  ${slot.persona.padEnd(14)} ${slot.milestone_id}  ${err.message || err}`);
    }
  }
}

await Promise.all(Array.from({ length: CONCURRENCY }, worker));
flush();

console.log(`\n[takes] ${existing.size}/${manifest.total_takes} takes now in src/data/takes.json`);
if (failures.length) {
  console.log(`[takes] ${failures.length} failed — rerun the same command to retry only those:`);
  for (const f of failures) console.log(`  ${f.slot.persona} · ${f.slot.milestone_id} — ${f.error}`);
  process.exit(1);
}

// ---------------------------------------------------------------- helpers

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith('--')) continue;
    const key = argv[i].slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) out[key] = true;
    else out[key] = argv[++i];
  }
  return out;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function fail(msg) {
  console.error(`[takes] ${msg}`);
  process.exit(1);
}
