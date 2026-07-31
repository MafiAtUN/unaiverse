#!/usr/bin/env node
/**
 * ANNOTATE MILESTONES — venue + organ
 * ===================================
 * Adds the two taxonomy fields a permanent mission actually navigates by:
 * which duty station a thing happens in, and which body owns it.
 *
 * The mapping below is hand-written, one line per milestone, because it is an
 * editorial judgement about where each file sits and not something derivable
 * from the prose. It is kept in the repo rather than run once and discarded so
 * the assignments stay reviewable and a new milestone gets flagged as missing.
 *
 *   node scripts/annotate-milestones.mjs          # write
 *   node scripts/annotate-milestones.mjs --check  # verify only, exit 1 on drift
 *
 * Idempotent: re-running replaces the two lines, never duplicates them.
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const DIR = 'content/milestones';

/** id → [venues, organs]. See src/lib/taxonomy.ts for the vocabularies. */
const MAP = {
  '2014-ccw-process-on-lethal-autonomous-weapons-systems': [['geneva'], ['ccw']],
  '2017-first-ai-for-good-global-summit': [['geneva'], ['itu']],
  '2017-unicri-centre-for-artificial-intelligence-and-robotics': [['elsewhere'], ['agency']],
  '2018-itu-ai-and-machine-learning-standardization': [['geneva'], ['itu']],
  '2019-human-rights-council-resolution-on-new-and-emerging-dig': [['geneva'], ['human-rights-council']],
  '2019-unesco-readiness-assessment-methodology-and-ethical-imp': [['paris'], ['unesco']],
  '2020-ohchr-b-tech-project': [['geneva'], ['ohchr']],
  '2020-secretary-generals-data-strategy': [['new-york'], ['secretariat']],
  '2020-secretary-generals-roadmap-for-digital-cooperation': [['new-york'], ['secretariat', 'ga-plenary']],
  '2020-unicef-guidance-on-ai-and-children': [['new-york'], ['agency']],
  '2021-digital-transformation-strategy-for-un-peacekeeping': [['new-york'], ['secretariat']],
  '2021-open-ended-working-group-on-ict-security-and-ai-interse': [['new-york'], ['ga-first-committee']],
  '2021-privacy-in-the-digital-age-and-ai-due-diligence': [['new-york', 'geneva'], ['ga-third-committee', 'human-rights-council']],
  '2021-un-2-0-and-the-quintet-of-change': [['new-york'], ['secretariat']],
  '2021-unesco-recommendation-on-the-ethics-of-artificial-intel': [['paris'], ['unesco']],
  '2021-unite-aware-situational-awareness-platform': [['new-york'], ['secretariat']],
  '2021-who-guidance-on-ethics-and-governance-of-ai-for-health': [['geneva'], ['who']],
  // The Big Bang is the one non-UN anchor in the corpus. It has no duty
  // station and no owning body, and pretending otherwise would put a private
  // product launch inside the UN's own taxonomy.
  '2022-chatgpt-big-bang': [[], []],
  '2022-digital-public-infrastructure-and-digital-public-goods': [['system-wide'], ['secretariat', 'agency']],
  '2022-human-rights-council-resolution-on-military-technologie': [['geneva'], ['human-rights-council']],
  '2022-principles-for-the-ethical-use-of-ai-in-the-united-nati': [['system-wide'], ['ceb']],
  '2023-advisory-body-membership-and-co-chairs-announced': [['new-york'], ['advisory-body']],
  '2023-agency-chatbots-assistants-and-pilots': [['system-wide'], ['agency']],
  '2023-ai-and-the-sustainable-development-goals': [['new-york'], ['ga-plenary']],
  '2023-ai-for-early-warning-and-humanitarian-analysis': [['system-wide'], ['agency']],
  '2023-ai-for-good-global-summit-2023': [['geneva'], ['itu']],
  '2023-first-security-council-briefing-devoted-to-ai': [['new-york'], ['security-council']],
  '2023-general-assembly-resolution-on-lethal-autonomous-weapon': [['new-york'], ['ga-plenary', 'ga-first-committee']],
  '2023-ilo-global-analysis-of-generative-ai-and-jobs': [['geneva'], ['ilo']],
  '2023-interim-report-governing-ai-for-humanity': [['new-york'], ['advisory-body']],
  '2023-oict-and-secretariat-digital-initiatives': [['new-york'], ['secretariat']],
  '2023-secretariat-staff-use-of-generative-ai': [['system-wide'], ['secretariat']],
  '2023-secretary-general-and-icrc-president-call-for-a-legally': [['new-york', 'geneva'], ['secretariat']],
  '2023-secretary-general-launches-high-level-advisory-body-on': [['new-york'], ['secretariat', 'advisory-body']],
  '2023-unidir-work-on-ai-security-and-ethics': [['geneva'], ['agency']],
  '2023-whoituwipo-global-initiative-on-ai-for-health': [['geneva'], ['who', 'itu']],
  '2024-advisory-body-final-report-governing-ai-for-humanity': [['new-york'], ['advisory-body']],
  '2024-ai-for-good-global-summit-2024': [['geneva'], ['itu']],
  '2024-first-general-assembly-resolution-devoted-broadly-to-ai': [['new-york'], ['ga-plenary']],
  '2024-from-the-digital-divide-to-the-ai-divide': [['system-wide'], ['itu', 'agency']],
  '2024-general-assembly-resolution-on-ai-capacity-building': [['new-york'], ['ga-plenary']],
  '2024-general-assembly-resolution-on-ai-in-the-military-domai': [['new-york'], ['ga-plenary', 'ga-first-committee']],
  '2024-global-digital-compact-beyond-ai': [['new-york'], ['ga-plenary']],
  '2024-global-digital-compact-implementation-and-review': [['new-york'], ['ga-plenary']],
  '2024-high-commissioner-calls-for-human-rights-at-the-core-of': [['geneva'], ['ohchr']],
  '2024-international-data-governance-discussions': [['new-york'], ['ga-plenary']],
  '2024-ocha-data-responsibility-predictive-analytics-and-antic': [['geneva', 'new-york'], ['agency']],
  '2024-pact-for-the-future-and-global-digital-compact-adopted': [['new-york'], ['ga-plenary']],
  '2024-secretary-generals-report-on-lethal-autonomous-weapons': [['new-york'], ['secretariat', 'ga-first-committee']],
  '2024-secretary-generals-scientific-and-digital-advisory-stru': [['new-york'], ['secretariat']],
  '2024-security-council-high-level-debate-on-ai-and-internatio': [['new-york'], ['security-council']],
  '2024-undp-and-g7-ai-hub-for-sustainable-development': [['rome', 'new-york'], ['agency']],
  '2024-undp-artificial-intelligence-landscape-assessment': [['new-york'], ['agency']],
  '2024-wfp-artificial-intelligence-portfolio': [['rome'], ['agency']],
  '2024-who-guidance-on-large-multi-modal-models-for-health': [['geneva'], ['who']],
  '2025-ai-for-good-global-summit-2025': [['geneva'], ['itu']],
  '2025-general-assembly-establishes-the-scientific-panel-and-g': [['new-york'], ['ga-plenary']],
  '2025-high-level-launch-meeting-for-the-global-dialogue': [['new-york'], ['ga-plenary']],
  '2025-ilo-refined-global-index-of-occupational-exposure': [['geneva'], ['ilo']],
  '2025-international-ai-standards-exchange': [['geneva'], ['itu']],
  '2025-office-for-digital-and-emerging-technologies-begins-ope': [['new-york'], ['secretariat']],
  '2025-security-council-open-debate-on-ai-and-international-pe': [['new-york'], ['security-council']],
  '2025-unhcr-ai-approach': [['geneva'], ['agency']],
  '2025-wsis-20-review': [['new-york', 'geneva'], ['ga-plenary', 'itu']],
  '2026-ai-for-good-global-summit-2026': [['geneva'], ['itu']],
  '2026-ai-governance-for-humanity-lab-launched-in-valencia': [['elsewhere'], ['secretariat']],
  '2026-co-chairs-of-the-inaugural-global-dialogue': [['geneva'], ['ga-plenary']],
  '2026-first-in-person-scientific-panel-meeting-madrid': [['elsewhere'], ['advisory-body']],
  // Held virtually, so no duty station — the Panel is a global body that
  // happens to meet wherever it meets.
  '2026-first-plenary-meeting-of-the-scientific-panel': [['system-wide'], ['advisory-body']],
  '2026-inaugural-global-dialogue-on-ai-governance-geneva': [['geneva'], ['ga-plenary']],
  '2026-scientific-panel-annual-reporting-cycle': [['new-york'], ['advisory-body', 'ga-plenary']],
  '2026-scientific-panel-membership-and-co-chairs-confirmed': [['new-york'], ['ga-plenary', 'advisory-body']],
  '2026-scientific-panel-releases-its-preliminary-report': [['new-york'], ['advisory-body']],
  '2027-high-level-review-of-the-global-digital-compact': [['new-york'], ['ga-plenary']],
  '2027-second-global-dialogue-on-ai-governance-new-york': [['new-york'], ['ga-plenary']],
  'na-secretary-generals-report-on-military-ai': [['new-york'], ['secretariat', 'ga-first-committee']],
};

