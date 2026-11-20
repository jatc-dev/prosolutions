import assert from 'node:assert/strict';
import test from 'node:test';
import { productionSafeOrigins } from '../../src/config';

const configured = [
  'https://prosolutions.page',
  'https://procv.prosolutions.page',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://evil.example',
];

test('production keeps only https origins', () => {
  assert.deepEqual(productionSafeOrigins(configured, true), ['https://prosolutions.page', 'https://procv.prosolutions.page']);
});

test('development keeps local origins for the dev servers', () => {
  assert.deepEqual(productionSafeOrigins(configured, false), configured);
});
