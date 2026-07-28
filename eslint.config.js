import js from '@eslint/js';
import globals from 'globals';

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
    files: ['**/*.test.js', '**/*.test.jsx', '**/test/**'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },
];
