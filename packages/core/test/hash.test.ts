import assert from 'node:assert/strict';
import { test } from 'node:test';
import { bytesToHex, hashSignedTxBlob, hexToBytes } from '../src/hash';

test('hexToBytes / bytesToHex round-trip', () => {
  assert.deepEqual(Array.from(hexToBytes('00ff10')), [0, 255, 16]);
  assert.equal(bytesToHex(new Uint8Array([0, 255, 16])), '00ff10');
  assert.deepEqual(Array.from(hexToBytes('0xABcd')), [171, 205]);
});

test('hexToBytes rejects malformed hex', () => {
  assert.throws(() => hexToBytes('abc')); // odd length
  assert.throws(() => hexToBytes('zz')); // non-hex
});

test('hashSignedTxBlob is a deterministic, input-sensitive 64-char upper-hex id', async () => {
  const a = await hashSignedTxBlob('12000022800000002400000001');
  const b = await hashSignedTxBlob('12000022800000002400000001');
  const c = await hashSignedTxBlob('12000022800000002400000002');
  assert.match(a, /^[0-9A-F]{64}$/);
  assert.equal(a, b);
  assert.notEqual(a, c);
});
