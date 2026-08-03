# Security policy

## Reporting a vulnerability

Email **mafi@mafizul.me** with what you found and how to reproduce it. Please do
not open a public issue for anything that could be exploited before it is fixed.

Expect an acknowledgement within a week. This is a personal project maintained
in spare time, so it does not carry a formal SLA, but a real finding will be
taken seriously and you will be credited unless you would rather not be.

There is no bug bounty.

## What the attack surface actually is

Knowing this may save you time.

UNAIVERSE is a **static site**. Astro builds it to HTML, CSS, JSON and a small
amount of JavaScript, and GitHub Pages serves those files. There is no server,
no database, no API, no login, no account system, no session, no cookie and no
analytics. Saved terms and reading progress live in the visitor's own browser
storage and are never transmitted anywhere.

That rules out most of the usual categories. What is left, and worth reporting:

- Cross-site scripting reachable through content, URL parameters (filter state
  is held in the URL) or the search index.
- A dependency in `package.json` with a known advisory that actually affects
  the built output rather than the build toolchain.
- Anything in the GitHub Actions workflow that could let a fork or a pull
  request obtain write access or the Pages deployment token.
- A credential, endpoint, subscription id, tenant id or resource group visible
  anywhere in the repository, its history, or the published site.

## How credentials are kept out of the build

Azure OpenAI is used **only at development time**, by scripts under
`scripts/learn/` that write JSON to disk on a maintainer's machine. The
published site holds no credential and calls no AI service at runtime.

Three things hold that line, and all three run in CI on every push:

1. Nothing under `src/` imports the model client. The site reads
   `content/learn/reviewed/`, which is plain JSON on disk.
2. `npm test` sweeps every file in `dist/` for Azure identifiers:
   `AZURE_OPENAI_API_KEY`, `AZURE_OPENAI_ENDPOINT`, `openai.azure.com`,
   `services.ai.azure.com`, `cognitiveservices.azure.com` and `api-key`. Any
   hit fails the build.
3. The same test then reads the maintainer's local `.env`, if one exists, and
   asserts that no value from it appears anywhere in `dist/`. This catches a
   leak that a name-based sweep would miss.

`.env` is gitignored. `.env.template` is committed and contains placeholders
only. If you ever see a real hostname, key, subscription id or tenant id in a
committed file, that is a report worth sending.

## Supported versions

The deployed site is the only supported version. Fixes land on `main` and
deploy from there. Tagged releases are not maintained separately.
