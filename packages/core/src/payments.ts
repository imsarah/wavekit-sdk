/**
 * Payments — the WaveKit "Pay with XRP / RLUSD" checkout primitive.
 *
 * A {@link PaymentRequest} is wallet-agnostic. It supports two asset types:
 *  - **XRP**, normalized to integer **drops** (BigInt-exact), and
 *  - **tokens (IOUs)** such as RLUSD, expressed as `{ currency, issuer, value }`.
 *
 * It carries an optional **transparent** platform fee (in the same asset), a total,
 * and a `ripple:` URI for a QR code. Turn a request into a signable XRPL Payment with
 * {@link buildPaymentTransaction}; the fee, when configured, is a *separate* Payment
 * (see {@link buildFeePaymentForRequest}) — never hidden inside the user's transfer.
 */
import { DropsConversionError, dropsToXrp, xrpToDrops } from './drops';
import { computeSwapFeeDrops, type MonetizationConfig } from './monetization';
import type { NetworkType } from './types';

export interface TokenAsset {
  /** Currency code: 3-char ASCII (e.g. "USD") or 40-char hex (e.g. RLUSD). */
  currency: string;
  /** Issuer r-address. */
  issuer: string;
}

export type PaymentAsset =
  | { readonly type: 'XRP'; readonly symbol: 'XRP' }
  | {
      readonly type: 'TOKEN';
      readonly currency: string;
      readonly issuer: string;
      readonly symbol: string;
    };

export const XRP_ASSET: PaymentAsset = { type: 'XRP', symbol: 'XRP' };

/* ----------------------------- RLUSD (Ripple USD) ---------------------------- */

/** RLUSD currency code (hex) — ASCII "RLUSD" right-padded to 40 hex chars. */
export const RLUSD_CURRENCY = '524C555344000000000000000000000000000000';
/** RLUSD issuer on XRPL **mainnet** (Ripple). Verify against ripple.com before production. */
export const RLUSD_ISSUER_MAINNET = 'rMxCKbEDwqr76QuheSUMdEGf4B9xJ8m5De';

/** Build the RLUSD {@link TokenAsset} for a given issuer. */
export function rlusd(issuer: string): TokenAsset {
  return { currency: RLUSD_CURRENCY, issuer };
}

/* --------------------------------- requests --------------------------------- */

export type PaymentAmountInput =
  | string
  | number
  | { xrp: string | number }
  | { value: string | number };

export type PaymentStatus = 'pending' | 'paid' | 'expired' | 'error';

export interface CreatePaymentRequestInput {
  /** Merchant r-address that receives the payment. */
  to: string;
  /**
   * Amount to charge:
   * - XRP (default): `{ xrp: '25' }`, or an integer drops string/number
   * - Token: `{ value: '25.00' }` or a decimal string/number, with `asset` set
   */
  amount: PaymentAmountInput;
  /** Charge a token (IOU) such as RLUSD instead of XRP. */
  asset?: TokenAsset;
  /** Short label shown to the payer (e.g. "Order #1234"). */
  label?: string;
  /** XRPL destination tag, if your merchant account uses one. */
  destinationTag?: number;
  /** Network this request targets. Defaults to `'mainnet'`. */
  network?: NetworkType;
  /** Stable id; auto-generated when omitted. */
  id?: string;
  /** Lifetime in ms; sets `expiresAt`. Omit for no expiry. */
  expiresInMs?: number;
  /** Optional transparent platform fee, taken in the same asset. */
  monetization?: MonetizationConfig;
}

export interface PaymentFee {
  recipient: string;
  /** Fee rate in basis points (1 bps = 0.01%). */
  bps: number;
  /** Fee as a decimal string in the payment's asset (e.g. '0.2'). */
  value: string;
  /** Fee in drops when the asset is XRP, else `null`. */
  drops: string | null;
}

export interface PaymentRequest {
  id: string;
  to: string;
  asset: PaymentAsset;
  /** Convenience copy of `asset.symbol` (e.g. 'XRP', 'RLUSD'). */
  symbol: string;
  /** Charged amount as a decimal string in the asset (e.g. '25', '1.5'). */
  amountValue: string;
  /** Charged amount in drops when XRP, else `null`. */
  amountDrops: string | null;
  fee: PaymentFee | null;
  /** amount + fee as a decimal string. */
  totalValue: string;
  /** amount + fee in drops when XRP, else `null`. */
  totalDrops: string | null;
  label?: string;
  destinationTag?: number;
  network: NetworkType;
  /** `ripple:` payment URI, suitable for a QR code. */
  uri: string;
  createdAt: number;
  expiresAt?: number;
}

