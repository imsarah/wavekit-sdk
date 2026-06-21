import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DropsConversionError } from '../src/drops';
import {
  buildFeePaymentForRequest,
  buildPaymentTransaction,
  createPaymentRequest,
  currencySymbol,
  isPaymentExpired,
  RLUSD_CURRENCY,
  rlusd,
} from '../src/payments';

/* --------------------------------- XRP ------------------------------------- */

test('createPaymentRequest normalizes XRP amounts to drops', () => {
  const req = createPaymentRequest({ to: 'rMerchant', amount: { xrp: '25' } });
  assert.equal(req.asset.type, 'XRP');
  assert.equal(req.symbol, 'XRP');
  assert.equal(req.amountDrops, '25000000');
  assert.equal(req.amountValue, '25');
  assert.equal(req.fee, null);
  assert.equal(req.totalDrops, '25000000');
  assert.equal(req.totalValue, '25');
  assert.ok(req.id.startsWith('pay_'));
});

test('createPaymentRequest accepts integer drops strings/numbers', () => {
  assert.equal(createPaymentRequest({ to: 'r', amount: '1500000' }).amountDrops, '1500000');
  assert.equal(createPaymentRequest({ to: 'r', amount: 2000000 }).amountDrops, '2000000');
});

test('createPaymentRequest rejects a bare decimal number (drops must be integer)', () => {
  assert.throws(() => createPaymentRequest({ to: 'r', amount: 1.5 }), DropsConversionError);
});

test('createPaymentRequest requires a merchant address', () => {
  // @ts-expect-error intentionally missing `to`
  assert.throws(() => createPaymentRequest({ amount: { xrp: '1' } }));
});

test('XRP fee: transparent fee + total in drops', () => {
  const req = createPaymentRequest({
    to: 'rMerchant',
    amount: { xrp: '100' },
    monetization: { feeRecipient: 'rDev', swapFeeBps: 20 }, // 0.2%
  });
  assert.equal(req.fee?.value, '0.2');
  assert.equal(req.fee?.drops, '200000');
  assert.equal(req.fee?.bps, 20);
  assert.equal(req.totalDrops, '100200000');
  assert.equal(req.totalValue, '100.2');
});

test('XRP fee omitted when it rounds to zero', () => {
  const req = createPaymentRequest({
    to: 'rMerchant',
    amount: '1',
    monetization: { feeRecipient: 'rDev', swapFeeBps: 20 },
  });
  assert.equal(req.fee, null);
  assert.equal(req.totalDrops, '1');
});

test('buildPaymentTransaction (XRP) is a signable Payment', () => {
  const req = createPaymentRequest({ to: 'rMerchant', amount: { xrp: '10' }, destinationTag: 7 });
  assert.deepEqual(buildPaymentTransaction(req, 'rPayer'), {
    TransactionType: 'Payment',
    Account: 'rPayer',
    Destination: 'rMerchant',
    Amount: '10000000',
    DestinationTag: 7,
  });
});

/* -------------------------------- tokens ----------------------------------- */

test('currencySymbol decodes the RLUSD hex code', () => {
  assert.equal(currencySymbol(RLUSD_CURRENCY), 'RLUSD');
  assert.equal(currencySymbol('USD'), 'USD');
});

test('createPaymentRequest charges a token (RLUSD) with decimal value', () => {
  const req = createPaymentRequest({
    to: 'rMerchant',
    amount: { value: '25.00' },
    asset: rlusd('rIssuer'),
  });
  assert.equal(req.asset.type, 'TOKEN');
  assert.equal(req.symbol, 'RLUSD');
  assert.equal(req.amountValue, '25'); // normalized
  assert.equal(req.amountDrops, null);
  assert.equal(req.totalValue, '25');
  assert.equal(req.totalDrops, null);
});

test('token fee is computed exactly in the token, total includes it', () => {
  const req = createPaymentRequest({
    to: 'rMerchant',
    amount: '100',
    asset: rlusd('rIssuer'),
    monetization: { feeRecipient: 'rDev', swapFeeBps: 25 }, // 0.25%
  });
  assert.equal(req.fee?.value, '0.25');
  assert.equal(req.fee?.drops, null);
  assert.equal(req.totalValue, '100.25');
});

test('buildPaymentTransaction (token) emits an IOU Amount object', () => {
  const req = createPaymentRequest({ to: 'rMerchant', amount: '25', asset: rlusd('rIssuer') });
  assert.deepEqual(buildPaymentTransaction(req, 'rPayer'), {
    TransactionType: 'Payment',
    Account: 'rPayer',
    Destination: 'rMerchant',
    Amount: { currency: RLUSD_CURRENCY, issuer: 'rIssuer', value: '25' },
  });
});

test('buildFeePaymentForRequest pays the fee in the same asset, or null', () => {
  const xrp = createPaymentRequest({
    to: 'rM',
    amount: { xrp: '100' },
    monetization: { feeRecipient: 'rDev', swapFeeBps: 20 },
  });
  assert.deepEqual(buildFeePaymentForRequest(xrp, 'rPayer'), {
    TransactionType: 'Payment',
    Account: 'rPayer',
    Destination: 'rDev',
    Amount: '200000',
  });

  const token = createPaymentRequest({
    to: 'rM',
    amount: '100',
    asset: rlusd('rIssuer'),
    monetization: { feeRecipient: 'rDev', swapFeeBps: 25 },
  });
  assert.deepEqual(buildFeePaymentForRequest(token, 'rPayer'), {
    TransactionType: 'Payment',
    Account: 'rPayer',
    Destination: 'rDev',
    Amount: { currency: RLUSD_CURRENCY, issuer: 'rIssuer', value: '0.25' },
  });

  const noFee = createPaymentRequest({ to: 'rM', amount: { xrp: '100' } });
  assert.equal(buildFeePaymentForRequest(noFee, 'rPayer'), null);
});

/* --------------------------------- misc ------------------------------------ */

test('createPaymentRequest builds a ripple: URI (XRP and token)', () => {
  const xrp = createPaymentRequest({ to: 'rM', amount: { xrp: '1.5' }, label: 'Order #1', destinationTag: 42 });
  assert.equal(xrp.uri, 'ripple:rM?amount=1.5&dt=42&label=Order%20%231');

  const token = createPaymentRequest({ to: 'rM', amount: '5', asset: rlusd('rIssuer') });
  assert.equal(token.uri, `ripple:rM?amount=5&currency=${RLUSD_CURRENCY}&issuer=rIssuer`);
});

test('expiresInMs sets expiresAt and isPaymentExpired reflects it', () => {
  const req = createPaymentRequest({ to: 'r', amount: '1', expiresInMs: 1000 });
  assert.ok(req.expiresAt && req.expiresAt > req.createdAt);
  assert.equal(isPaymentExpired(req, req.createdAt), false);
  assert.equal(isPaymentExpired(req, req.expiresAt as number), true);
});
