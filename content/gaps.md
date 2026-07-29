# X. Gaps and open questions

*Status updated by the Phase 1 verification pass, 28 July 2026. See `VERIFICATION_LOG.md` for evidence and method.*

## Closed in Phase 1

1. ✅ **Security Council record symbols.** Confirmed: the 19 December 2024 briefing is the Council’s **9821st meeting (S/PV.9821)**; the 24 September 2025 open debate is the **10005th meeting (S/PV.10005)**, continued over two resumptions. Both symbols validated against the ODS symbol service and corroborated by UN Web TV meeting titles and meetings coverage.

5. ✅ **Secretariat generative-AI guidance.** A public document was located: *Updated UN Guidance on the Use of AI Tools at Work*, 5 March 2025, revising guidance first issued in June 2023. It is UN 2.0/OICT guidance, **not** a Secretary-General’s bulletin or administrative instruction — the milestone says so explicitly. Also added: the CEB *Framework for a Model Policy on the Responsible Use of AI in the UN System* and the CEB *Report on the Operational Use of AI in the UN System*.

10. ✅ **Vote records.** Confirmed against UN Digital Library voting data: A/RES/78/265, A/RES/78/311 and A/RES/79/325 adopted **without a vote**; A/RES/78/241 adopted by recorded vote **152-4-11** (50th plenary meeting); A/RES/79/239 adopted by recorded vote **159-2-5** (55th plenary meeting). Authoritative vote-record links now sit in both milestone files. Country-level voting data is available at those records if the site later wants to expose it.

18. ✅ **Independent verification of links.** All 176 URLs in `content/milestones/` were checked. Ten dead links were found and replaced; none remain broken. See the log for the caveat about hosts that block automated clients.

**Also resolved (was flagged UNVERIFIED in the milestone files, not listed here):** the Secretary-General’s mandated report on military AI has been published as **A/80/78** (5 June 2025, reissued for technical reasons 4 February 2026). The `na-secretary-generals-report-on-military-ai` node is no longer a forward-looking placeholder — **see `VERIFICATION_LOG.md` for a zone/tier decision this creates for Mafi.**

## Still open

2. **Complete Security Council inventory:** Search the Security Council Repertoire and all meeting records for sessions where AI featured substantially under counter-terrorism, non-proliferation, peacekeeping, information integrity, cybersecurity or emerging technologies, even when AI was not in the meeting title. *(Note: a May 2024 Arria-formula meeting organized by Switzerland on AI in peace operations surfaced during this pass and is not yet a node.)*

3. **2026 Global Dialogue outcome:** Each Dialogue closes with a **co-chairs’ summary** rather than a negotiated outcome — that much is now confirmed and stated in the node. The Geneva summary itself had not been posted at a stable official URL as of 28 July 2026. Re-check before launch.

4. **Scientific Panel terminology:** The official 1 July 2026 publication is titled *Preliminary Report*. Some programme text described the presentation as an annual or first report. The site uses the published title and explains the terminology in the node.

6. **OICT AI register:** No public, comprehensive register of Secretariat AI systems, models, vendors, impact assessments, risk ratings or evaluation results was found.

7. **OCHA generative-AI policy:** OCHA’s public data-responsibility framework is relevant, but no consolidated public policy governing all generative-AI use was located.

8. **Human Rights Council inventory:** A full resolution-by-resolution inventory should cover privacy, discrimination, freedom of expression, business and human rights, military technologies and digital civic space. Several relevant resolutions do not contain “artificial intelligence” in the title.

9. **UNESCO RAM totals:** The number of participating and completed countries changes regularly. The website should retrieve live information from UNESCO’s Observatory instead of hard-coding a total.

11. **Membership maintenance:** The High-level Advisory Body and Scientific Panel roster pages should be stored with retrieval dates. Affiliations and biographies may change while membership remains fixed. *(Panel membership itself is now pinned: 40 members appointed 12 February 2026 for a term to 11 February 2029.)*

12. **Additional agencies:** FAO, UNEP, WMO, UN Women, UNFPA, UNODC, UNCTAD, WIPO, ICAO, IMO, the World Bank Group and the regional commissions have additional AI work suitable for a second research phase.

13. **Peacekeeping deployments:** Mission-level AI systems, procurement decisions, model governance and impact assessments are not consistently disclosed publicly.

14. **May 2027 Dialogue:** Exact dates, venue, registration process, co-chairs, themes and preparatory consultations were not public as of 28 July 2026.

15. **Global Digital Compact review:** The eighty-second-session review is mandated, but its exact preparatory process, reporting architecture and stakeholder participation arrangements remain to be specified.

16. **UNIDIR conference chronology:** UNIDIR’s event archive should be queried manually to create a complete annual list of AI, Security and Ethics conferences, including programme links and speaker rosters.

17. **Secretary-General quotations:** Every quotation included in the production website must be checked against the linked transcript immediately before publication, particularly where website pages are updated after events. `content/quotes.md` now carries this as a standing rule.

## New in Phase 1

19. **Hosts that block automated verification.** OHCHR, UNDP, UNHCR, UNICEF, UNESDOC, UNCTAD, OpenAI and Reuters return 401/403 to every automated client, including the site’s own link checker. Their URLs were confirmed live through independent search-engine indexes instead, but **21 URLs have never been opened in a real browser by this pass**. They are listed in `VERIFICATION_LOG.md` and need one manual click-through before launch. Any automated link checker added in Phase 6 must allowlist these hosts or it will report permanent false failures.
