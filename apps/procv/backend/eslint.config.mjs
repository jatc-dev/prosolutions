import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-plugin-prettier';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: ['dist/', 'node_modules/', 'coverage/']
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.jest
      },
      parserOptions: {
        project: ['./tsconfig.json', './tsconfig.test.json']
      }
    },
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
    ],
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      prettier
    },
    rules: {
      'prettier/prettier': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      'no-console': 'off'
    }
  }
);
