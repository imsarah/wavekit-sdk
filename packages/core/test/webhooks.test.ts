import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createPaymentRequest } from '../src/payments';
import { buildPaymentWebhookEvent, signWebhook, verifyWebhook } from '../src/webhooks';

const SECRET = 'whsec_test_123';

test('signWebhook + verifyWebhook round-trip', async () => {
  const body = JSON.stringify({ type: 'payment.paid', amount: '25' });
  const t = 1_700_000_000;
  const header = await signWebhook(SECRET, body, t);
  assert.match(header, /^t=1700000000,v1=[0-9a-f]{64}$/);
  assert.equal(await verifyWebhook(SECRET, body, header, { now: t }), true);
});

test('verifyWebhook rejects tampered body, wrong secret, and stale timestamps', async () => {
  const body = JSON.stringify({ amount: '25' });
  const t = 1_700_000_000;
  const header = await signWebhook(SECRET, body, t);

  assert.equal(await verifyWebhook(SECRET, '{"amount":"26"}', header, { now: t }), false);
  assert.equal(await verifyWebhook('wrong', body, header, { now: t }), false);
  assert.equal(await verifyWebhook(SECRET, body, header, { now: t + 10_000 }), false); // too old
  assert.equal(await verifyWebhook(SECRET, body, 'garbage', { now: t }), false);
});

test('buildPaymentWebhookEvent captures the request + tx', () => {
  const req = createPaymentRequest({ to: 'rMerchant', amount: { xrp: '25' }, destinationTag: 7 });
  const evt = buildPaymentWebhookEvent(req, { txHash: 'ABC123', id: 'evt_1', createdAt: 5 });
  assert.deepEqual(evt, {
    id: 'evt_1',
    type: 'payment.paid',
    createdAt: 5,
    data: {
      requestId: req.id,
      to: 'rMerchant',
      amountValue: '25',
      symbol: 'XRP',
      network: 'mainnet',
      txHash: 'ABC123',
      destinationTag: 7,
    },
  });
});