const check = process.argv.includes('--check');
const files = readdirSync(DIR).filter((f) => f.endsWith('.md')).sort();

let written = 0;
const problems = [];

for (const file of files) {
  const id = file.replace(/\.md$/, '');
  const entry = MAP[id];
  if (!entry) {
    problems.push(`no venue/organ mapping for "${id}" — add one to scripts/annotate-milestones.mjs`);
    continue;
  }

  const path = join(DIR, file);
  const text = readFileSync(path, 'utf8');

  // Frontmatter is the first --- fenced block. Anchor on `unverified:`, which
  // every file has and which is the last of the classification fields.
  const anchor = /^unverified:.*$/m;
  if (!anchor.test(text)) {
    problems.push(`no "unverified:" line in ${file} — cannot place venue/organ`);
    continue;
  }

  const [venues, organs] = entry;
  const lines =
    `venue: [${venues.map((v) => `"${v}"`).join(', ')}]\n` +
    `organ: [${organs.map((o) => `"${o}"`).join(', ')}]`;

  // Strip any previous run's lines, then re-insert. Keeps the field order
  // stable no matter how many times this runs.
  const stripped = text.replace(/^(?:venue|organ):.*\n/gm, '');
  const next = stripped.replace(anchor, (m) => `${m}\n${lines}`);

  if (next === text) continue;
  if (check) {
    problems.push(`${file} is out of date with the mapping`);
    continue;
  }
  writeFileSync(path, next);
  written++;
}

for (const p of problems) console.error(`[annotate] ${p}`);
if (check) {
  console.log(`[annotate] checked ${files.length} files, ${problems.length} problem(s)`);
} else {
  console.log(`[annotate] ${written} file(s) updated of ${files.length}`);
}
process.exit(problems.length ? 1 : 0);
