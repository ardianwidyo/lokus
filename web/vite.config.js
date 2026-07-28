import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));

export default defineConfig({
  plugins: [react()],

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
