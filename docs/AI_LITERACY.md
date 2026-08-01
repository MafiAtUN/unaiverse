# The AI Literacy Universe

The implementation note for the second half of UNAIVERSE: what was added, what
it was built on, and how to operate it.

The timeline explains **what the United Nations has done about AI**. This half
explains **the words**. They are one site, one design system, one build.

---

## 1. What was already here, and what was reused

UNAIVERSE is an **Astro 7** static site deployed to GitHub Pages at
`https://mafiatun.github.io/unaiverse` under the base path `/unaiverse`. Before
this work it was five routes: the galaxy timeline (`/`), `/agenda`, `/inherit`,
`/story` (the only React island) and `/timeline` (TimelineJS), plus `.ics` and
RSS endpoints.

| Existing thing | How the literacy area uses it |
| --- | --- |
| `src/layouts/Base.astro` | Wrapped, not replaced. `layouts/Learn.astro` adds a nav bar and footer and inherits the head, fonts, canonical URL and social metadata. Base gained three optional props (`ogType`, `head`, `skip`) and no behavioural change. |
| `src/styles/tokens.css` | Untouched. `styles/learn.css` uses the same Riso palette, type scale, spacing scale and paper metaphor. No new colours were introduced. |
| `src/lib/glossary.ts` | Untouched. Its 30 slugs are mapped to term pages by `lib/learn/timeline.ts`. |
| `src/components/ABot.astro` | A/BOT keeps its own two-line definitions and its voice. It gained one affordance: a "Learn this concept fully" link, shown **only** for glossary terms that have a published page. |
| `content/milestones/` | Referenced by id, never duplicated. Term pages list the milestones that mention them; the index is computed at build time. |
| `.github/workflows/deploy.yml` | Same shape, same `npm run build`, no credential needed. Two gates were added around the build: `content:validate` before it and `npm test` after it. |

Deliberately **not** changed: the timeline's content, its filters, its URL
structure, its take slots, its quest definitions, its personas, its Big Bang, or
the way it is deployed.

Three things on the timeline side *were* changed, all additive: a fourth door in
the hero pointing at `/learn`, a deep-link handler so `/#milestone-id` opens the
milestone panel instead of scrolling to a closed one, and A/BOT's new "learn
this concept fully" link. Six pre-existing TypeScript errors in
`story/ExploreCanvas.tsx` and `ABot.astro` were also fixed — they had never
surfaced because `@astrojs/check` was not installed.

---

## 2. Routes added

| Route | What it is |
| --- | --- |
| `/learn` | Landing page. Search-first: "What AI term did you just hear?" |
| `/learn/[slug]` | **307 term pages**, one per published term. |
| `/learn/explore` | Every term by category, filterable by depth and audience in the browser. |
| `/learn/category/[id]` | 16 category pages, ordered starter-first. |
| `/learn/a-z` | Alphabetical index. No JavaScript at all. |
| `/learn/paths` and `/learn/paths/[id]` | 15 guided learning paths with local progress. |
| `/learn/compare` and `/learn/compare/[id]` | 15 side-by-side comparisons. |
| `/learn/map` | Concept map, with a full nested-list equivalent on the same page. |
| `/learn/saved` | Saved terms, progress, recently viewed, and a delete-everything button. |
| `/learn/methodology` | How the content was produced and reviewed, with live corpus numbers. |
| `/learn/search.json` | The precomputed search index, fetched once by the client. |
| `/sitemap.xml` | Now generated (it replaced a five-URL static file that could not keep up). |

**366 pages** total, up from 5.

---

## 3. Components added

Under `src/components/learn/`:

| Component | Job |
| --- | --- |
| `TermSearch.astro` | Typo-tolerant combobox. Two variants (floating panel in the nav bar, inline in a hero). Fetches the index on first interaction. |
| `TermVisual.astro` | Renders a term's visual: dispatches to a hand-built explainer if one exists, otherwise the generic step diagram. Always adds the learning objective, the prose alternative and the reduced-motion note. |
| `QuickCheck.astro` | The one knowledge-check question, with an announced verdict and a teaching explanation. |
| `ResourceList.astro` | External reading, each card stating type, publisher, difficulty and whether the link was actually fetched. |
| `TermControls.astro` | Save, mark-as-understood, and the disclosure-depth preference. |
| `visuals/*.astro` (12) | The bespoke interactive explainers. |

