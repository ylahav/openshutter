import js from '@eslint/js';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import sveltePlugin from 'eslint-plugin-svelte';
import svelteParser from 'svelte-eslint-parser';

export default [
  js.configs.recommended,
  ...sveltePlugin.configs['flat/recommended'],
  {
    languageOptions: {
      globals: {
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        global: 'readonly',
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
      },
    },
    rules: {
      // Keep CI green while we progressively tighten legacy code.
      'no-undef': 'off',
      'no-unused-vars': 'warn',
      'no-empty': 'warn',
      'no-case-declarations': 'warn',
      'preserve-caught-error': 'warn',
      'no-useless-assignment': 'warn',
    },
  },
  {
    files: ['**/*.js', '**/*.cjs', '**/*.mjs'],
    languageOptions: {
      sourceType: 'module',
      globals: {
        require: 'readonly',
        module: 'readonly',
        exports: 'readonly',
      },
    },
  },
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-unused-vars': 'off', // Use TypeScript version instead
      'no-undef': 'off', // TypeScript handles this
    },
  },
  {
    files: ['**/*.svelte'],
    languageOptions: {
      parser: svelteParser,
      parserOptions: {
        parser: tsParser,
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    rules: {
      'svelte/valid-compile': 'off',
      'svelte/no-unused-svelte-ignore': 'off',
      'svelte/no-reactive-functions': 'off',
      'svelte/no-immutable-reactive-statements': 'off',
      'svelte/require-each-key': 'off',
      'svelte/no-navigation-without-resolve': 'off',
      'svelte/prefer-svelte-reactivity': 'off',
      'svelte/no-at-html-tags': 'off',
      'svelte/infinite-reactive-loop': 'off',
      'svelte/no-dom-manipulating': 'off',
      'svelte/no-useless-mustaches': 'off',
      'no-undef': 'off',
      'no-unused-vars': 'off',
      'preserve-caught-error': 'off'
    }
  },
  {
    // Guardrail: backend-only packages must not leak into app/client code.
    files: ['src/**/*.{ts,js,svelte}'],
    ignores: [
      'src/**/*.server.ts',
      'src/routes/**/+server.ts',
      'src/hooks.server.ts',
      // Legacy backend-mixed folders to migrate separately.
      'src/scripts/**',
    ],
    rules: {
      'no-restricted-imports': ['error', {
        paths: [
          { name: 'mongoose', message: 'Backend-only dependency. Move this code to .server.ts or backend package.' },
          { name: 'mongodb', message: 'Backend-only dependency. Move this code to .server.ts or backend package.' },
          { name: 'googleapis', message: 'Backend-only dependency. Move this code to .server.ts or backend package.' },
          { name: '@aws-sdk/client-s3', message: 'Backend-only dependency. Move this code to .server.ts or backend package.' },
          { name: '@aws-sdk/s3-request-presigner', message: 'Backend-only dependency. Move this code to .server.ts or backend package.' },
        ],
        patterns: [
          { group: ['@nestjs/*'], message: 'Backend-only dependency. Move this code to .server.ts or backend package.' },
          {
            group: [
              '$components/ui',
              '$components/ui/**',
              '$lib/components/ui',
              '$lib/components/ui/**',
              '**/lib/components/ui/**',
            ],
            message:
              'UI primitives moved to $pageBuilder/primitives/... (see src/lib/page-builder/primitives/README.md).',
          },
        ],
      }],
    },
  },
  {
    ignores: [
      'build/**',
      '.svelte-kit/**',
      'node_modules/**',
      'dist/**',
      'static/**',
      '*.config.js',
      '*.config.ts',
    ],
  },
];
