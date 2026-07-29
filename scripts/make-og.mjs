/**
 * Generates public/og.png — the share preview (plan §6).
 *
 * Needs playwright, which is deliberately not a project dependency:
 *   npm i -g playwright   (or run from anywhere it is installed)
 *   OG_ROOT=/path/to/repo node scripts/make-og.mjs
 * The resulting PNG is committed, so a normal build needs no browser.
 *
 * Rendered with the real design tokens and the real fonts by screenshotting
 * a page in Chrome, rather than hand-drawing an SVG that would drift from
 * the site. Run `npm run og` after any change to the palette or type.
 */
import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

// OG_ROOT lets this run from anywhere playwright happens to be installed —
// playwright is NOT a project dependency, because the PNG is committed and
// CI must never need a browser to build the site.
const root = process.env.OG_ROOT
  ? resolve(process.env.OG_ROOT)
  : resolve(dirname(fileURLToPath(import.meta.url)), '..');
const b64 = (p) => readFileSync(resolve(root, p)).toString('base64');

const grotesk = b64('node_modules/@fontsource-variable/space-grotesk/files/space-grotesk-latin-wght-normal.woff2');
const inter = b64('node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2');
const plex = b64('node_modules/@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-400-normal.woff2');

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:'SG';src:url(data:font/woff2;base64,${grotesk}) format('woff2-variations');font-weight:100 900}
@font-face{font-family:'IN';src:url(data:font/woff2;base64,${inter}) format('woff2-variations');font-weight:100 900}
@font-face{font-family:'PX';src:url(data:font/woff2;base64,${plex}) format('woff2')}
*{margin:0;padding:0;box-sizing:border-box}
body{width:1200px;height:630px;background:#101011;font-family:'IN';color:#F1EEE4;overflow:hidden;position:relative}
.sky{position:absolute;inset:0;
  background:
    radial-gradient(ellipse 70% 55% at 50% -8%, rgba(255,95,168,.16), transparent 70%),
    radial-gradient(ellipse 50% 40% at 88% 85%, rgba(47,191,116,.12), transparent 70%);}
.stars{position:absolute;inset:0;background-image:
  radial-gradient(1.6px 1.6px at 12% 18%, rgba(245,241,230,.8), transparent),
  radial-gradient(1.4px 1.4px at 68% 9%, rgba(255,95,168,.7), transparent),
  radial-gradient(1.8px 1.8px at 33% 62%, rgba(245,241,230,.6), transparent),
  radial-gradient(1.2px 1.2px at 84% 41%, rgba(245,241,230,.5), transparent),
  radial-gradient(1.5px 1.5px at 51% 84%, rgba(245,208,32,.6), transparent),
  radial-gradient(1.1px 1.1px at 7% 73%, rgba(245,241,230,.45), transparent),
  radial-gradient(1.7px 1.7px at 92% 88%, rgba(245,241,230,.55), transparent),
  radial-gradient(1.2px 1.2px at 24% 35%, rgba(47,191,116,.55), transparent),
  radial-gradient(1.3px 1.3px at 61% 27%, rgba(245,241,230,.5), transparent),
  radial-gradient(1.1px 1.1px at 44% 52%, rgba(245,241,230,.4), transparent);
  background-size:600px 600px}
.pad{position:relative;padding:72px 80px;height:100%;display:flex;flex-direction:column}
.kicker{font-family:'PX';font-size:19px;letter-spacing:.24em;text-transform:uppercase;color:#F5D020;margin-bottom:26px}
h1{font-family:'SG';font-size:128px;font-weight:700;letter-spacing:-.035em;line-height:1;color:#F1EEE4}
.rule-accent{width:96px;height:6px;background:#FF5FA8;margin-top:22px}
.tag{font-size:30px;color:rgba(245,241,230,.78);margin-top:26px;max-width:900px;line-height:1.4}
.rule{height:1px;background:rgba(245,241,230,.18);margin:auto 0 30px}
.stats{display:flex;gap:56px;align-items:flex-end}
.s dt{font-size:17px;color:rgba(245,241,230,.5);margin-bottom:7px}
.s dd{font-family:'PX';font-size:36px;color:#F1EEE4}
.by{margin-left:auto;text-align:right;font-size:19px;color:rgba(245,241,230,.55);line-height:1.5}
.by b{color:rgba(245,241,230,.85);font-weight:600}
.olive{position:absolute;right:-90px;top:-70px;width:520px;height:520px;
  border:2px solid rgba(47,191,116,.30);border-radius:50%}
.olive2{position:absolute;right:-40px;top:-20px;width:420px;height:420px;
  border:1px solid rgba(255,95,168,.26);border-radius:50%}
</style></head><body>
<div class="sky"></div><div class="stars"></div>
<div class="olive"></div><div class="olive2"></div>
<div class="pad">
  <div class="kicker">A totally unofficial field guide</div>
  <h1>UNAIVERSE</h1><div class="rule-accent"></div>
  <div class="tag">One data nerd's lovingly sarcastic map of the UN's AI universe.<br>All links official. All jokes mine.</div>
  <div class="rule"></div>
  <div class="stats">
    <dl class="s"><dt>Milestones</dt><dd>76</dd></dl>
    <dl class="s"><dt>Receipts</dt><dd>236</dd></dl>
    <dl class="s"><dt>Reader takes</dt><dd>156</dd></dl>
    <dl class="s"><dt>Years</dt><dd>2017–2027</dd></dl>
    <div class="by"><b>Mafizul Islam</b><br>mafiatun.github.io/unaiverse</div>
  </div>
</div></body></html>`;

const tmp = resolve(root, 'dist/.og.html');
writeFileSync(tmp, html);

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await page.goto('file://' + tmp);
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(400);
await page.screenshot({ path: resolve(root, 'public/og.png') });
await browser.close();
console.log('wrote public/og.png');
