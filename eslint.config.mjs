import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import { defineConfig } from 'eslint/config';
import nestjs from 'eslint-plugin-nestjs';

export default defineConfig([
  {
    files: ['**/*.{js,mjs,cjs,ts,mts,cts}'],
    plugins: { js, nestjs },
    extends: ['js/recommended', 'nestjs/recommended'],
    ignores: ['**/dist/**', '**/node_modules/**'],
    languageOptions: { globals: globals.node },
    rules: {
      'nestjs/use-validation-pipe': 'off',
    },
  },
  ...tseslint.configs.recommended.map((cfg) => ({
    ...cfg,
    ignores: ['**/dist/**', '**/node_modules/**'],
  })),
]);
