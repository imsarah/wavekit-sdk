import { NextResponse } from 'next/server';
import { verifyWebhook, type PaymentWebhookEvent } from '@wavekit-sdk/core';
import { WEBHOOK_SECRET } from '../../../../src/webhookSecret';

// A SAMPLE merchant webhook receiver: verifies the WaveKit signature, then records the
// event (in memory, for the demo). This is the code a merchant runs on their backend.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface StoredEvent {
  event: PaymentWebhookEvent;
  verified: boolean;
  receivedAt: number;
}

// Module-level store — fine for a single-instance demo; use a DB in production.
const received: StoredEvent[] = [];

export async function POST(req: Request) {
  const raw = await req.text();
  const signature = req.headers.get('wavekit-signature') ?? '';
  const verified = await verifyWebhook(WEBHOOK_SECRET, raw, signature);
  if (!verified) {
    return NextResponse.json({ error: 'invalid signature' }, { status: 400 });
  }
  let event: PaymentWebhookEvent;
  try {
    event = JSON.parse(raw) as PaymentWebhookEvent;
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }
  received.unshift({ event, verified, receivedAt: Date.now() });
  if (received.length > 20) received.length = 20;
  return NextResponse.json({ received: true });
}

export async function GET() {
  return NextResponse.json({ events: received });
}
