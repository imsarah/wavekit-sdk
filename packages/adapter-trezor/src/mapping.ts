/**
 * Map a (normalized) XRPL Payment onto the transaction shape `@trezor/connect`'s
 * `rippleSignTransaction` expects. Trezor only supports XRP Payments and does not
 * autofill, so `Fee` and `Sequence` must already be set. Kept dependency-free so it
 * can be unit-tested in isolation.
 */
export interface TrezorRipplePayment {
  amount: string;
  destination: string;
  destinationTag?: number;
}

export interface TrezorRippleTransaction {
  fee: string;
  flags?: number;
  sequence: number;
  maxLedgerVersion?: number;
  payment: TrezorRipplePayment;
}

export function toTrezorRippleTransaction(tx: Record<string, unknown>): TrezorRippleTransaction {
  if (tx.TransactionType !== 'Payment') {
    throw new Error('trezorAdapter: only Payment transactions are supported');
  }
  const { Amount, Destination, Fee, Sequence } = tx;
  if (typeof Amount !== 'string') {
    throw new Error(
      'trezorAdapter: Payment Amount must be XRP drops (use { xrp } or a drops string; IOUs are unsupported)',
    );
  }
  if (typeof Destination !== 'string') {
    throw new Error('trezorAdapter: Payment requires a Destination');
  }
  if (Fee == null || Sequence == null) {
    throw new Error(
      'trezorAdapter: Trezor needs a complete transaction — set Fee and Sequence (autofill before signing)',
    );
  }

  const payment: TrezorRipplePayment = { amount: Amount, destination: Destination };
  if (tx.DestinationTag != null) payment.destinationTag = Number(tx.DestinationTag);

  const out: TrezorRippleTransaction = { fee: String(Fee), sequence: Number(Sequence), payment };
  if (tx.Flags != null) out.flags = Number(tx.Flags);
  if (tx.LastLedgerSequence != null) out.maxLedgerVersion = Number(tx.LastLedgerSequence);
  return out;
}
