/**
 * Signed payment webhooks — let a merchant backend trust "payment received" events.
 *
 * Uses WebCrypto HMAC-SHA256 (no dependencies). The signature header is Stripe-style:
 *   `t=<unix-seconds>,v1=<hex-hmac>`
 * computed over `"{t}.{rawBody}"`, so a receiver can reject replays by timestamp and
 * verify integrity with a shared secret.
 */
import { bytesToHex } from './hash';
import type { PaymentRequest } from './payments';

export interface PaymentWebhookEvent {
  id: string;
  type: 'payment.paid';
  /** Unix epoch (ms) the event was created. */
  createdAt: number;
  data: {
    requestId: string;
    to: string;
    amountValue: string;
    symbol: string;
    network: string;
    txHash: string;
    destinationTag?: number;
  };
}

function generateEventId(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (c?.randomUUID) return `evt_${c.randomUUID()}`;
  return `evt_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

/** Build a `payment.paid` event from a request and the settling transaction hash. */
export function buildPaymentWebhookEvent(
  request: PaymentRequest,
  opts: { txHash: string; id?: string; createdAt?: number },
): PaymentWebhookEvent {
  return {
    id: opts.id ?? generateEventId(),
    type: 'payment.paid',
    createdAt: opts.createdAt ?? Date.now(),
    data: {
      requestId: request.id,
      to: request.to,
      amountValue: request.amountValue,
      symbol: request.symbol,
      network: request.network,
      txHash: opts.txHash,
      destinationTag: request.destinationTag,
    },
  };
}

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const subtle = (globalThis.crypto as Crypto | undefined)?.subtle;
  if (!subtle) throw new Error('signWebhook: WebCrypto (crypto.subtle) is unavailable in this runtime');
  const enc = new TextEncoder();
  const key = await subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
  ]);
  const sig = await subtle.sign('HMAC', key, enc.encode(message));
  return bytesToHex(new Uint8Array(sig));
}

/** Produce the `t=…,v1=…` signature header for a raw JSON body. */
export async function signWebhook(
  secret: string,
  payload: string,
  timestampSec: number = Math.floor(Date.now() / 1000),
): Promise<string> {
  const v1 = await hmacSha256Hex(secret, `${timestampSec}.${payload}`);
  return `t=${timestampSec},v1=${v1}`;
}

function parseSignatureHeader(header: string): { t: number; v1: string } | null {
  let t: number | null = null;
  let v1: string | null = null;
  for (const part of header.split(',')) {
    const [k, val] = part.split('=');
    if (k?.trim() === 't' && val) t = Number(val.trim());
    if (k?.trim() === 'v1' && val) v1 = val.trim();
  }
  if (t == null || Number.isNaN(t) || !v1) return null;
  return { t, v1 };
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * Verify a webhook signature against the raw body and shared secret. Rejects
 * tampered bodies, wrong secrets, and (by default) timestamps older than 5 minutes.
 */
export async function verifyWebhook(
  secret: string,
  payload: string,
  signatureHeader: string,
  opts: { toleranceSec?: number; now?: number } = {},
): Promise<boolean> {
  const parsed = parseSignatureHeader(signatureHeader);
  if (!parsed) return false;
  const tolerance = opts.toleranceSec ?? 300;
  const now = opts.now ?? Math.floor(Date.now() / 1000);
  if (Math.abs(now - parsed.t) > tolerance) return false;
  const expected = await hmacSha256Hex(secret, `${parsed.t}.${payload}`);
  return timingSafeEqual(expected, parsed.v1);
}
