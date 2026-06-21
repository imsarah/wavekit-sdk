import {
  hashSignedTxBlob,
  normalizeTransactionAmounts,
  withAbort,
  type AdapterEventMap,
  type ConnectOptions,
  type NetworkType,
  type SignedTransaction,
  type SignOptions,
  type WalletAccount,
  type XRPLWalletAdapter,
} from '@wavekit-sdk/core';

/** Minimal shape of `@ledgerhq/hw-app-xrp` used here (also the injection point for tests). */
export interface LedgerXrpApp {
  getAddress(path: string, display?: boolean): Promise<{ address: string; publicKey: string }>;
  signTransaction(path: string, rawTxHex: string): Promise<string>;
}

interface LedgerTransport {
  close(): Promise<void>;
}

interface BinaryCodec {
  encode(tx: Record<string, unknown>): string;
  encodeForSigning(tx: Record<string, unknown>): string;
}

export interface LedgerAdapterOptions {
  /** BIP-44 derivation path. Default `"44'/144'/0'/0/0"`. */
  derivationPath?: string;
  /** Network accounts are bound to. Default `'mainnet'`. */
  network?: NetworkType;
  /** Inject a Ledger transport (advanced / testing). Defaults to WebHID. */
  transport?: LedgerTransport;
  /** Inject an Xrp app instance (advanced / testing). */
  app?: LedgerXrpApp;
}

const DEFAULT_PATH = "44'/144'/0'/0/0";

const LEDGER_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" role="img" aria-label="Ledger">' +
  '<rect width="48" height="48" rx="12" fill="#000"/>' +
  '<g fill="#fff"><path d="M14 14h10v3.4h-6.6V24H14V14Z"/><path d="M34 34H24v-3.4h6.6V24H34v10Z"/></g></svg>';

/**
 * Ledger hardware adapter. Connects over WebHID, reads the account with the XRP app,
 * and signs locally: WaveKit serializes the transaction (`ripple-binary-codec`), the
 * device returns the signature, and the signed blob is hashed with the built-in
 * `hashSignedTxBlob`. The transaction must be complete (Fee, Sequence, …) before signing
 * — Ledger does not autofill.
 */
export function ledgerAdapter(options: LedgerAdapterOptions = {}): XRPLWalletAdapter {
  const path = options.derivationPath ?? DEFAULT_PATH;
  const network: NetworkType = options.network ?? 'mainnet';
  const listeners = {
    accountsChanged: new Set<AdapterEventMap['accountsChanged']>(),
    disconnect: new Set<AdapterEventMap['disconnect']>(),
  };

  let transport: LedgerTransport | undefined = options.transport;
  let app: LedgerXrpApp | undefined = options.app;
  let publicKey: string | null = null;

  function emit<E extends keyof AdapterEventMap>(event: E, ...args: Parameters<AdapterEventMap[E]>): void {
    for (const cb of listeners[event]) {
      (cb as (...a: Parameters<AdapterEventMap[E]>) => void)(...args);
    }
  }

  async function getApp(): Promise<LedgerXrpApp> {
    if (app) return app;
    if (!transport) {
      const mod = await import('@ledgerhq/hw-transport-webhid');
      transport = await mod.default.create();
    }
    const xrpMod = await import('@ledgerhq/hw-app-xrp');
    app = new xrpMod.default(transport) as unknown as LedgerXrpApp;
    return app;
  }

  return {
    id: 'ledger',
    name: 'Ledger',
    icon: LEDGER_ICON,
    downloadUrl: 'https://www.ledger.com/',

    async connect(connectOptions?: ConnectOptions): Promise<WalletAccount> {
      const xrp = await getApp();
      const net = connectOptions?.network ?? network;
      const res = await withAbort(xrp.getAddress(path), connectOptions?.signal);
      publicKey = res.publicKey.toUpperCase();
      const account: WalletAccount = { address: res.address, publicKey, network: net };
      emit('accountsChanged', account);
      return account;
    },

    async disconnect(): Promise<void> {
      try {
        await transport?.close();
      } catch {
        /* ignore */
      }
      transport = options.transport;
      app = options.app;
      publicKey = null;
      emit('disconnect');
    },

    async signTransaction(
      txJson: Record<string, unknown>,
      signOptions?: SignOptions,
    ): Promise<SignedTransaction> {
      const xrp = await getApp();
      if (!publicKey) throw new Error('ledgerAdapter: not connected');

      const codec = await loadCodec();
      const tx: Record<string, unknown> = { ...normalizeTransactionAmounts(txJson), SigningPubKey: publicKey };
      const signingBlob = codec.encodeForSigning(tx);
      const signature = await withAbort(xrp.signTransaction(path, signingBlob), signOptions?.signal);
      const signedTx: Record<string, unknown> = { ...tx, TxnSignature: signature.toUpperCase() };
      const txBlob = codec.encode(signedTx);
      return { txBlob, hash: await hashSignedTxBlob(txBlob) };
    },

    on(event, callback) {
      const set = listeners[event] as Set<typeof callback>;
      set.add(callback);
      return () => {
        set.delete(callback);
      };
    },
  };
}

async function loadCodec(): Promise<BinaryCodec> {
  try {
    const codec = await import('ripple-binary-codec');
    return codec;
  } catch (err) {
    throw new Error(`ledgerAdapter: install \`ripple-binary-codec\` to serialize transactions (${String(err)})`);
  }
}
