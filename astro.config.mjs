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
    // Phase 4 loads Three.js/GSAP lazily; keep the default chunking honest until then.
    inlineStylesheets: 'auto',
  },
});
