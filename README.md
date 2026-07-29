# 🌌 UNAIVERSE

**One data nerd's lovingly sarcastic map of the UN's AI universe.**

> Live site: `https://mafiatun.github.io/unaiverse` *(once Phase 2 ships)*

## What is this?

For roughly 77 years, the United Nations was busy with minor side quests — peace, human rights, development — and mentioned artificial intelligence approximately never. Then a chatbot launched in November 2022, and suddenly every conference room in Turtle Bay had opinions about neural networks.

UNAIVERSE is an interactive, fly-through galaxy of everything the UN has done about AI since: every resolution, report, summit, panel, and robot press conference — each one a glowing node with links to the original documents (*receipts included*), a plain-language TL;DR, and tailored takes for eight kinds of UN reader, from Security Council watchers to the person who has to write the briefing note by 6pm.

Your guide through the galaxy is **A/BOT** 🤖 — a droid with junior-staffer energy and a weakness for acronyms, who explains AI governance through *Star Wars*, Asimov, and the occasional dragon.

All facts are sourced to official UN documents. All jokes are the author's own and aimed strictly at hype and bureaucratic pacing — never at the Organization, its officials, or any Member State.

## Who made this?

**Mafi (Mafizul Islam)** — UN data specialist, incoming Senior Adviser on Data, AI and Strategic Foresight at the Office of the President of the General Assembly. Built with [Claude Code](https://claude.com/claude-code), because a site about AI should probably be built with some.

## Repository map

| Path | What it is |
|---|---|
| `UN_AI_TIMELINE_PLAN.md` | Master plan: concept, design, stack, tone rules, build phases |
| `CONTENT_SPEC.md` | Tiers, badges, the eight personas, take formula, generation prompt |
| `research.md` | The sourced research base (~75 milestones, 2017 – Jul 2026) |
| `content/milestones/` | One file per milestone, frontmatter carries tier/badges/personas |
| `content/quotes.md` | Key official quotations, sourced |
| `content/gaps.md` | Known gaps and open questions from the research pass |
| `takes_manifest.json` | Every milestone × persona pair awaiting a generated take |

## Stack

Astro · Three.js · GSAP · deployed via GitHub Actions to GitHub Pages.
Reduced-motion and mobile modes are first-class citizens, not afterthoughts.

---

*This is a personal project. It is not an official United Nations product, and nothing here represents the views of the UN or any of its offices. It does, however, link to a lot of things that do.*