/* ------------------------------- decimal maths ------------------------------ */

function formatScaled(value: bigint, decimals: number): string {
  const negative = value < 0n;
  const digits = (negative ? -value : value).toString().padStart(decimals + 1, '0');
  const cut = digits.length - decimals;
  const intPart = digits.slice(0, cut);
  const fracPart = (decimals > 0 ? digits.slice(cut) : '').replace(/0+$/, '');
  const out = fracPart ? `${intPart}.${fracPart}` : intPart;
  return negative ? `-${out}` : out;
}

function parseDecimal(value: string): { scaled: bigint; scale: number } {
  const raw = value.trim();
  if (!/^\d+(\.\d+)?$/.test(raw)) {
    throw new DropsConversionError(`Invalid token amount: "${value}"`);
  }
  const [intPart = '0', fracPart = ''] = raw.split('.');
  return { scaled: BigInt(intPart + fracPart), scale: fracPart.length };
}

function normalizeDecimal(value: string): string {
  const { scaled, scale } = parseDecimal(value);
  return formatScaled(scaled, scale);
}

function decimalAdd(a: string, b: string): string {
  const pa = parseDecimal(a);
  const pb = parseDecimal(b);
  const scale = Math.max(pa.scale, pb.scale);
  const an = pa.scaled * 10n ** BigInt(scale - pa.scale);
  const bn = pb.scaled * 10n ** BigInt(scale - pb.scale);
  return formatScaled(an + bn, scale);
}

// fee = value * bps / 10000, computed exactly (bps carries 4 implied decimals).
function computeTokenFee(value: string, bps: number): string {
  const { scaled, scale } = parseDecimal(value);
  return formatScaled(scaled * BigInt(bps), scale + 4);
}

/* --------------------------------- helpers --------------------------------- */

function amountToDrops(amount: PaymentAmountInput): string {
  if (typeof amount === 'object' && amount !== null) {
    if ('xrp' in amount) return xrpToDrops(amount.xrp);
    throw new DropsConversionError('For XRP use { xrp } or a drops string; set `asset` to charge a token');
  }
  if (typeof amount === 'string') {
    const raw = amount.trim();
    if (!/^\d+$/.test(raw)) {
      throw new DropsConversionError(`amount must be an integer drops string or { xrp }, got "${amount}"`);
    }
    return raw;
  }
  if (typeof amount === 'number') {
    if (!Number.isInteger(amount) || amount < 0) {
      throw new DropsConversionError(
        `a bare number is treated as drops and must be a non-negative integer; pass { xrp: ${amount} } for XRP`,
      );
    }
    return String(amount);
  }
  throw new DropsConversionError('Unsupported payment amount');
}

function tokenValueToString(amount: PaymentAmountInput): string {
  const raw =
    typeof amount === 'object' && amount !== null && 'value' in amount ? amount.value : amount;
  if (typeof raw === 'number') return normalizeDecimal(raw.toString());
  if (typeof raw === 'string') return normalizeDecimal(raw);
  throw new DropsConversionError('Token amount must be a decimal string/number or { value }');
}

/** Best-effort human symbol from a currency code (decodes 40-char hex ASCII). */
export function currencySymbol(currency: string): string {
  if (/^[A-Za-z0-9]{3}$/.test(currency)) return currency.toUpperCase();
  if (/^[0-9A-Fa-f]{40}$/.test(currency)) {
    let s = '';
    for (let i = 0; i < currency.length; i += 2) {
      const code = parseInt(currency.slice(i, i + 2), 16);
      if (code === 0) break;
      s += String.fromCharCode(code);
    }
    return s || currency;
  }
  return currency;
}

