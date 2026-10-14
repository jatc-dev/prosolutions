module.exports = {
  parser: '@typescript-eslint/parser',
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
    'prettier'
  ],
  plugins: ['@typescript-eslint', 'prettier'],
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    project: ['./tsconfig.json', './tsconfig.test.json']
  },
  env: {
    node: true,
    es2020: true,
    jest: true
  },
  rules: {
    'prettier/prettier': 'error',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
    'no-console': 'off' // Permitir console.log en backend
  },
  ignorePatterns: ['dist/', 'node_modules/', 'coverage/']
};