Supporting libraries under `src/lib/learn/`: `schema.ts` (the content model,
shared with the Node scripts), `terms.ts` (the published corpus),
`search.ts` (pure scoring, unit-tested), `paths.ts`, `compare.ts`,
`timeline.ts` (the bridge to the milestone corpus). Plus
`src/scripts/learn-store.ts` for local storage.

### The twelve interactive explainers

These exist where a static diagram genuinely cannot teach the mechanism.

| Term(s) | What you do |
| --- | --- |
| Gradient descent | Set the learning rate and watch the walker creep, converge, or overshoot and diverge. |
| Backpropagation | Step through forward pass → compare → assign blame → update, with blame shown as line thickness. The point is that stage 3 and stage 4 are different things. |
| Token, Tokenisation | Type a sentence and watch it split into whole words, word pieces and punctuation. |
| Context window | Load documents onto a desk of adjustable size and watch the oldest slide off. |
| Parameter | A panel of dials that training sets — and a "find the dial for one fact" button that deliberately fails. |
| Embedding | A two-dimensional map where the nearest phrase often shares no words at all. |
| Attention, Self-attention | Select a word in an ambiguous sentence and see what it leans on. |
| RAG | The same question down two lanes: one cites a source, one cannot. |
| Overfitting | One slider, two scores moving in opposite directions. |
| Hallucination | One missing fact, three possible behaviours. |
| Precision, Recall, False positives | Move the threshold; watch precision and recall trade, and watch accuracy stay uselessly high throughout. |
| Temperature | The same next-word choice reshaped, with the probabilities printed. |

Every one of them: states its learning objective, has a keyboard path (buttons
as well as sliders), prints a plain-language readout of the current state in an
`aria-live` region, carries a prose alternative, and does nothing essential
through motion alone. Each is loaded through a glob so a term page ships only
the one script it needs.

---

## 4. The content model

`src/lib/learn/schema.ts` is a Zod schema, imported by **both** the Astro build
and the Node scripts (Node strips the types, so there is one definition and no
drift). Full shape in that file; the fields that matter:

```ts
interface TermExplanation {
  id, slug, term, acronym?, aliases[], categoryId, subcategory?,
  difficulty: 'starter' | 'intermediate' | 'deeper',
  audiences: Audience[],
  prerequisiteTermIds[], relatedTermIds[], oftenConfusedWith[],

  oneSentence, plainExplanation,
  everydayAnalogy: { title, story, mapping[{analogyElement, aiElement}], limitation },
  visual: { type, title, learningObjective, description, steps[],
            interaction?, accessibilityDescription, reducedMotionDescription, component? },
  workedExample: { scenario, input?, process[], result },
  unWorkplaceExample: { scenario, relevance, caution? },
  whyItMatters, whereYouMayHearIt[],
  commonMisconceptions[{misconception, correction}],
  simpleVsTechnical: { simple, technical },
  keyTakeaway,
  quickCheck: { question, options[], correctOptionIndex, explanation },
  resources: LearningResource[],
  searchKeywords[], contested?,

  contentVersion, reviewed, reviewerNotes?, lastReviewed?,
  generation?: { model, deployment, promptVersion, generatedAt, contentHash,
                 attempts, promptTokens, completionTokens },
}
```

The schema is strict on purpose. A term with no analogy limitation, no
screen-reader description, no reduced-motion note, or a quiz whose answer index
is out of range is not a slightly worse page — it is a page that teaches
something wrong, so it cannot be published.

### Where content lives

```
content/learn/
  taxonomy.json              307 terms in 16 categories: the source of truth
  resources/
    curated.json             hand-authored real URLs + Wikipedia overrides
    wikipedia.json           articles confirmed to exist via the Wikipedia API
  generated/                 drafts a model wrote; NOT on the site
  reviewed/                  what the site renders. 307 files.
  rejected/                  failed attempts, kept for debugging
  generation-manifest.json   per-term status, hashes, token counts
  link-report.json           every URL and whether it answered
  content-report.md          the quality report
```

**The publication gate is one glob.** `src/lib/learn/terms.ts` reads
`content/learn/reviewed/*.json` and nothing else. A draft cannot ship by
accident because the site cannot see it.

---

## 5. Azure OpenAI setup

The public site never calls Azure. Generation is a development-time script that
writes JSON to disk.

```bash
cp .env.template .env
# then fill in:
#   AZURE_OPENAI_ENDPOINT=https://YOUR-RESOURCE.openai.azure.com/
#   AZURE_OPENAI_API_KEY=...
#   AZURE_OPENAI_DEPLOYMENT=your-deployment-name   # a deployment, not a model
#   AZURE_OPENAI_API_VERSION=2024-10-21
```

