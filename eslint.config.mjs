import js from '@eslint/js';
import typescript from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import perfectionist from 'eslint-plugin-perfectionist';
import stylistic from '@stylistic/eslint-plugin';
import globals from 'globals';

export default [
  js.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true
        }
      },
      globals: {
        // Utiliser les globals prédéfinis
        ...globals.browser,
        ...globals.node,
        // Obsidian globals spécifiques
        require: 'readonly'
      }
    },
    plugins: {
      '@stylistic': stylistic,
      '@typescript-eslint': typescript,
      perfectionist,
      'react': react,
      'react-hooks': reactHooks,
    },
    rules: {
      // TypeScript rules
      ...typescript.configs.recommended.rules,

      // React rules essentielles
      'react/jsx-uses-react': 'off',
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'react/jsx-uses-vars': 'error',
      'react/jsx-key': 'error',
      'react/jsx-no-duplicate-props': 'error',
      'react/jsx-no-undef': 'error',
      'react/no-children-prop': 'error',
      'react/no-danger-with-children': 'error',
      'react/no-deprecated': 'error',
      'react/no-direct-mutation-state': 'error',
      'react/no-find-dom-node': 'error',
      'react/no-is-mounted': 'error',
      'react/no-render-return-value': 'error',
      'react/no-string-refs': 'error',
      'react/no-unescaped-entities': 'error',
      'react/no-unknown-property': 'error',
      'react/require-render-return': 'error',

      // React Hooks rules
      'react-hooks/rules-of-hooks': 'error',
      // 'react-hooks/exhaustive-deps': 'warn',

      // Perfectionist
      'perfectionist/sort-imports': 'error',
      'perfectionist/sort-named-imports': 'error',

      // Vos règles personnalisées
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { args: 'none' }],
      '@typescript-eslint/ban-ts-comment': 'off',
      'no-prototype-builtins': 'off',
      '@typescript-eslint/no-empty-function': 'off',

      // Règles auto-fixables pour tester
      '@stylistic/semi': ['error', 'always'],
      '@stylistic/quotes': ['error', 'single'],
      '@stylistic/indent': ['error', 4],
      '@stylistic/no-trailing-spaces': 'error',
      '@stylistic/eol-last': 'error',
      '@stylistic/object-curly-newline': ['warn', {
        // "ObjectExpression": "never",
        // "ObjectPattern": "never",
        "ImportDeclaration": { "multiline": true, "minProperties": 4, "consistent": true },
        "ExportDeclaration": { "multiline": true, "minProperties": 4, "consistent": true }
      }],
      // '@stylistic/object-property-newline': ['warn', {"allowAllPropertiesOnSameLine": false}]
    },
    settings: {
      react: {
        version: '18'
      }
    }
  },
  {
    // Ignorer certains fichiers
    ignores: [
      'dist/**',
      'node_modules/**',
      '*.config.js',
      '*.config.mjs'
    ]
  }
];