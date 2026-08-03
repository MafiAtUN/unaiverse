# 🌌 UNAIVERSE

**One data nerd's lovingly sarcastic map of the UN's AI universe.**

[![Deploy to GitHub Pages](https://github.com/MafiAtUN/unaiverse/actions/workflows/deploy.yml/badge.svg)](https://github.com/MafiAtUN/unaiverse/actions/workflows/deploy.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-black.svg)](LICENSE)
[![Astro](https://img.shields.io/badge/built%20with-Astro-black.svg)](https://astro.build)

> **Live:** https://mafiatun.github.io/unaiverse
>
> 76 milestones with their receipts, 156 role takes, 307 AI terms explained.

```bash
git clone https://github.com/MafiAtUN/unaiverse.git
cd unaiverse && npm install && npm run dev
```

Node 22 or newer. **No API key, no environment file, no account, no service to
stand up.** If those three commands do not give you the whole site on a clean
clone, that is a bug worth reporting.

## What is this?

For roughly 77 years, the United Nations was busy with minor side quests (peace, human rights, development) and mentioned artificial intelligence approximately never. Then a chatbot launched in November 2022, and suddenly every conference room in Turtle Bay had opinions about neural networks.

UNAIVERSE is an interactive, fly-through galaxy of everything the UN has done about AI since: every resolution, report, summit, panel, and robot press conference, each one a glowing node with links to the original documents (*receipts included*), a plain-language TL;DR, and tailored takes for eight kinds of UN reader, from Security Council watchers to the person who has to write the briefing note by 6pm.

It is also meant to be *usable on a Tuesday*, which is why it ships:

| Page | For |
|---|---|
| `/` | The timeline. Search by document symbol, filter by duty station and body, copy any milestone as a plain-text briefing note. |
| `/learn` | **The AI Literacy Universe.** 307 AI terms in plain language, each with an analogy that states where it stops working, a visual, a worked example, a UN workplace example, misconception corrections and a quick check. Search tolerates typos: `gradient decent` finds gradient descent, `memory limit` finds the context window. |
| `/agenda` | What is still to come, with a calendar file to subscribe to, and a ledger of who owes what by when. |
| `/inherit` | Ten minutes on what exists, for the delegate or colleague who just had the file handed to them with no handover. |
| `/calendar.ics` | Every scheduled item, importable into Outlook or Google Calendar. Per-event files live at `/calendar/<id>.ics`. |
| `/rss.xml` | For the office that pipes a feed into a Teams channel. |

Filter state lives in the URL, so a filtered view is a link you can send to a colleague or a capital: [`?venue=geneva`](https://mafiatun.github.io/unaiverse/?venue=geneva) is the Geneva file.

There are two halves. The timeline records **what the UN has done about AI**.
[`/learn`](https://mafiatun.github.io/unaiverse/learn) explains **the words** —
because the commonest reason to be lost in this file is not the chronology, it
is somebody saying "we should look at RAG" and the meeting moving on. Tap any
underlined term in the timeline and A/BOT explains it in place; if it has a full
page, A/BOT offers a door through to it, and the page offers a door back to the
exact milestone you came from.

No login, no account, no tracking. Saved terms and progress live in your browser
and are never sent anywhere.

Your guide through the galaxy is **A/BOT** 🤖, a droid with junior-staffer energy and a weakness for acronyms, who explains AI governance through *Star Wars*, Asimov, and the occasional dragon.

All facts are sourced to official UN documents. All jokes are the author's own and aimed strictly at hype and bureaucratic pacing, never at the Organization, its officials, or any Member State.

## Who made this?

**Mafi (Mafizul Islam)**, UN data specialist. Published under **Nerd Lab** — unnecessarily clever, occasionally useful.

## Repository map

| Path | What it is |
|---|---|
| `CONTRIBUTING.md` | How to run it, the rules a pull request is checked against, and what will be declined |
| `SECURITY.md` | How to report a vulnerability, and how credentials are kept out of the build |
| `CODE_OF_CONDUCT.md` | Contributor Covenant, plus one clause specific to a project about intergovernmental work |
| `LICENSE` | MIT, plus a note on the UN source material this project quotes and links to |
| `.env.template` | Every environment variable the repository reads, and which script reads it. The site needs none of them |
| `UN_AI_TIMELINE_PLAN.md` | Master plan: concept, design, stack, tone rules, build phases |
| `CONTENT_SPEC.md` | Tiers, badges, the eight personas, take formula, generation prompt |
| `research.md` | The sourced research base (~75 milestones, 2017 – Jul 2026) |
| `content/milestones/` | One file per milestone, frontmatter carries tier/badges/personas |
| `content/quotes.md` | Key official quotations, sourced |
| `content/gaps.md` | Known gaps and open questions: what Phase 1 closed, and what's still open |
| `takes_manifest.json` | Every milestone × persona pair, the authoritative list behind the 156 takes |
| `VERIFICATION_LOG.md` | What the Phase 1 accuracy pass checked, found and fixed |
| `src/` | The site: content collection, timeline, take slots, A/BOT |
| `src/data/README.md` | How to drop the generated takes in when they're ready |
| `src/lib/agenda.ts` | The forward view: upcoming events, the mandate ledger, iCalendar output |
| `src/lib/brief.ts` | Builds the plain-text briefing note behind every "Copy briefing note" button |
| `src/lib/onboarding.ts` | The authored reading order behind `/inherit`, plus the always-safe citable lines |
| `scripts/annotate-milestones.mjs` | The hand-written duty-station and body mapping for all 76 milestones |
| `docs/AI_LITERACY.md` | **The literacy platform**: architecture, content model, Azure pipeline, review workflow, accessibility, limitations |
| `docs/AI_LITERACY_IMPLEMENTATION_PROMPT.md` | The brief the literacy area was built from, kept for the record |
| `content/learn/taxonomy.json` | 307 terms in 16 categories — the source of truth for the literacy area |
| `content/learn/reviewed/` | The published term corpus. The site reads this directory and nothing else |
| `scripts/learn/` | The offline content pipeline: generate, validate, check links, report, publish |
| `src/lib/learn/schema.ts` | The content schema, shared by the Astro build and the Node scripts |

## Stack

Astro · Three.js · GSAP · deployed via GitHub Actions to GitHub Pages.
Reduced-motion and mobile modes are first-class citizens, not afterthoughts.

```bash
npm install
npm run dev      # local, with the content collection watching content/milestones
npm run build    # static output to dist/
npm test         # 49 tests: content contract, search behaviour, built output
npm run check    # astro check — type checking
```

### The AI literacy content pipeline

Azure OpenAI is used **only at development time**, by scripts that write JSON to
disk. The published site is static files: it holds no credential, calls no AI
service, and `npm test` asserts that no Azure identifier or `.env` value appears
anywhere in `dist/`.

Only the generating scripts need credentials, and only three of them cost
money. `content:validate`, `content:report` and `content:check-links` are
offline and free, and are the ones CI runs on every push.

```bash
cp .env.template .env      # three required variables, all documented in the file

npm run content:generate -- --term gradient-descent   # one term
npm run content:generate                              # everything outstanding
npm run content:generate -- --term token --dry-run    # no credentials needed
npm run content:validate                              # schema + link integrity
npm run content:check-links                           # fetch every external URL
npm run content:report                                # quality report
npm run content:publish -- --list                     # what awaits review
npm run content:publish -- --term token --by "Name"   # the review gate
```

Nothing a model wrote reaches a reader until a person has run
`content:publish` for that term. Full workflow in
[`docs/AI_LITERACY.md`](docs/AI_LITERACY.md).

> **Adding a dependency?** Run `npm run relock` afterwards, not just `npm install <pkg>`.
> An incremental install on macOS prunes optional dependencies that only resolve on
> other platforms, and CI's `npm ci` then fails on Linux with `Missing: @emnapi/core`.
> `relock` regenerates the lockfile from scratch so all ten platforms are recorded.

The build reports what it rendered, which is the quickest way to spot a content problem:

```text
[unaiverse] 76 milestones · 156 take slots · 156/156 takes loaded
```

Run `npm run build` before `npm test`. Several assertions read `dist/`,
including the sweep that proves no credential reached the published output.
Against a stale build they pass without meaning anything.

### Adding a milestone

Frontmatter carries two fields the filters and the Geneva/New York split depend on:

```yaml
venue: ["geneva"]        # duty station — see VENUES in src/lib/taxonomy.ts
organ: ["human-rights-council"]  # owning body — see ORGANS
```

They are assigned by hand in `scripts/annotate-milestones.mjs`, one line per milestone, because
where a file sits is an editorial judgement and not something derivable from the prose. Add a
row there and run `npm run annotate`; `npm run annotate:check` verifies without writing. A
milestone with neither field still builds, and the build warns that it will never show up in a
duty-station filter.

If a milestone creates an obligation (a report requested, a body to be appointed, a review to be
held), add a `mandates:` block and it appears in the ledger at `/agenda` with no code change:

```yaml
mandates:
  - what: "Seek views and report to the General Assembly"
    who: "Secretary-General"
    due: "Eightieth session"
    due_sort: 20250930   # plain YYYYMMDD; the prose above is often a session, not a date
    status: "done"       # done | pending | upcoming — a fact, never a judgement
    source: "A/RES/79/239"
    note: "Delivered as A/80/78, 5 June 2025."
```

## Contributing

Corrections are the most welcome contribution there is, and they need no code:
if a date, a document symbol, a link or an explanation is wrong, open an issue
with the source and it gets fixed. There is a template for exactly that.

Before opening a pull request, read [CONTRIBUTING.md](CONTRIBUTING.md). It
covers how to run the project, the rules that are enforced by tests (receipts
kept, WCAG AA computed rather than eyeballed, no em dashes in rendered copy, no
invented document symbols), the tone rules, and an honest list of what will
probably be declined so you do not spend an evening on it.

Everyone taking part is expected to follow the
[Code of Conduct](CODE_OF_CONDUCT.md).

## Security

The published site is static: no server, no database, no login, no cookie, no
analytics. Azure OpenAI is used only at development time, and CI asserts on
every push that no credential, endpoint or `.env` value reached `dist/`.

Found something anyway? [SECURITY.md](SECURITY.md) has the details. Email rather
than open a public issue.

## License

[MIT](LICENSE). Use it, fork it, learn from it.

The licence covers the code, the build, the scripts and the original editorial
writing. It does not cover the UN documents, resolutions, reports and
photographs this project cites and links to: those remain the property of their
publishers and are used here for reporting, comment and education. If you reuse
this repository, your use of that source material is your own responsibility.

---

*This is a personal project. It is not an official United Nations product, and nothing here represents the views of the UN or any of its offices. It does, however, link to a lot of things that do.*
