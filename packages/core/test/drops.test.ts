import assert from 'node:assert/strict';
import { test } from 'node:test';
import { dropsToXrp, DropsConversionError, xrpToDrops } from '../src/drops';

test('xrpToDrops converts whole and fractional XRP', () => {
  assert.equal(xrpToDrops('1'), '1000000');
  assert.equal(xrpToDrops('1.5'), '1500000');
  assert.equal(xrpToDrops('0.000001'), '1');
  assert.equal(xrpToDrops('0'), '0');
  assert.equal(xrpToDrops(2), '2000000');
  assert.equal(xrpToDrops(2n), '2000000');
});

test('xrpToDrops rejects too many decimals (string)', () => {
  assert.throws(() => xrpToDrops('1.0000001'), DropsConversionError);
});

test('xrpToDrops rejects garbage and overflow', () => {
  assert.throws(() => xrpToDrops('abc'), DropsConversionError);
  assert.throws(() => xrpToDrops('100000000001'), DropsConversionError);
});

test('dropsToXrp converts back and trims trailing zeros', () => {
  assert.equal(dropsToXrp('1000000'), '1');
  assert.equal(dropsToXrp('1500000'), '1.5');
  assert.equal(dropsToXrp(1n), '0.000001');
  assert.equal(dropsToXrp('0'), '0');
});

test('dropsToXrp rejects non-integer drops', () => {
  assert.throws(() => dropsToXrp('1.5'), DropsConversionError);
  assert.throws(() => dropsToXrp(1.5), DropsConversionError);
});

test('round trips are stable', () => {
  for (const xrp of ['0', '1', '1.5', '123.456789', '0.000001', '99999999999']) {
    assert.equal(dropsToXrp(xrpToDrops(xrp)), xrp);
  }
});
