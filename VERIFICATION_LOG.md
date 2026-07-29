# VERIFICATION LOG — Phase 1

**Pass run:** 28 July 2026 · **Scope:** every link, date and document symbol in `content/milestones/` (76 files), plus `content/quotes.md` and the open items in `content/gaps.md`.
**Rule applied:** frontmatter `tier`, `badges` and `personas` are authoritative and were not reassigned — except `⚠ UNVERIFIED`, which `CONTENT_SPEC.md` §2 defines as "carried from research.md **until Phase 1 clears it**."

---

## 1. Headline numbers

| | Before | After |
|---|---|---|
| URLs in milestone files | 158 unique | 183 unique |
| Dead links (404/503) | **10** | **0** |
| Milestones flagged `unverified: true` | 4 | **0** |
| `[UNVERIFIED]` markers in prose | 7 | 0 (2 rewritten as sourced statements of fact, 5 cleared) |
| Document symbols validated against ODS | — | 25 of 25 |
| Factual errors found and corrected | — | **6** |

Corpus integrity re-checked after all edits: 76 milestones, tiers **9 / 27 / 40** exactly as `CONTENT_SPEC.md` §6 specifies, 156 persona slots matching `takes_manifest.json` one-for-one, no orphan IDs, every file carries `**Sources:**` and `**Why it matters:**`.

---

## 2. Method — and why it is not just a link checker

Three UN hosting patterns make HTTP status codes worthless as proof, which is worth recording because it will bite the Phase 6 link checker too:

- **`docs.un.org` is a single-page app.** It returns `200` for *any* path. `https://docs.un.org/en/A/RES/79/999` — a resolution that does not exist — returns `200` and renders an empty document viewer.
- **`www.un.org` and `press.un.org` return `202` with an empty body**, or a JavaScript challenge page, to every non-browser client. A `202` proves nothing about whether the page exists.
- **Several agency hosts return `403` to all automated clients** (see §6).

So symbols and dates were verified against sources that *do* answer honestly:

1. **ODS symbol service** — `documents.un.org/api/symbol/access?s=<SYMBOL>&l=E&t=doc`. A valid symbol redirects to a real document path; an invalid one redirects to `/error`. Confirmed by control test: `S/PV.99999`, `A/79/PV.999` and `A/RES/78/9999` all correctly rejected.
2. **The resolution texts themselves**, downloaded from ODS and read directly. GA resolutions carry the line "Resolution adopted by the General Assembly on \<date\>" plus the draft symbol — this is the authoritative adoption date.
3. **UN Digital Library record pages** (`digitallibrary.un.org/record/<id>`) — fetchable, and the authoritative source for meeting record, draft symbol, committee report, adoption note and vote tally.
4. **Independent search-engine indexes** for the WAF-blocked hosts in §6.

---

## 3. Factual errors found and corrected

**These are the six things that would have shipped wrong.**

### 3.1 Wrong adoption date — A/HRC/RES/41/11
`2019-human-rights-council-resolution-on-new-and-emerging-dig.md` gave **12 July 2019**. The resolution text reads "Resolution adopted by the Human Rights Council on **11 July 2019**". 12 July was the closing date of the forty-first session, not the adoption date. Corrected, and the node now also states the resolution was adopted without a vote.

### 3.2 Wrong press release — Dec 2024 Security Council debate
Cited `press.un.org/en/2024/sc15947.doc.htm`. **sc15947 is a meeting on Sudan.** The AI debate is **sc15946**. The Secretary-General's remarks were also cited as `sgsm22503`; the correct symbol is **sgsm22500**. Both corrected.

### 3.3 Wrong press release — Sep 2025 Security Council debate
Cited `sc16177` and `sgsm22829`. Correct symbols are **sc16180** ("'Innovation Must Serve Humanity — Not Undermine It'") and **sgsm22830**. Both corrected.

### 3.4 Wrong Digital Library record — A/RES/78/241
The LAWS node linked `digitallibrary.un.org/record/4033292`. That record is **a 2023 European Union statement on the Global Counter-Terrorism Strategy** — entirely unrelated. Replaced with **record/4031004**, the actual voting record.

