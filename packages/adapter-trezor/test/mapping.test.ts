import assert from 'node:assert/strict';
import { test } from 'node:test';
import { toTrezorRippleTransaction } from '../src/mapping';

test('maps a complete Payment to the Trezor schema', () => {
  const out = toTrezorRippleTransaction({
    TransactionType: 'Payment',
    Account: 'rA',
    Destination: 'rB',
    Amount: '1500000',
    Fee: '12',
    Sequence: 10,
    Flags: 2147483648,
    LastLedgerSequence: 100,
    DestinationTag: 7,
  });
  assert.deepEqual(out, {
    fee: '12',
    sequence: 10,
    flags: 2147483648,
    maxLedgerVersion: 100,
    payment: { amount: '1500000', destination: 'rB', destinationTag: 7 },
  });
});

test('omits optional fields when absent', () => {
  const out = toTrezorRippleTransaction({
    TransactionType: 'Payment',
    Destination: 'rB',
    Amount: '1000000',
    Fee: '10',
    Sequence: 1,
  });
  assert.deepEqual(out, { fee: '10', sequence: 1, payment: { amount: '1000000', destination: 'rB' } });
});

test('rejects non-Payment, IOU amounts, and incomplete transactions', () => {
  assert.throws(() => toTrezorRippleTransaction({ TransactionType: 'TrustSet' }));
  assert.throws(() =>
    toTrezorRippleTransaction({
      TransactionType: 'Payment',
      Destination: 'rB',
      Amount: { currency: 'USD', issuer: 'rI', value: '1' } as unknown as string,
      Fee: '12',
      Sequence: 1,
    }),
  );
  // missing Fee
  assert.throws(() =>
    toTrezorRippleTransaction({ TransactionType: 'Payment', Destination: 'rB', Amount: '100', Sequence: 1 }),
  );
});
