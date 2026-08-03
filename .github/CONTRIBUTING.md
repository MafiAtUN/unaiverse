# Contributing to UNAIVERSE

Thanks for looking. This is a small personal project with a public audience,
which shapes what is easy to accept and what is not. Everything below is meant
to save you from writing a pull request that cannot be merged.

## The fastest useful contribution: a correction

The single most valuable thing anyone can send is **a factual correction with a
source**. If a date is wrong, a document symbol is mistyped, a link is dead, or
a term is explained in a way that would mislead someone in a meeting, open an
issue with the URL of the official document and it will be fixed.

You do not need to run anything or write any code to do this. There is an issue
template for it.

## Getting it running

```bash
git clone https://github.com/MafiAtUN/unaiverse.git
cd unaiverse
npm install
npm run dev
```

Node 22 or newer. No environment variables, no API keys, no accounts. If the
site does not come up on a clean clone with those four commands, that is a bug
worth reporting on its own.

```bash
npm run build     # static output to dist/
npm run check     # astro check: types and template diagnostics
npm test          # the full suite, including the house-style guards
```

**Run `npm run build` before `npm test`.** Several assertions read `dist/`,
including the sweep that proves no credential reached the published output.
Against a stale build they pass without meaning anything.

## The rules that a pull request is checked against

These are enforced by tests, not by taste.

**Receipts are sacred.** Every factual claim keeps its source link. A cleaner
layout is never worth a lost citation.

**No em dashes in anything the site renders.** Use a comma, a colon, a full
stop or brackets. Two tests walk the built HTML for this. It applies to
rendered copy only, so source comments and documentation files, this one
included, use them freely.

**WCAG AA on every text pairing**, computed rather than eyeballed. 108 pairings
currently clear it and axe-core reports zero violations. Watch for `opacity`
compounded on already-dimmed text: that trap has bitten once, which is why
`--ink-faint` exists.

**Keyboard navigable, visible focus, `prefers-reduced-motion` respected.** The
galaxy included.

**Performance budget.** The default non-galaxy experience targets under 200 KB
of JavaScript, Lighthouse mobile 90 or better, content visible under three
seconds on throttled 3G. It is currently 97 mobile and 100 desktop. Astro
static output is why that is achievable, so keep the default path close to
zero JavaScript.

**No invented UN document symbols.** This is the worst failure mode the project
has, because a delegate might quote one.
`content/learn/voice/approved-references.json` is the allowlist and the scripts
refuse anything outside it.

## Tone

The full rules are in [UN_AI_TIMELINE_PLAN.md](../docs/UN_AI_TIMELINE_PLAN.md) section
4, and they are the authority. The short version:

- Jokes land on hype, on acronym soup, or on the author. Never on the United
  Nations, its leadership, Member States, or any named official.
- No Member State politics and no geopolitical rivalry framing. A contested
  resolution is presented neutrally and from both sides.
- The test for any line: could the author's future boss read it aloud in a town
  hall, and everyone laughs, including the person joked about?

Write the way the commit log is written: plain international English, short
sentences, human phrasing. "Stop the glossary reading like homework", not
"Enhance glossary readability".

## Content, and the line the model output does not cross

`content/learn/reviewed/` is what the site renders, and nothing else.
`generated/` is model output waiting for a person. `npm run content:publish` is
the gate between them and it is a human action.

Two different things are called reviewed, and the distinction is load-bearing.
The **directory** means "published, the site renders this". The `reviewed: true`
**flag** means "a person read it". A page can be the first without the second,
and when it is, it says so on the page. Never set that flag to make a report
look better.

**Do not hand-edit files in `generated/` or `reviewed/`.** Fix the prompt or the
script in `scripts/learn/`, or open an issue. A hand-edit is invisible to the
pipeline and gets overwritten on the next run.

The generation scripts call a paid API. `content:generate`, `content:review`
and `content:voice` cost money, so do not run them speculatively.
`content:validate`, `content:report` and `content:check-links` are offline and
free, and are the ones CI runs.

## Adding a milestone

Frontmatter carries two fields the filters depend on:

```yaml
venue: ["geneva"]                 # duty station, see VENUES in src/lib/taxonomy.ts
organ: ["human-rights-council"]   # owning body, see ORGANS
```

They are assigned by hand in `scripts/annotate-milestones.mjs`, one line per
milestone, because where a file sits is an editorial judgement and not
something derivable from the prose. Add a row there and run `npm run annotate`;
`npm run annotate:check` verifies without writing.

## Which document is authoritative

Do not re-derive these from the code. Where they conflict with the code, the
code is behind, not the document.

| Question | Document |
|---|---|
| Tone, concept, narrative zones, build phases | [UN_AI_TIMELINE_PLAN.md](../docs/UN_AI_TIMELINE_PLAN.md) |
| Tiers, badges, personas, the three-beat take formula | [CONTENT_SPEC.md](../docs/CONTENT_SPEC.md) |
| Palette, contrast floors, what shipped and why | [DESIGN.md](../docs/DESIGN.md) |
| Current IA, the four journey tests, definition of done | [REDESIGN_BRIEF.md](../docs/REDESIGN_BRIEF.md) |
| The literacy platform end to end | [AI_LITERACY.md](../docs/AI_LITERACY.md) |
| What the accuracy pass checked, and its caveats | [VERIFICATION_LOG.md](../docs/VERIFICATION_LOG.md) |

## Pull requests

- One change per pull request. A correction and a refactor in the same branch
  is two reviews wearing one hat.
- Commit messages are a human sentence about what changed for the reader:
  "Move the Nerd Lab credit into the bar, and drop the build credit". No
  `feat:` or `fix:` prefixes, no bullet lists of files.
- Say what you checked. "Ran build and test, checked the contrast on the new
  badge" is worth more than a description of the diff.
- Adding a dependency? Run `npm run relock` afterwards, not just
  `npm install <pkg>`. An incremental install on macOS prunes optional
  dependencies that only resolve on other platforms, and CI's `npm ci` then
  fails on Linux.

## What will probably be declined

Not because it is bad work, but so you do not spend an evening on it:

- A rebrand. This is a restructure, not a rebrand: the dark cosmic identity and
  the Riso palette stay.
- Analytics, tracking, or anything that phones home. There is no login, no
  account and no telemetry, and that is a feature stated on the site.
- Moving credentials or model calls into anything the browser runs.
- A framework migration. React is one island on `/story` and is staying that
  way.
- Editorial changes that make the copy sound like a press release.

## Reporting something sensitive

Security issues and anything involving a leaked credential go to
[SECURITY.md](SECURITY.md), not to a public issue.
