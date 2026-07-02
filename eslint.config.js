import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['**/dist/**', '**/node_modules/**', '**/*.config.*', 'graphify-out/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    // Node tooling scripts (e.g. the git-hook installer) run outside the browser.
    files: ['scripts/**/*.{js,mjs,cjs}'],
    languageOptions: {
      globals: { process: 'readonly', console: 'readonly' },
    },
  },
);
