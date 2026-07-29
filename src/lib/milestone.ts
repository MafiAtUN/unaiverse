/**
 * The milestone files were written by hand, in a consistent but human shape:
 *
 *   <factual prose>
 *
 *   **Sources:**
 *   <url>
 *   <url>
 *
 *   **Why it matters:** <one line>
 *
 * This module turns that into structured data so the panel component never
 * does string surgery in a template. Verified across all 76 files by
 * `npm run build` — a file that fails to yield sources or a why-line is a
 * build-time warning, not a silent blank.
 */

export interface Receipt {
  url: string;
  label: string;
}

export interface ParsedMilestone {
  factual: string;
  receipts: Receipt[];
  why: string;
}

const SOURCES_RE = /^\*\*Sources:\*\*/m;
const WHY_RE = /^\*\*Why it matters:\*\*/m;

/** Turn a bare URL into something a human can read on a link. */
export function labelForUrl(url: string): string {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, '');

    // Document symbols are the most useful label we can offer when they exist.
    const symbol = u.pathname.match(
      /\/((?:A|S|E|CCW|CEB)\/[A-Z0-9./_-]+?)(?:\.pdf)?$/i,
    );
    if (symbol && /\d/.test(symbol[1])) {
      return symbol[1].replace(/_/g, '/').toUpperCase();
    }

    const HOST_NAMES: Record<string, string> = {
      'docs.un.org': 'UN Official Document System',
      'digitallibrary.un.org': 'UN Digital Library',
      'press.un.org': 'UN Meetings Coverage',
      'webtv.un.org': 'UN Web TV',
      'media.un.org': 'UN Audiovisual Library',
      'un.org': 'un.org',
      'unsceb.org': 'UN System CEB',
      'unesco.org': 'UNESCO',
      'unesdoc.unesco.org': 'UNESDOC',
      'aiforgood.itu.int': 'AI for Good',
      'itu.int': 'ITU',
      'ohchr.org': 'OHCHR',
      'undp.org': 'UNDP',
      'unhcr.org': 'UNHCR',
      'unicef.org': 'UNICEF',
      'who.int': 'WHO',
      'iris.who.int': 'WHO IRIS',
      'ilo.org': 'ILO',
      'unidir.org': 'UNIDIR',
      'unicri.org': 'UNICRI',
      'unctad.org': 'UNCTAD',
      'disarmament.unoda.org': 'UNODA',
      'meetings.unoda.org': 'UNODA Meetings',
      'docs-library.unoda.org': 'UNODA Documents',
      'peacekeeping.un.org': 'UN Peacekeeping',
      'operationalsupport.un.org': 'UN Operational Support',
      'unite.un.org': 'OICT',
      'oios.un.org': 'OIOS',
      'publicadministration.un.org': 'UN DESA',
      'centre.humdata.org': 'OCHA Centre for Humanitarian Data',
      'unocha.org': 'OCHA',
      'innovation.wfp.org': 'WFP Innovation',
      'wfp.org': 'WFP',
      'jetson.unhcr.org': 'UNHCR Project Jetson',
      'un-two-zero.network': 'UN 2.0',
      'openai.com': 'OpenAI',
      'reuters.com': 'Reuters',
    };

    // Several nodes cite more than one Digital Library record; a bare
    // "UN Digital Library" twice in a row tells the reader nothing about
    // which is which, so carry the record number.
    const record = u.pathname.match(/\/record\/(\d+)/);
    if (record && HOST_NAMES[host]) {
      return `${HOST_NAMES[host]} #${record[1]}`;
    }

    if (HOST_NAMES[host]) {
      const isPdf = u.pathname.toLowerCase().endsWith('.pdf');
      return isPdf ? `${HOST_NAMES[host]} (PDF)` : HOST_NAMES[host];
    }
    return host;
  } catch {
    return url;
  }
}

export function parseMilestoneBody(body: string): ParsedMilestone {
  const sourcesIdx = body.search(SOURCES_RE);
  const whyIdx = body.search(WHY_RE);

  const factual = (sourcesIdx >= 0 ? body.slice(0, sourcesIdx) : body).trim();

  let sourcesBlock = '';
  if (sourcesIdx >= 0) {
    const end = whyIdx > sourcesIdx ? whyIdx : body.length;
    sourcesBlock = body.slice(sourcesIdx, end);
  }

  const urls = sourcesBlock.match(/https?:\/\/[^\s)>"]+/g) ?? [];
  const receipts: Receipt[] = [];
  const seen = new Set<string>();
  for (const raw of urls) {
    const url = raw.replace(/[.,;]+$/, '');
    if (seen.has(url)) continue;
    seen.add(url);
    receipts.push({ url, label: labelForUrl(url) });
  }

  // Two receipts on the same node reading identically is a dead end for the
  // reader — number the collisions so each chip is distinguishable.
  const labelCounts = new Map<string, number>();
  for (const r of receipts) {
    labelCounts.set(r.label, (labelCounts.get(r.label) ?? 0) + 1);
  }
  const running = new Map<string, number>();
  for (const r of receipts) {
    if (labelCounts.get(r.label)! > 1) {
      const n = (running.get(r.label) ?? 0) + 1;
      running.set(r.label, n);
      r.label = `${r.label} (${n})`;
    }
  }

  const why =
    whyIdx >= 0
      ? body
          .slice(whyIdx)
          .replace(WHY_RE, '')
          .replace(/^\s*/, '')
          .split(/\n\s*\n/)[0]!
          .trim()
      : '';

  return { factual, receipts, why };
}

const MONTHS = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
];

/**
 * Sortable key from a human date string like "6–7 July 2026",
 * "12 February – 3 March 2026", "September 2017" or "2023–2026".
 * Always resolves to the START of whatever period is described.
 */
export function sortKey(dateDisplay: string, year: number | null, id: string): number {
  const text = dateDisplay.toLowerCase();

  const yearMatch = text.match(/\b(19|20)\d{2}\b/);
  const idYear = id.match(/^(\d{4})/);
  const resolvedYear =
    (yearMatch ? Number(yearMatch[0]) : null) ??
    year ??
    (idYear ? Number(idYear[1]) : null);

  if (resolvedYear === null) return 9999_00_00;

  // "12 February", "6–7 July", "22–24 April" → take the first day.
  const dayMonth = text.match(
    new RegExp(`\\b(\\d{1,2})\\s*(?:[–—-]\\s*\\d{1,2})?\\s+(${MONTHS.join('|')})\\b`),
  );
  if (dayMonth) {
    const day = Number(dayMonth[1]);
    const month = MONTHS.indexOf(dayMonth[2]!) + 1;
    return resolvedYear * 10000 + month * 100 + day;
  }

  const monthOnly = text.match(new RegExp(`\\b(${MONTHS.join('|')})\\b`));
  if (monthOnly) {
    const month = MONTHS.indexOf(monthOnly[1]!) + 1;
    return resolvedYear * 10000 + month * 100 + 1;
  }

  return resolvedYear * 10000 + 1 * 100 + 1;
}