`.env` is gitignored. The deployment name is configurable and **no model name
is hardcoded anywhere in this repository**. `npm test` asserts that no Azure
identifier and no `.env` value appears in `dist/`.

Without credentials everything still works: `--dry-run` prints the prompts and
calls nothing, `--fixtures` generates from recorded fixtures, and
`content:validate`, `content:report` and `content:check-links` need no
credentials at all.

---

## 5b. The two passes after generation

Generation gets a term written. Two further passes make it worth reading.

### The adversarial review (`content:review`)

A **different model** from the one that wrote the corpus reads each page looking
for what is wrong with it. Independence is the point: `npm test` fails if the
reviewer deployment ever equals the writer's, because a model marking its own
homework is not a check.

It is given each term's confused-with neighbours so it can verify the
distinctions actually hold, may rewrite a bounded set of fields, may never
introduce a fact or a URL, and every rewrite is re-validated against the schema
before it is kept. Findings land in `content/learn/review-report.md` and in a
`machineReview` field on each term.

It found, among 865 error-level observations across the corpus: a definition
saying a model handles tokens "at one step" (input tokens are processed
together, only generation is sequential); a hallucination example that never
established anything was actually false; a RAG example citing a document that
did not exist; and a bug in this repository where the precision explainer
printed "0%" for the undefined 0/0 case.

**What it does not do is human review.** It catches arithmetic, circular
definitions, indefensible quiz answers and blurred distinctions. It does not
catch a fluent, confident, wrong account of a mechanism.

### The United Nations voice pass (`content:voice`)

The generated corpus read as though written *about* the Organization: "a UN
team explores a model", "a UN office wants a system". Those are placeholders
standing where a person should be.

This pass replaces the setting and the register, never the mechanism, and
deliberately **does not touch `oneSentence` or `plainExplanation`** — those are
the part a newcomer reads, and this site is for the public as much as for
staff. It rewrites the UN workplace example, the worked example, where you may
hear the term, and the key takeaway.

Two guards make it safe:

- **A rotating role, setting and moment per term**, seeded from the term id.
  Without it the model copies whatever example the prompt shows it, and three
  hundred pages end up sharing one duty officer. `content:report` and `npm test`
  both check for near-duplicate scenarios by six-word overlap.
- **An approved-reference sheet** built from `content/milestones/`, which is the
  sourced timeline corpus. The pass may cite only those document symbols, and
  anything symbol-shaped that is not on the list is refused outright. Adding
  institutional specificity is exactly how a corpus acquires an invented
  `A/RES/79/412`, and a delegate might quote it.

## 6. Commands

```bash
# One term
npm run content:generate -- --term gradient-descent

# Everything not yet generated (resumable: re-run to retry only what failed)
npm run content:generate

# A whole category, ten at a time, six in flight
npm run content:generate -- --category agents --limit 10 --concurrency 6

# No credentials
npm run content:generate -- --term token --dry-run
npm run content:generate -- --term token --fixtures

# Overwrite something that already exists (refuses without --term/--category)
npm run content:generate -- --term token --force

# Anything written under an older prompt version
npm run content:generate -- --regenerate-stale

# The two passes after generation
npm run content:review -- --term weight --audit      # report only, change nothing
npm run content:review -- --errors-only              # apply only what is false
npm run content:review -- --reviewer gpt-5.5         # a third opinion
npm run content:voice -- --term overfitting --audit  # show what it would change
npm run content:voice                                # everything not yet done
npm run content:voice -- --force --term overfitting  # redo one

# Validate, check links, report
npm run content:validate
npm run content:check-links
npm run content:check-links -- --stale 30
npm run content:report

# Resolve Wikipedia articles for new taxonomy entries
npm run content:wikipedia

# Review gate
npm run content:publish -- --list
npm run content:publish -- --term token --by "Name" --note "checked the tokeniser claim"
npm run content:publish -- --category foundations
npm run content:publish -- --term token --reject --note "the analogy is wrong"

# Tests, types, build
npm test
npm run check
npm run build
```

The generator is **resumable and checkpointed**: it skips anything already
generated or reviewed, records every term in the manifest, and honours
`retry-after` on rate limits with exponential backoff and jitter.

---

## 7. How a term is written

1. **The taxonomy names it.** `content/learn/taxonomy.json` supplies the id,
   category, difficulty, audiences, aliases, prerequisites and the terms it is
   commonly confused with.
