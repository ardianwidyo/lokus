import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.js'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.js'],
      // The process entrypoint only wires config to server and binds a port;
      // everything it calls is covered directly.
      exclude: ['src/index.js'],
      // Constitution quality gate: 80% minimum on the auth and tenant layer.
      thresholds: { lines: 80, functions: 80, branches: 75, statements: 80 },
    },
  },
});
