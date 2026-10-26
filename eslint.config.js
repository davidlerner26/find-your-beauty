// @ts-check
const eslint = require('@eslint/js');
const { defineConfig, globalIgnores } = require('eslint/config');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');
const prettier = require('eslint-config-prettier');
const storybook = require('eslint-plugin-storybook');

module.exports = defineConfig([
  globalIgnores([
    'dist/',
    '.angular/',
    '.netlify/',
    '.vite/',
    'functions/',
    'node_modules/',
    'storybook-static/',
  ]),
  ...storybook.configs['flat/recommended'],
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.recommended,
      tseslint.configs.stylistic,
      angular.configs.tsRecommended,
      prettier,
    ],
    processor: angular.processInlineTemplates,
    rules: {
      // The codebase declares shapes with `type`; keep it that way.
      '@typescript-eslint/consistent-type-definitions': 'off',
      // `const { a, ...rest } = obj` is the idiom to drop fields
      '@typescript-eslint/no-unused-vars': ['error', { ignoreRestSiblings: true }],
      '@angular-eslint/directive-selector': [
        'error',
        { type: 'attribute', prefix: 'app', style: 'camelCase' },
      ],
      '@angular-eslint/component-selector': [
        'error',
        { type: 'element', prefix: 'app', style: 'kebab-case' },
      ],
    },
  },
  {
    files: ['**/*.html'],
    extends: [angular.configs.templateRecommended, angular.configs.templateAccessibility, prettier],
    rules: {},
  },
]);