function generateId(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (c?.randomUUID) return `pay_${c.randomUUID()}`;
  return `pay_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

function buildUri(
  to: string,
  asset: PaymentAsset,
  amountValue: string,
  destinationTag?: number,
  label?: string,
): string {
  const params: string[] = [`amount=${amountValue}`];
  if (asset.type === 'TOKEN') {
    params.push(`currency=${asset.currency}`, `issuer=${asset.issuer}`);
  }
  if (destinationTag != null) params.push(`dt=${destinationTag}`);
  if (label) params.push(`label=${encodeURIComponent(label)}`);
  return `ripple:${to}?${params.join('&')}`;
}

/* --------------------------------- public ---------------------------------- */

/** Build a normalized, wallet-agnostic payment request (XRP or token). */
export function createPaymentRequest(input: CreatePaymentRequestInput): PaymentRequest {
  if (!input.to || typeof input.to !== 'string') {
    throw new Error('createPaymentRequest: `to` (merchant address) is required');
  }

  const createdAt = Date.now();
  const bps = input.monetization?.swapFeeBps;
  const feeRecipient = input.monetization?.feeRecipient;

  let asset: PaymentAsset;
  let amountValue: string;
  let amountDrops: string | null;
  let totalValue: string;
  let totalDrops: string | null;
  let fee: PaymentFee | null = null;

  if (input.asset) {
    asset = {
      type: 'TOKEN',
      currency: input.asset.currency,
      issuer: input.asset.issuer,
      symbol: currencySymbol(input.asset.currency),
    };
    amountValue = tokenValueToString(input.amount);
    amountDrops = null;
    totalValue = amountValue;
    totalDrops = null;
    if (bps != null && feeRecipient) {
      const feeValue = computeTokenFee(amountValue, bps);
      if (parseDecimal(feeValue).scaled !== 0n) {
        fee = { recipient: feeRecipient, bps, value: feeValue, drops: null };
        totalValue = decimalAdd(amountValue, feeValue);
      }
    }
  } else {
    asset = XRP_ASSET;
    amountDrops = amountToDrops(input.amount);
    amountValue = dropsToXrp(amountDrops);
    totalDrops = amountDrops;
    totalValue = amountValue;
    if (bps != null && feeRecipient) {
      const feeDrops = computeSwapFeeDrops(amountDrops, bps);
      if (feeDrops !== '0') {
        fee = { recipient: feeRecipient, bps, value: dropsToXrp(feeDrops), drops: feeDrops };
        totalDrops = (BigInt(amountDrops) + BigInt(feeDrops)).toString();
        totalValue = dropsToXrp(totalDrops);
      }
    }
  }

  return {
    id: input.id ?? generateId(),
    to: input.to,
    asset,
    symbol: asset.symbol,
    amountValue,
    amountDrops,
    fee,
    totalValue,
    totalDrops,
    label: input.label,
    destinationTag: input.destinationTag,
    network: input.network ?? 'mainnet',
    uri: buildUri(input.to, asset, amountValue, input.destinationTag, input.label),
    createdAt,
    expiresAt: input.expiresInMs != null ? createdAt + input.expiresInMs : undefined,
  };
}

/** The XRPL `Amount` for a request: a drops string (XRP) or an IOU object (token). */
export function paymentAmount(request: PaymentRequest): string | { currency: string; issuer: string; value: string } {
  return request.asset.type === 'XRP'
    ? (request.amountDrops as string)
    : { currency: request.asset.currency, issuer: request.asset.issuer, value: request.amountValue };
}

/**
 * Turn a request into a signable XRPL Payment (the merchant transfer). Pass the
 * connected account as `from`.
 */
export function buildPaymentTransaction(request: PaymentRequest, from: string): Record<string, unknown> {
  const tx: Record<string, unknown> = {
    TransactionType: 'Payment',
    Account: from,
    Destination: request.to,
    Amount: paymentAmount(request),
  };
  if (request.destinationTag != null) tx.DestinationTag = request.destinationTag;
  return tx;
}

/**
 * Build the separate, transparent fee Payment for a request, or `null` when the
 * request carries no fee. The fee is paid in the same asset as the request.
 */
export function buildFeePaymentForRequest(
  request: PaymentRequest,
  from: string,
): Record<string, unknown> | null {
  if (!request.fee) return null;
  const amount =
    request.asset.type === 'XRP'
      ? (request.fee.drops as string)
      : { currency: request.asset.currency, issuer: request.asset.issuer, value: request.fee.value };
  return {
    TransactionType: 'Payment',
    Account: from,
    Destination: request.fee.recipient,
    Amount: amount,
  };
}

/** Whether a request has passed its expiry. */
export function isPaymentExpired(request: PaymentRequest, now: number = Date.now()): boolean {
  return request.expiresAt != null && now >= request.expiresAt;
}