### 3.5 Conflated dates — Scientific Panel membership
`2026-scientific-panel-membership-and-co-chairs-confirmed.md` dated the whole thing "March 2026". Two distinct events:
- **12 February 2026** — the General Assembly *appointed* the 40 members, by recorded vote, for a term to 11 February 2029.
- **3 March 2026** — the Panel *elected* Bengio and Ressa as co-chairs at its first plenary.

Date corrected to "12 February – 3 March 2026" and the node rewritten to distinguish the two. Also added, all sourced: 2,600+ applications from 140+ countries, independent review by ITU/ODET/UNESCO, 19 women and 21 men across all five regions. **This closes the open item in the master plan §3** ("Early 2026 — Scientific Panel members appointed *(verify exact date + names of co-chairs)*").

### 3.6 Unsourced statistic — the Big Bang node
The ChatGPT node claimed "within two months it reached an estimated 100 million users" and carried a bracketed instruction to verify or soften. Traced to a UBS analysis using Similarweb data, reported 1 February 2023: **100 million monthly active users in January 2023**. The claim is now precisely worded, attributed, and carries its receipt. The bracketed instruction is gone, and the OpenAI link moved from the retired `/blog/chatgpt` path to the canonical `/index/chatgpt/`.

---

## 4. Dead links replaced (10)

| Was (404/503) | Now |
|---|---|
| `unicri.org/artificial-intelligence-and-robotics` | `unicri.org/topics/ai_robotics` + establishment news release |
| `disarmament.unoda.org/the-convention-on-certain-conventional-weapons/background-on-laws-in-the-ccw/` | `disarmament.unoda.org/en/our-work/emerging-challenges/lethal-autonomous-weapon-systems` (2 files) |
| `meetings.unoda.org/section/ccw-gge-1-2026/` | `meetings.unoda.org/ccw-/…-lethal-autonomous-weapons-systems-2026` |
| `disarmament.unoda.org/ict-security/` | `disarmament.unoda.org/en/our-work/emerging-challenges/developments-field-information-and-telecommunications-context` |
| `operationalsupport.un.org/en/technology-and-innovation` | `operationalsupport.un.org/en/technology-overview` (2 files) |
| `peacekeeping.un.org/en/unite-aware` | `unite.un.org/en/field-technology` + DPO strategy page (2 files) |
| `unsceb.org/…/2022-09/CEB_2022_2_Add.1 (English).pdf` | `unsceb.org/…/2023-03/CEB_2022_2_Add.1 (AI ethics principles).pdf` |
| `webtv.un.org/en/asset/k1l/k1ltw3q6z8` | `webtv.un.org/en/asset/k1j/k1ji81po8p` — the actual 9381st meeting recording |
| `unesco.org/en/artificial-intelligence/recommendation-ethics/readiness-assessment-methodology` | `unesco.org/ethics-ai/en/ram` |
| `publicadministration.un.org/wsis20/` | `publicadministration.un.org/en/wsis20` |

Two milestones had *only* a bare WebTV search page as their video receipt (`webtv.un.org/en/search/categories/…`); both now point at the specific meeting recordings.

---

## 5. Verified correct — no change needed

**Document symbols.** All 25 validated against ODS: A/74/821 · A/78/L.49 · A/78/L.86 · A/78/PV.63 · A/78/PV.97 · A/79/88 · A/79/L.118 · A/79/PV.89 · A/80/78 · A/HRC/48/31 · A/HRC/RES/41/11 · A/HRC/RES/51/22 · A/RES/70/125 · A/RES/75/240 · A/RES/78/241 · A/RES/78/265 · A/RES/78/311 · A/RES/79/1 · A/RES/79/239 · A/RES/79/325 · CCW/MSP/2019/9 · CEB/2022/2/Add.1 · S/PV.9381 · S/PV.9821 · S/PV.10005.

**Adoption dates, read from the resolution texts:** 78/265 → 21 Mar 2024 ✓ · 78/311 → 1 Jul 2024 ✓ · 78/241 → 22 Dec 2023 ✓ · 79/239 → 24 Dec 2024 ✓ · 79/1 → 22 Sep 2024 ✓ · 79/325 → 26 Aug 2025 ✓ · 51/22 → 7 Oct 2022 ✓ · A/79/88 → 1 Jul 2024 ✓.

**Plenary meeting numbers**, which the prose names and which were spot-on: 78/265 at the 63rd (A/78/PV.63) ✓ · 78/311 at the 97th (A/78/PV.97) ✓ · 78/241 at the 50th ✓ · 79/239 at the 55th ✓.

