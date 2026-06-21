/**
 * Ambient declarations for the optional peer dependencies the Ledger adapter
 * lazy-loads: the XRP app, a WebHID transport, and `ripple-binary-codec` for
 * (de)serializing the transaction around the device signature.
 */
declare module '@ledgerhq/hw-app-xrp' {
  export interface XrpAddress {
    publicKey: string;
    address: string;
    chainCode?: string;
  }
  export default class Xrp {
    constructor(transport: unknown);
    getAddress(path: string, display?: boolean): Promise<XrpAddress>;
    signTransaction(path: string, rawTxHex: string): Promise<string>;
  }
}

declare module '@ledgerhq/hw-transport-webhid' {
  export interface LedgerTransport {
    close(): Promise<void>;
  }
  const TransportWebHID: {
    create(): Promise<LedgerTransport>;
  };
  export default TransportWebHID;
}

declare module 'ripple-binary-codec' {
  export function encode(txJson: Record<string, unknown>): string;
  export function encodeForSigning(txJson: Record<string, unknown>): string;
  export function decode(blob: string): Record<string, unknown>;
}
