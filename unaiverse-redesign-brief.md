# UNAIVERSE Redesign Brief — From Tour to Tool

**Project:** mafiatun.github.io/unaiverse (existing Astro + Three.js + GSAP site)
**Author:** Mafi · **Date:** 1 August 2026
**Executor:** Claude Code, operating as pilot. This brief defines *what* and *why*; you decide *how*, within the constraints below.

---

## 1. The problem

The site's content is strong (76 milestones, 236 receipts, 156 persona takes, agenda, glossary, story view) but the current experience buries it. Real-user feedback: **cluttered, confusing, unclear what the site does or who it's for.**

Root cause: the site is built as a **tour** — a one-time spectacle where everything (stats, badges, all eight persona takes, all receipts) is rendered at once on one endless scroll. Go-to status requires a **tool**: something that answers a recurring question faster than Google, a colleague, or docs.un.org.

This redesign converts the tour into a tool while keeping the tour as an opt-in showcase mode.

## 2. Objective (the one sentence)

> **UNAIVERSE helps anyone in the UN system get current on the UN's AI work — look up any milestone with its official source, understand what it means for their specific role, and track what's coming — in minutes, on any connection.**

The 5-second test: a first-time visitor shown the homepage for 5 seconds must be able to answer "what is this and who is it for?" If a design decision doesn't serve that sentence, cut it.

## 3. Audience strategy

Users can be **anyone from the UN** — which argues for a narrow entrance, not a wide one. Wide audience, narrow doors, personalized rooms:

- The existing **eight personas** (Peace & Security, Development & Policy, Human Rights, Data & Digital, Front Office, OPGA, Builders, Permanent Missions) become **navigation**, not display clutter. A visitor picks their role once; the whole site filters to it.
- Add a **ninth default: "Just curious / new to AI"** — routes to Start Here + Learn with the most general framing. The picker is always skippable; this is the fallback.
- Role choice persists (localStorage) and is changeable from any page.
- **Never show all eight takes at once.** Default: the visitor's persona take only, with a quiet "other roles" expander.

## 4. Information architecture

### Homepage = router, not scroll

Replace the current all-content homepage with a lightweight page containing, in order:

1. **One-line value prop** (derived from the objective sentence; keep the lovingly-sarcastic voice).
2. **Search box, front and center** — the single highest-value element for repeat visitors.
3. **Four doors** (cards, one line of description each):
   - **Look something up** → search / browse timeline (collapsed cards)
   - **Brief me — I'm new to this file** → Start Here (role-aware)
   - **What's on the horizon** → Agenda + calendar subscribe
   - **Explore the universe** → the galaxy showcase (opt-in)
4. **Role picker** (compact, skippable, remembered).
5. **Freshness line:** "Updated {date} · {latest change}" linking to a changelog.

**Remove from homepage:** the stats block (76/236/156 — it reports effort, not benefit; one modest footer line max), zone navigation, and all expanded milestone content.

### Timeline view (the default browse experience)

- Milestones as **collapsed cards**: date · title · tier icon · one-line "why it matters." Nothing else.
- Card → detail view: summary, receipts, the visitor's persona take. Other takes behind an expander.
- **Badge diet:** max two badges per card (tier + one category). FIRST-EVER, location, org, take-count move into the detail view as metadata.
- Filters: category, tier, year, body (GA / SC / HRC / agency). Quiet UI, not a control panel.

### Galaxy = opt-in showcase mode

The Three.js/GSAP experience survives intact as the fourth door. It is dessert, not the front door. Regular users must be able to live in the site without ever loading it. Lazy-load all heavy assets only when this mode is entered.

## 5. The four journeys — acceptance tests

Ship only when all four pass. Test on a real phone and with throttled 3G.

### J1 — DPPA officer prepping a LAWS briefing (desktop, stressed, 3 minutes)
1. Homepage → search "autonomous weapons" **and** "78/241" (symbol search must work).
2. Results show the CCW track, A/RES/78/241, the SG–ICRC joint call, A/79/88.
3. Opens the resolution card: date, vote count, summary, **her** Peace & Security take, receipt links.
4. **Copy buttons** on the document symbol and the safe line — one tap each.
5. The card has a **stable deep link** she can paste to her team.
**Pass =** from homepage to copied symbol + safe line in under 3 minutes, ≤ 3 clicks after search.

