/**
 * Monetization helpers — the open-source sustainability hook from the WaveKit spec.
 *
 * The developer fee is always a **separate, fully transparent** Payment to the
 * configured recipient. Nothing is ever hidden inside a user's transaction; this is
 * the same model used by mainstream swap front-ends (referral / integrator fees).
 */

export interface MonetizationConfig {
  /** r-address that receives the developer fee. */
  feeRecipient: string;
  /** Fee taken on swaps, in basis points (1 bps = 0.01%). e.g. `20` = 0.2%. */
  swapFeeBps: number;
}

const BPS_DENOMINATOR = 10_000n;

function toBigIntDrops(drops: string | number | bigint): bigint {
  if (typeof drops === 'bigint') return drops;
  if (typeof drops === 'number') {
    if (!Number.isInteger(drops) || drops < 0) {
      throw new Error(`drops must be a non-negative integer, got ${drops}`);
    }
    return BigInt(drops);
  }
  const raw = drops.trim();
  if (!/^\d+$/.test(raw)) throw new Error(`Invalid drops amount: "${drops}"`);
  return BigInt(raw);
}

export function validateSwapFeeBps(bps: number): void {
  if (!Number.isInteger(bps) || bps < 0 || bps > 10_000) {
    throw new Error(`swapFeeBps must be an integer between 0 and 10000, got ${bps}`);
  }
}

/**
 * Compute the developer fee (in drops) for a swap of `inputDrops` at `swapFeeBps`.
 * Integer maths floored, so the fee never over-charges by a drop.
 */
export function computeSwapFeeDrops(inputDrops: string | number | bigint, swapFeeBps: number): string {
  validateSwapFeeBps(swapFeeBps);
  const input = toBigIntDrops(inputDrops);
  return ((input * BigInt(swapFeeBps)) / BPS_DENOMINATOR).toString();
}

export interface BuildFeePaymentArgs {
  /** r-address that pays (and is debited) the fee — usually the connected account. */
  from: string;
  /** The swap input size in drops, used to compute the fee. */
  inputDrops: string | number | bigint;
  config: MonetizationConfig;
}

/**
 * Build a transparent developer-fee `Payment`, or `null` when the fee rounds to
 * zero. The returned object is a standard XRPL Payment with the fee `Amount` in drops.
 */
export function buildFeePayment(args: BuildFeePaymentArgs): Record<string, unknown> | null {
  const feeDrops = computeSwapFeeDrops(args.inputDrops, args.config.swapFeeBps);
  if (feeDrops === '0') return null;
  return {
    TransactionType: 'Payment',
    Account: args.from,
    Destination: args.config.feeRecipient,
    Amount: feeDrops,
  };
}
