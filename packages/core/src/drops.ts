/**
 * XRP <-> drops conversion helpers.
 *
 * 1 XRP = 1,000,000 drops. XRP amounts therefore have at most 6 decimal places and
 * drops are always integers. All maths is done with `BigInt` / string parsing so we
 * never lose precision the way `parseFloat` would.
 */

/** Number of drops in one XRP. */
export const DROPS_PER_XRP = 1_000_000n;

/** Total XRP supply expressed in drops (100,000,000,000 XRP). */
export const MAX_DROPS = 100_000_000_000_000_000n;

const XRP_DECIMALS = 6;

export class DropsConversionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DropsConversionError';
  }
}

/**
 * Convert an XRP amount to an integer **drops** string.
 *
 * Strings are parsed exactly and may carry up to 6 decimals. Numbers are convenient
 * but lossy and are rounded to 6 decimals — prefer strings for exact amounts.
 *
 * @example xrpToDrops('1.5')     // '1500000'
 * @example xrpToDrops('0.000001') // '1'
 */
export function xrpToDrops(xrp: string | number | bigint): string {
  if (typeof xrp === 'bigint') {
    return assertInRange(xrp * DROPS_PER_XRP);
  }

  const raw = typeof xrp === 'number' ? numberToDecimalString(xrp) : xrp.trim();
  if (!/^-?\d+(\.\d+)?$/.test(raw)) {
    throw new DropsConversionError(`Invalid XRP amount: "${xrp}"`);
  }

  const negative = raw.startsWith('-');
  const [intPart = '0', fracPart = ''] = raw.replace('-', '').split('.');

  if (fracPart.length > XRP_DECIMALS) {
    throw new DropsConversionError(
      `XRP supports at most ${XRP_DECIMALS} decimal places, got "${xrp}"`,
    );
  }

  const padded = fracPart.padEnd(XRP_DECIMALS, '0');
  const drops = BigInt(intPart) * DROPS_PER_XRP + BigInt(padded || '0');
  return assertInRange(negative ? -drops : drops);
}

/**
 * Convert an integer **drops** amount to a normalized XRP decimal string
 * (trailing zeros trimmed).
 *
 * @example dropsToXrp('1500000') // '1.5'
 * @example dropsToXrp(1n)        // '0.000001'
 */
export function dropsToXrp(drops: string | number | bigint): string {
  let value: bigint;
  if (typeof drops === 'bigint') {
    value = drops;
  } else if (typeof drops === 'number') {
    if (!Number.isInteger(drops)) {
      throw new DropsConversionError(`drops must be an integer, got ${drops}`);
    }
    value = BigInt(drops);
  } else {
    const raw = drops.trim();
    if (!/^-?\d+$/.test(raw)) {
      throw new DropsConversionError(`Invalid drops amount: "${drops}"`);
    }
    value = BigInt(raw);
  }

  assertInRange(value);

  const negative = value < 0n;
  const abs = negative ? -value : value;
  const intPart = abs / DROPS_PER_XRP;
  const fracPart = abs % DROPS_PER_XRP;

  let result = intPart.toString();
  if (fracPart > 0n) {
    const frac = fracPart.toString().padStart(XRP_DECIMALS, '0').replace(/0+$/, '');
    result += `.${frac}`;
  }
  return negative ? `-${result}` : result;
}

function assertInRange(drops: bigint): string {
  const abs = drops < 0n ? -drops : drops;
  if (abs > MAX_DROPS) {
    throw new DropsConversionError(`drops amount ${drops} exceeds the maximum XRP supply`);
  }
  return drops.toString();
}

function numberToDecimalString(n: number): string {
  if (!Number.isFinite(n)) {
    throw new DropsConversionError(`Invalid XRP amount: ${n}`);
  }
  if (Number.isInteger(n)) return n.toString();
  // toFixed never uses exponential notation for the magnitudes XRP cares about,
  // and rounds to our 6-decimal precision. Trailing zeros are trimmed below.
  return n.toFixed(XRP_DECIMALS).replace(/0+$/, '').replace(/\.$/, '');
}
