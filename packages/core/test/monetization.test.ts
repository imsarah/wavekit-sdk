import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildFeePayment, computeSwapFeeDrops } from '../src/monetization';

test('computeSwapFeeDrops applies basis points with integer maths', () => {
  // 0.2% of 1 XRP (1,000,000 drops) = 2,000 drops
  assert.equal(computeSwapFeeDrops('1000000', 20), '2000');
  // floors instead of rounding up
  assert.equal(computeSwapFeeDrops('1', 20), '0');
  assert.equal(computeSwapFeeDrops(1_000_000n, 100), '10000'); // 1%
});

test('computeSwapFeeDrops validates bps', () => {
  assert.throws(() => computeSwapFeeDrops('1000000', -1));
  assert.throws(() => computeSwapFeeDrops('1000000', 10_001));
  assert.throws(() => computeSwapFeeDrops('1000000', 1.5));
});

test('buildFeePayment returns a transparent Payment, or null when fee is zero', () => {
  const tx = buildFeePayment({
    from: 'rUser',
    inputDrops: '1000000',
    config: { feeRecipient: 'rDev', swapFeeBps: 20 },
  });
  assert.deepEqual(tx, {
    TransactionType: 'Payment',
    Account: 'rUser',
    Destination: 'rDev',
    Amount: '2000',
  });

  assert.equal(
    buildFeePayment({ from: 'rUser', inputDrops: '1', config: { feeRecipient: 'rDev', swapFeeBps: 20 } }),
    null,
  );
});
