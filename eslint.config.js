import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';

/** Flat config shared by every workspace. Workspace-specific rules are added
 *  by the workspace's own block below rather than in a second config file. */
export default [
  {
    ignores: ['**/dist/**', '**/node_modules/**', '**/coverage/**', 'design/reference/**'],
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
        console: 'readonly',
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
    files: ['**/*.test.js', '**/*.test.jsx', '**/test/**'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },
];