2. **Resources are assembled first, by code.** From `curated.json`, from the
   Wikipedia API, or from a search-URL template. The model is shown the links
   and writes only the sentence saying why each is useful. **It is never asked
   for a URL** — a model asked for a URL will eventually invent one. 228 of 307
   terms resolved to a real Wikipedia article; the other 79 get an honest
   search link rather than a guessed one.
3. **One term goes to Azure OpenAI** with a fixed system prompt and a JSON
   Schema the response must conform to (structured output, `strict: true`).
   Without the schema the model paraphrases key names and silently drops
   fields.
4. **The answer is validated with Zod.** On failure the specific issues are fed
   back and it retries, up to three times. Rejected attempts are written to
   `content/learn/rejected/`.
5. **The pipeline assembles the record**: taxonomy metadata, cleaned term links
   (ids filtered against the taxonomy, self-links dropped), the interactive
   component id, the resource list with the model's notes zipped on, a content
   hash and the generation metadata.
6. **`content:check-links` fetches every URL** and records `verified` plus a
   date. Anything unconfirmed is labelled "link not verified" **on the page**
   rather than presented as vetted.
7. **A person reviews and publishes.** `content:publish` re-validates, stamps
   `reviewed: true` and the date, and copies to `reviewed/`.

To regenerate one term after editing the prompt:

```bash
npm run content:generate -- --term token --force
npm run content:validate
npm run content:check-links -- --stale 0
npm run content:publish -- --term token --by "Name"
npm run build
```

---

## 8. Review and publishing workflow

`npm run content:publish -- --list` shows what is waiting. For each term, a
reviewer should check:

- the one-sentence definition is correct and does not define the term with itself;
- the analogy's stated limitation is the *real* limitation;
- the worked example's numbers are consistent;
- the UN example is realistic and its caution is right;
- the quiz has exactly one defensible answer and plausible distractors;
- nothing anthropomorphises the model (the validator flags likely cases);
- nothing claims a fact, statistic, date or quotation that is not supportable.

`npm run content:report` writes `content/learn/content-report.md`: totals,
coverage by category, unreachable links, reading-level outliers (Flesch–Kincaid,
flagged outside grade 4–14), duplicate definitions, orphan terms, prerequisites
pointing at unwritten pages, and what is not yet written.

**Publishing is `content:publish`, and nothing else.** There is no path from
`generated/` to the site that does not go through a person running that command.

---

## 9. Accessibility

Target: WCAG 2.2 AA.

- Semantic landmarks, one `h1` per page, no skipped heading levels — asserted
  across 27 pages by the audit in section 11.
- Every interactive control has an accessible name (asserted).
- Focus is always visible; the search field rings its wrapper so the ring is
  not clipped by the input.
- Search is a proper combobox: `aria-expanded`, `aria-activedescendant`, arrow
  keys, Enter opens the best match, Escape clears, `/` focuses from anywhere.
  Result counts are announced in a polite live region.
- Every visual has a prose alternative in a `<details>` that is never hidden
  from assistive technology, plus a stated reduced-motion equivalent.
- The concept map has a full nested-list peer on the same page — not a
  fallback, a peer. Its SVG nodes are focusable and operable with Enter/Space.
- No information is carried by colour alone: quiz verdicts are also words,
  attention weights are also percentages, blame is also line thickness, the
  current nav item is also underlined.
- `prefers-reduced-motion` is honoured; the gradient-descent walker stops
  auto-stepping and the reader steps it manually with the same readout.
- Touch targets are at least 44px. No hover-only interactions.
- No horizontal scrolling of core content at 360px (asserted). Wide diagrams
  scroll inside their own container.
- Escape closes A/BOT and returns focus to the trigger.
- The site is fully usable with local storage unavailable; the controls that
  cannot work disable themselves and say why.

---

## 10. Privacy and the no-login guarantee

There is no login, registration, password, account, protected route, role,
authentication provider, user database or server session — and there is nothing
to add one to, because the deployed artefact is static files.

Local storage holds five keys under `unaiverse.learn.`: saved terms, terms
marked understood, quick-check results, preferred depth, recently viewed.
Nothing is transmitted. There are no analytics, cookies, tracking pixels or
third-party scripts, and no font or asset is loaded from another origin
(asserted). `/learn/saved` lists exactly what is stored and deletes all of it on
one button.

---

## 11. Testing

`npm test` runs Node's built-in runner over `scripts/learn/test/` — 44 tests, no
new dependency.

