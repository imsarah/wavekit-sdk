import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createPaymentRequest, rlusd, RLUSD_CURRENCY } from '../src/payments';
import { paymentMatches, type AccountTxEntry } from '../src/xrpl';

const recentRippleDate = Math.floor(Date.now() / 1000) - 946_684_800;

function entry(over: Partial<AccountTxEntry['tx']> = {}, meta: AccountTxEntry['meta'] = {}): AccountTxEntry {
  return {
    validated: true,
    tx: { TransactionType: 'Payment', Destination: 'rMerchant', date: recentRippleDate, ...over },
    meta: typeof meta === 'string' ? meta : { TransactionResult: 'tesSUCCESS', ...meta },
  };
}

test('paymentMatches accepts a validated XRP payment that covers the amount', () => {
  const req = createPaymentRequest({ to: 'rMerchant', amount: { xrp: '10' } });
  assert.equal(paymentMatches(entry({}, { delivered_amount: '10000000' }), req), true);
  // overpayment still settles
  assert.equal(paymentMatches(entry({}, { delivered_amount: '12000000' }), req), true);
});

test('paymentMatches rejects underpayment, wrong destination, and failures', () => {
  const req = createPaymentRequest({ to: 'rMerchant', amount: { xrp: '10' } });
  assert.equal(paymentMatches(entry({}, { delivered_amount: '9000000' }), req), false);
  assert.equal(paymentMatches(entry({ Destination: 'rSomeoneElse' }, { delivered_amount: '10000000' }), req), false);
  assert.equal(
    paymentMatches(entry({}, { delivered_amount: '10000000', TransactionResult: 'tecUNFUNDED_PAYMENT' }), req),
    false,
  );
});

test('paymentMatches enforces the destination tag when set', () => {
  const req = createPaymentRequest({ to: 'rMerchant', amount: { xrp: '10' }, destinationTag: 99 });
  assert.equal(paymentMatches(entry({ DestinationTag: 99 }, { delivered_amount: '10000000' }), req), true);
  assert.equal(paymentMatches(entry({ DestinationTag: 1 }, { delivered_amount: '10000000' }), req), false);
  assert.equal(paymentMatches(entry({}, { delivered_amount: '10000000' }), req), false);
});

test('paymentMatches rejects stale transactions', () => {
  const req = createPaymentRequest({ to: 'rMerchant', amount: { xrp: '10' } });
  const stale = entry({ date: recentRippleDate - 10_000 }, { delivered_amount: '10000000' });
  assert.equal(paymentMatches(stale, req), false);
});

test('paymentMatches handles token (RLUSD) deliveries', () => {
  const req = createPaymentRequest({ to: 'rMerchant', amount: '25', asset: rlusd('rIssuer') });
  const ok = entry({}, { delivered_amount: { currency: RLUSD_CURRENCY, issuer: 'rIssuer', value: '25' } });
  assert.equal(paymentMatches(ok, req), true);

  const low = entry({}, { delivered_amount: { currency: RLUSD_CURRENCY, issuer: 'rIssuer', value: '24' } });
  assert.equal(paymentMatches(low, req), false);

  const wrongCurrency = entry({}, { delivered_amount: { currency: 'USD', issuer: 'rIssuer', value: '25' } });
  assert.equal(paymentMatches(wrongCurrency, req), false);

  // an XRP delivery never settles a token request
  assert.equal(paymentMatches(entry({}, { delivered_amount: '25000000' }), req), false);
});
