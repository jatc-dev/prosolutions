import assert from 'node:assert/strict';
import test from 'node:test';
import { getCookieNameSuffix } from '../../src/config';

test('production keeps the canonical cookie names (no suffix by default)', () => {
  assert.equal(getCookieNameSuffix(undefined), '');
  assert.equal(getCookieNameSuffix(''), '');
  assert.equal(getCookieNameSuffix('   '), '');
});

test('accepts an environment suffix such as _qa', () => {
  assert.equal(getCookieNameSuffix('_qa'), '_qa');
  assert.equal(getCookieNameSuffix(' -staging '), '-staging');
});

test('rejects suffixes that could break or inject cookie attributes', () => {
  // Surrounding whitespace is trimmed; embedded separators or line breaks are rejected.
  for (const unsafe of ['qa', '_q;a', '_qa=1', '_ qa', '_q\r\na', '_' + 'x'.repeat(16)]) {
    assert.throws(() => getCookieNameSuffix(unsafe), /COOKIE_NAME_SUFFIX/, unsafe);
  }
});