- **`search.test.ts`** — the four cases from the brief (`back propogation`,
  `gradient decent`, `LLM`, `memory limit`), plus: every published term is
  findable by its own name, every alias leads to its term, nonsense returns
  nothing, and fuzzy matching does *not* fire on short different words.
- **`content.test.mjs`** — schema validity, id/slug/filename agreement, no link
  to an unpublished term, no self-links, no prerequisite cycles, one defensible
  quiz answer each, an analogy limitation on every term, a screen-reader and
  reduced-motion alternative on every visual, every named interactive component
  implemented, a UN example and two misconceptions on every term, no resource
  host that the resource builder could not have produced.
- **`build.test.mjs`** — runs against `dist/`: the original timeline still
  builds, every published term has a page, every internal link carries the
  `/unaiverse` base path, external links have `rel="noopener"`, no Azure
  identifier or `.env` value appears anywhere, no password input or auth form
  exists, the search index matches the corpus, the sitemap lists terms but not
  the local-storage page, and no page fetches from a third-party origin.

A separate browser audit (`chromium`, 27 pages × 360/768/1280px) checks for
console errors, horizontal overflow, unnamed controls and heading jumps.

---

## 12. GitHub Pages constraints

- **Base path.** Every internal URL goes through `learnHref()` / `siteHref()`,
  which prefix `import.meta.env.BASE_URL`. A hardcoded `/learn/token` works on
  localhost and 404s in production, so `build.test.mjs` fails the suite on any
  absolute link that skips the base.
- **Static only.** No SSR, no redirects, no server-side anything. Every route is
  prerendered.
- **Trailing slashes.** `trailingSlash: 'ignore'`; Astro emits directory-style
  routes and canonical URLs accordingly.
- **Deployment is unchanged** in shape: the same workflow, the same
  `npm run build`, and nothing in CI needs a credential. Two gates were added
  around the build — `npm run content:validate` before it and `npm test` after
  it — so a corpus that fails its own contract, or a build that somehow
  contained a credential, cannot reach Pages.

---

## 13. Known limitations

1. **The corpus was drafted by a language model and reviewed in one pass.** A
   review catches a great deal, not everything. Every page links to primary
   sources, and `/learn/methodology` says all of this to the reader.
2. **306 of 307 terms were written under prompt version 1.0.0**, one under
   1.1.0 (which adds an explicit reading-level target). The content report
   breaks this down, and `content:generate -- --regenerate-stale` would rewrite
   the older ones. Doing so is a judgement call about cost against marginal
   readability, not a defect to be cleared automatically.
3. **The 12 hand-built explainers use illustrative numbers**, not model output.
   Each says so on the page — the tokeniser is a teaching splitter, the
   attention weights are hand-written, the embedding map is hand-placed.
4. **79 of 307 terms link to a Wikipedia search** rather than an article,
   because no article matched confidently enough. Honest, but less useful.
5. **The link checker verifies that a URL answers, not that its content is
   still correct.** Re-run `content:check-links -- --stale 30` periodically.
6. **Reading level is estimated with Flesch–Kincaid**, which is a tripwire, not
   a measure of clarity.
7. **`/learn/saved` renders client-side**, so it is empty with JavaScript
   disabled. Every other page is complete without it.
8. **Milestone cross-links are keyword matches** over milestone prose, capped at
   five and ranked by tier. Good, not editorial.
9. **No automated axe/Lighthouse run** is wired into CI; the accessibility
   checks are the assertions listed above.

---

## 14. Recommended next steps

1. **A second review pass on the 50 Phase 2 terms**, by someone who was not
   involved in generating them, focusing on the worked examples' numbers.
2. **Add `content:check-links -- --stale 30` as a monthly scheduled job**, with
   the report opened as an issue.
3. **Fill the 79 missing Wikipedia links by hand** in `curated.json`, and
   replace the YouTube and Reddit search links with reviewed specific pages
   where a good one exists.
4. **Translate the 50 starter terms.** The audience is multilingual and this is
   the highest-value expansion available.
5. **More interactive explainers**, in this order: `diffusion-model`,
   `semantic-search`, `class-imbalance`, `distribution-shift`,
   `prompt-injection`.
6. **A "what changed" feed** — the corpus has content hashes and review dates,
   so a diff view of terminology drift is nearly free.
7. **Cross-link the other direction**: show the concepts in a milestone panel on
   the timeline. `termsForMilestone()` in `lib/learn/timeline.ts` already
   returns them; nothing renders it yet.
