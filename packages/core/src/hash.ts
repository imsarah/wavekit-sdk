/**
 * Compute an XRPL transaction id (hash) from a fully-signed transaction blob, using
 * WebCrypto — **no dependencies**. The id is SHA-512Half of the `TXN\0` hash prefix
 * followed by the signed binary. Handy for hardware adapters (Ledger, Trezor) that
 * return a signed blob but no hash.
 */
const TRANSACTION_ID_PREFIX = 0x54584e00; // "TXN\0"

/** Parse a hex string (optionally `0x`-prefixed) into bytes. */
export function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith('0x') || hex.startsWith('0X') ? hex.slice(2) : hex;
  if (clean.length % 2 !== 0 || /[^0-9a-fA-F]/.test(clean)) {
    throw new Error('hexToBytes: invalid hex string');
  }
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

/** Lower-case hex encoding of bytes. */
export function bytesToHex(bytes: Uint8Array): string {
  let out = '';
  for (const b of bytes) out += b.toString(16).padStart(2, '0');
  return out;
}

/** SHA-512Half of the signed transaction (with the XRPL txid prefix) → upper-hex id. */
export async function hashSignedTxBlob(txBlobHex: string): Promise<string> {
  const blob = hexToBytes(txBlobHex);
  const data = new Uint8Array(4 + blob.length);
  new DataView(data.buffer).setUint32(0, TRANSACTION_ID_PREFIX); // big-endian "TXN\0"
  data.set(blob, 4);
  const subtle = (globalThis.crypto as Crypto | undefined)?.subtle;
  if (!subtle) {
    throw new Error('hashSignedTxBlob: WebCrypto (crypto.subtle) is unavailable in this runtime');
  }
  const digest = await subtle.digest('SHA-512', data);
  return bytesToHex(new Uint8Array(digest).subarray(0, 32)).toUpperCase();
}