**Vote status behind the CONSENSUS / VOTED badges** — all correct. Both VOTED nodes now state their tallies (152-4-11 and 159-2-5); previously the 79/239 node asserted nothing.

**Event dates:** UNESCO Recommendation 23 Nov 2021, 41st General Conference, adopted by acclamation by 193 States ✓ · Advisory Body launch 26 Oct 2023, 39 members from 33 countries ✓ · SC first briefing 18 Jul 2023, 9381st meeting ✓ · Türk statement 14 Feb 2024 ✓ · Global Dialogue 6–7 Jul 2026 at Palexpo, co-chaired by El Salvador and Estonia ✓ · Preliminary Report 1 Jul 2026 ✓ · every AI for Good Summit date (2017 7–9 Jun · 2023 6–7 Jul · 2024 30–31 May · 2025 8–11 Jul · 2026 7–10 Jul) ✓.

---

## 6. The honest caveat — 21 URLs not opened in a browser

These hosts return `401`/`403` to every automated client, including this pass's checker **and** including URLs proven to exist. They were confirmed live and correctly-pathed through independent search-engine indexes, which is good evidence but is not the same as loading the page:

`reuters.com` ×1 · `openai.com` ×1 · `unctad.org` ×1 · `unesdoc.unesco.org` ×2 · `ohchr.org` ×6 · `un.org/en/delegate-…` ×1 · `undp.org` ×3 · `unhcr.org` ×4 · `unicef.org` ×3

**Action for Mafi: one manual click-through of these 21 before launch.** They are enumerated in `content/gaps.md` #19. Two of them — `ohchr.org/en/hr-bodies/hrc/advisory-committee/human-rights-implications` and `ohchr.org/en/topic/digital-space-and-human-rights` — did not surface in any search index either, so treat them as the least certain of the set.

**Also: the Phase 6 link checker must allowlist these hosts**, or CI will fail forever on links that are perfectly fine.

---

## 7. Housekeeping

- Removed a stray trailing `---` horizontal rule from 8 milestone files (harmless in raw Markdown, but it would render as a rogue divider inside the panel component).
- Replaced the unverified Secretary-General quotation in `content/quotes.md` with a sourced one from the statement welcoming A/RES/79/325 (sgsm22776, 26 Aug 2025), and added a standing rule never to quote from a press-release headline.

---

## 8. Two decisions I need from Mafi

**8.1 — The military AI node is no longer in the future.**
`na-secretary-generals-report-on-military-ai.md` was a placeholder: no symbol, no date, `UPCOMING` + `UNVERIFIED`, sitting in **Zone 3 (Horizon)**. The report has in fact been published — **A/80/78**, 5 June 2025, reissued for technical reasons 4 February 2026. I corrected the facts and cleared both badges, but I left it in Zone 3 and left its filename as `na-…`, because **where it sits is a narrative decision, not a factual one.** Options: (a) leave it in Horizon as the live thread into GA80; (b) move it to Zone 2 alongside A/RES/79/239 — it is a 2025 event; (c) merge it into the 79/239 node. Tell me which and I'll do it in Phase 2, including the file rename if you want one.

**8.2 — Sponsorship framing, for the Phase 7 voice pass.**
Two nodes describe resolutions as "the United States-led resolution" and "the China-led resolution". That is factually accurate and it is how the master plan §3 words it. It also sits close to the §4 line about geopolitical rivalry framing. In the factual sections, read individually, both are neutral and fine. Read side by side on a timeline, they invite a comparison the site does not want. My recommendation: keep the sponsorship facts (they matter to the Missions and OPGA personas) but ensure the takes never contrast the two. Flagging now so it is a conscious choice, not a discovery at Phase 7.

---

## 9. What I did not do

- **Did not re-verify the 40 Panel members' individual names and affiliations.** Membership is pinned and sourced; per-member biography drift is `gaps.md` #11.
- **Did not attempt gaps #2, #6, #7, #8, #12, #13, #16** — these are new-research tasks, not verification of existing claims, and each is a meaningful scope expansion. Say the word if any should come into Phase 2.
- **Did not touch tier, constellation, zone or persona assignments** anywhere, per your instruction.
