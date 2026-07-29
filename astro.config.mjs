// @ts-check
import { defineConfig } from 'astro/config';

// Deployed to https://mafiatun.github.io/unaiverse
// `base` matters: every internal link and asset must be prefixed with it.
export default defineConfig({
  site: 'https://mafiatun.github.io',
  base: '/unaiverse',
  trailingSlash: 'ignore',
  output: 'static',
  build: {
    // One page, one stylesheet: inlining removes the only render-blocking
    // request on the critical path and there is no second page to share a
    // cached CSS file with. Worth ~900ms of FCP on throttled mobile.
    inlineStylesheets: 'always',
  },
});
