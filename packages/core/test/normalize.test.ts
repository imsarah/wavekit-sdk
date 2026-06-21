import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DropsConversionError } from '../src/drops';
import { normalizeTransactionAmounts } from '../src/normalize';

test('converts { xrp } amounts to drops', () => {
  const tx = normalizeTransactionAmounts({
    TransactionType: 'Payment',
    Amount: { xrp: '1.5' },
  });
  assert.equal(tx.Amount, '1500000');
});

test('passes through integer drops strings and numbers', () => {
  assert.equal(normalizeTransactionAmounts({ Amount: '1500000' }).Amount, '1500000');
  assert.equal(normalizeTransactionAmounts({ Amount: 1500000 }).Amount, '1500000');
});

test('leaves issued-currency (IOU) amounts untouched', () => {
  const iou = { currency: 'USD', issuer: 'rIssuer', value: '10' };
  const tx = normalizeTransactionAmounts({ Amount: iou });
  assert.deepEqual(tx.Amount, iou);
});

test('rejects bare decimal numbers (the classic "forgot to convert" bug)', () => {
  assert.throws(() => normalizeTransactionAmounts({ Amount: 1.5 }), DropsConversionError);
});

test('normalizes SendMax / DeliverMax too, and does not mutate input', () => {
  const input = { SendMax: { xrp: '2' }, DeliverMax: '3000000' };
  const out = normalizeTransactionAmounts(input);
  assert.equal(out.SendMax, '2000000');
  assert.equal(out.DeliverMax, '3000000');
  // input untouched
  assert.deepEqual(input.SendMax, { xrp: '2' });
});