### J2 — Intern, phone, zero context
1. Homepage loads fast on mobile (see performance budget) → reads value prop → **skips** the role picker.
2. Taps "Brief me" → 10-minute Start Here in plain language.
3. Jargon is underlined; tapping opens the Learn definition **inline as a popover** — never navigates away.
4. Finishes → invited to "Explore the universe" → galaxy wow moment → shares link.
**Pass =** full journey with zero role selection; glossary never requires leaving the brief; galaxy loads only at step 4.

### J3 — Mission delegate, bookmark, second visit, 5 minutes
1. Homepage → "What's on the horizon" → Agenda.
2. Scans upcoming items and open obligations; items changed since last publish carry a **"new/updated" badge**.
3. Subscribes to the calendar feed (retention engine — this puts UNAIVERSE inside Outlook).
**Pass =** agenda reachable in 1 click; changed items visibly flagged; calendar subscribe works.

### J4 — Front-office speechwriter needs a safe line (new journey, build for it)
1. Homepage → search or persona cheat sheet → **Safe Lines library**: the speech-ready lines already written inside takes, surfaced as a copyable, filterable collection (by topic and persona).
**Pass =** any safe line findable and copied in under 1 minute.

## 6. Feature spec

**Build:**
- **Search** — client-side index (e.g. Pagefind or Fuse.js over Astro content) covering titles, summaries, document symbols, glossary terms, safe lines. Symbol patterns ("78/265", "S/PV.9381") must match.
- **Role memory** — localStorage persona; filters takes site-wide; switchable anywhere; ninth "general" default.
- **Deep links** — stable URL per milestone (and per glossary term); works with SSG on GitHub Pages.
- **Copy buttons** — on document symbols, safe lines, and citations.
- **Persona cheat sheets** — one page per persona: the ~10 milestones that matter for that role, their safe lines, key symbols. Print-friendly CSS. These are the forwardable assets.
- **Safe Lines library** — extracted from existing take content; no new writing needed.
- **Freshness + changelog** — "last updated" on homepage; simple changelog page; "new/updated" badges on agenda and timeline items changed since previous publish.
- **Inline glossary popovers** — Learn's 307 terms become tap-to-define everywhere; the standalone Learn page remains for browsing.

**Explicitly demote or cut:**
- Stats block → footer one-liner or gone.
- Badge soup → two per card max.
- All-eight-takes display → visitor's take + expander.
- Zone navigation as primary structure → zones become labels within the timeline, not the site's spine.
- Auto-loading Three.js/GSAP on entry → galaxy mode only.

## 7. Design & performance constraints

- **Performance budget (default, non-galaxy experience):** usable on a mid-range Android over field-mission internet. Target initial payload < 200 KB JS for router/timeline pages; Lighthouse mobile ≥ 90; content visible < 3 s on throttled 3G. Astro's static output makes this achievable — keep the default experience close to zero-JS.
- **Voice:** keep the existing tone — playful, lovingly sarcastic, receipts-forward. **Hard rule: nothing that makes the UN look bad or is politically controversial.**
- **Receipts are sacred:** every claim keeps its source link. Never trade a receipt for cleanliness.
- **Accessibility floor:** keyboard navigable, visible focus, reduced-motion respected (galaxy included), sensible contrast.
- **Visual continuity:** this is a restructure, not a rebrand. Keep the existing dark cosmic identity; spend design effort on hierarchy, density, and typography discipline in the new collapsed-card and router layouts.

## 8. Out of scope (this phase)

- New milestone content or new persona writing (cheat sheets and Safe Lines reuse existing content).
- Accounts, backends, analytics platforms (a privacy-light counter is fine if trivial).
- Rewriting the galaxy experience.

## 9. Definition of done

1. All four journey tests pass on desktop and a real phone.
2. 5-second test passes with at least three fresh UN colleagues.
3. Performance budget met on the default experience.
4. Galaxy mode still delivers the wow, untouched, behind its door.
5. Changelog shows the redesign as its first entry.
