// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

// Deployed to https://mafiatun.github.io/unaiverse
// `base` matters: every internal link and asset must be prefixed with it.
export default defineConfig({
  site: 'https://mafiatun.github.io',
  base: '/unaiverse',
  trailingSlash: 'ignore',
  output: 'static',

  // React powers /story only. The galaxy and /timeline stay plain Astro — this
  // is an island, not a migration, so nothing ships React to the other pages.
  integrations: [react()],

  vite: {
    plugins: [tailwindcss()],
  },

  build: {
    // Inlining removes the only render-blocking request on the critical path.
    // Tailwind emits just the utilities actually used, so /story's sheet stays
    // small enough that this is still the right trade.
    inlineStylesheets: 'always',
  },
});
