import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getSessionIdleTimeoutMs } from '../../src/config';

test('uses the 30-minute default when the setting is absent', () => {
  assert.equal(getSessionIdleTimeoutMs(undefined), 30 * 60 * 1000);
});

test('converts a valid positive minute value to milliseconds', () => {
  assert.equal(getSessionIdleTimeoutMs('15'), 15 * 60 * 1000);
  assert.equal(getSessionIdleTimeoutMs('0.5'), 30 * 1000);
});

test('rejects an empty, non-numeric, zero, or negative timeout', () => {
  for (const value of ['', 'not-a-number', 'NaN', 'Infinity', '0', '-1']) {
    assert.throws(
      () => getSessionIdleTimeoutMs(value),
      /SESSION_IDLE_TIMEOUT_MINUTES must be a finite number greater than zero/,
      `Expected ${JSON.stringify(value)} to be rejected`,
    );
  }
});
