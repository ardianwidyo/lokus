import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';

/** Flat config shared by every workspace. Workspace-specific rules are added
 *  by the workspace's own block below rather than in a second config file. */
export default [
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/coverage/**',
      'design/reference/**',
      // Agent tooling installed into this checkout, not part of LOKUS. It is
      // gitignored, but a flat config does not read .gitignore, so `npm run
      // lint` would still report thousands of errors from code this project
      // does not own — and a lint run nobody can read is a lint run nobody
      // runs.
      '.claude/skills/impeccable/**',
      '.github/agents/**',
      '.github/hooks/**',
      '.github/skills/**',
    ],
  },

  js.configs.recommended,

  {
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-console': ['error', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'always'],
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },

  {
    files: ['api/**/*.js'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },

  {
    // packages/core runs in both the API process and the browser, so it may
    // only use globals both provide.
    files: ['packages/**/*.js'],
    languageOptions: {
      globals: {
        structuredClone: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        URL: 'readonly',
        // The Agent Engine store builds its list filters with it, rather than
        // hand-escaping a query string containing a tenant id.
        URLSearchParams: 'readonly',
        console: 'readonly',
        Date: 'readonly',
        // Both present in Node 20 and every target browser; the Gemini
        // adapter uses them to put a ceiling on a call that never returns.
        AbortController: 'readonly',
        fetch: 'readonly',
      },
    },
  },

  {
    files: ['web/**/*.{js,jsx}'],
    languageOptions: {
      globals: { ...globals.browser },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: { react, 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // Only the two rules that teach no-unused-vars to read JSX; the rest of
      // the react preset is style noise the design system already governs.
      'react/jsx-uses-react': 'error',
      'react/jsx-uses-vars': 'error',
    },
  },

  {
    // Vite and Vitest config files run in Node even though they live in web/.
    files: ['web/vite.config.js', 'web/test/setup.js'],
    languageOptions: {
      globals: { ...globals.node, ...globals.browser },
    },
  },

  {
    // The eval runner is a Node CLI, not isomorphic like packages/core.
    files: ['eval/**/*.mjs'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },

  {
    // Documentation tooling: a Node CLI that also evaluates code inside a
    // browser page, so it needs both sets of globals. It reports progress on
    // stdout, which is the whole point of a CLI.
    files: ['scripts/**/*.mjs'],
    languageOptions: {
      globals: { ...globals.node, ...globals.browser },
    },
    rules: {
      'no-console': 'off',
    },
  },

  {
    files: ['**/*.test.js', '**/*.test.jsx', '**/test/**'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },
];
