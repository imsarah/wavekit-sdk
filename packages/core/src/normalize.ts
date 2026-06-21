import { xrpToDrops, DropsConversionError } from './drops';

/**
 * Transaction fields whose XRP value must be expressed in drops. Issued-currency
 * (IOU) amounts are objects of the shape `{ currency, issuer, value }` and are
 * passed through untouched.
 */
const DROPS_FIELDS = [
  'Amount',
  'SendMax',
  'DeliverMax',
  'DeliverMin',
  'LimitAmount',
  'TakerGets',
  'TakerPays',
] as const;

export type XrpAmountInput = string | number | { xrp: string | number };

function isIouAmount(value: unknown): boolean {
  return typeof value === 'object' && value !== null && 'currency' in (value as Record<string, unknown>);
}

/**
 * Normalize developer-friendly XRP amounts into the canonical integer-drops strings
 * the XRP Ledger expects, *without* touching issued-currency (IOU) amounts.
 *
 * - `{ xrp: '1.5' }`                    -> `'1500000'`
 * - `'1500000'` (string of digits)      -> passed through (already drops)
 * - `1500000` (integer number)          -> `'1500000'`
 * - `{ currency, issuer, value }` (IOU) -> untouched
 *
 * A bare **decimal** number such as `1.5` is rejected: a plain number is interpreted
 * as drops, and drops must be integers, so the caller almost certainly meant
 * `{ xrp: 1.5 }`. This makes the common "I forgot to convert to drops" bug loud
 * instead of silently sending 1.5 drops.
 */
export function normalizeTransactionAmounts<T extends Record<string, unknown>>(txJson: T): T {
  const out: Record<string, unknown> = { ...txJson };
  for (const field of DROPS_FIELDS) {
    if (!(field in out)) continue;
    const value = out[field];
    if (value == null || isIouAmount(value)) continue;
    out[field] = normalizeXrpField(field, value);
  }
  return out as T;
}

function normalizeXrpField(field: string, value: unknown): string {
  if (typeof value === 'object' && value !== null && 'xrp' in (value as Record<string, unknown>)) {
    return xrpToDrops((value as { xrp: string | number }).xrp);
  }
  if (typeof value === 'string') {
    if (!/^\d+$/.test(value.trim())) {
      throw new DropsConversionError(
        `Field "${field}" must be an integer drops string or { xrp }, got "${value}"`,
      );
    }
    return value.trim();
  }
  if (typeof value === 'number') {
    if (!Number.isInteger(value)) {
      throw new DropsConversionError(
        `Field "${field}" received the decimal number ${value}; pass { xrp: ${value} } to ` +
          `specify XRP, or an integer number of drops`,
      );
    }
    return String(value);
  }
  throw new DropsConversionError(`Unsupported amount for field "${field}"`);
}
