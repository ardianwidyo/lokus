import { copyFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));

/**
 * A static host has no server to rewrite unknown paths onto index.html, so a
 * deep link like /lokus/briefing — or a plain browser refresh on any screen
 * other than the first — returns 404. GitHub Pages serves 404.html for exactly
 * those requests, so an identical copy of index.html turns its error page into
 * the SPA fallback.
 */
function spaFallback() {
  return {
    name: 'lokus-spa-fallback',
    apply: 'build',
    closeBundle() {
      copyFileSync(
        fileURLToPath(new URL('dist/index.html', import.meta.url)),
        fileURLToPath(new URL('dist/404.html', import.meta.url)),
      );
    },
  };
}

/**
 * GitHub Pages serves a project site from /<repo>/, so the built asset URLs
 * need that prefix. Cloud Run serves from the domain root and must not have
 * it. The deploy sets LOKUS_BASE_PATH; everything else — dev, preview, the
 * screenshot run — stays at the root.
 */
const base = process.env.LOKUS_BASE_PATH ?? '/';

export default defineConfig({
  base,
  plugins: [react(), spaFallback()],

  server: {
    port: 5173,
    // design/tokens.css lives outside this workspace and is the single source
    // of truth for every design value, so the dev server must be able to read it.
    fs: { allow: [repoRoot] },
  },

  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./test/setup.js'],
    include: ['test/**/*.test.jsx'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{js,jsx}'],
      exclude: ['src/main.jsx'],
      thresholds: { lines: 80, functions: 80, branches: 75, statements: 80 },
    },
  },
});
