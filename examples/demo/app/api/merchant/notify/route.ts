import { NextResponse } from 'next/server';
import {
  buildPaymentWebhookEvent,
  createPaymentRequest,
  signWebhook,
  type NetworkType,
} from '@wavekit-sdk/core';
import { WEBHOOK_SECRET } from '../../../../src/webhookSecret';

// The WaveKit "fire webhook" step: build a payment.paid event, sign it, and deliver it
// to the merchant's endpoint. In production you'd call this after the ledger watcher
// confirms a payment; here it's driven by the demo's "simulate" button.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const input = (await req.json().catch(() => ({}))) as {
    to?: string;
    amountXrp?: string | number;
    network?: NetworkType;
    destinationTag?: number;
    txHash?: string;
    label?: string;
  };

  const request = createPaymentRequest({
    to: input.to ?? 'rMerchantDemo5n4Rq8Xc2Vb1ZsExample',
    amount: { xrp: String(input.amountXrp ?? '25') },
    network: input.network ?? 'testnet',
    label: input.label ?? 'Demo order',
    ...(typeof input.destinationTag === 'number' ? { destinationTag: input.destinationTag } : {}),
  });

  const event = buildPaymentWebhookEvent(request, { txHash: input.txHash ?? 'DEMO_TX_HASH_0001' });
  const body = JSON.stringify(event);
  const signature = await signWebhook(WEBHOOK_SECRET, body);

  try {
    const res = await fetch(new URL('/api/merchant/webhook', req.url), {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'wavekit-signature': signature },
      body,
    });
    return NextResponse.json({ delivered: res.ok, status: res.status, event });
  } catch (e) {
    return NextResponse.json(
      { delivered: false, error: e instanceof Error ? e.message : 'delivery failed', event },
      { status: 502 },
    );
  }
}
