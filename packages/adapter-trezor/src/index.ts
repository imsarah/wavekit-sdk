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
import { toTrezorRippleTransaction, type TrezorRippleTransaction } from './mapping';

export { toTrezorRippleTransaction } from './mapping';
export type { TrezorRippleTransaction, TrezorRipplePayment } from './mapping';

/** The slice of `@trezor/connect` this adapter uses (also the test injection point). */
export interface TrezorConnectLike {
  init(options: Record<string, unknown>): Promise<unknown>;
  rippleGetAddress(params: { path: string; showOnTrezor?: boolean }): Promise<{
    success: boolean;
    payload: { address?: string; error?: string };
  }>;
  rippleSignTransaction(params: { path: string; transaction: TrezorRippleTransaction }): Promise<{
    success: boolean;
    payload: { serializedTx?: string; signature?: string; error?: string };
  }>;
}

export interface TrezorAdapterOptions {
  /** BIP-44 derivation path. Default `"m/44'/144'/0'/0/0"`. */
  derivationPath?: string;
  /** Network accounts are bound to. Default `'mainnet'`. */
  network?: NetworkType;
  /** Trezor Connect manifest (required by the SDK). */
  manifest?: { email: string; appUrl: string };
  /** Extra options forwarded to `TrezorConnect.init`. */
  initOptions?: Record<string, unknown>;
  /** Inject a TrezorConnect-like object (advanced / testing). */
  lib?: TrezorConnectLike;
}

const DEFAULT_PATH = "m/44'/144'/0'/0/0";

const TREZOR_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" role="img" aria-label="Trezor">' +
  '<rect width="48" height="48" rx="12" fill="#fff"/>' +
  '<path d="M24 11c-3.87 0-7 3.13-7 7v2.6h-2.3v11.1L24 36l9.3-4.3V20.6H31V18c0-3.87-3.13-7-7-7Zm-3.8 9.6V18c0-2.1 1.7-3.8 3.8-3.8s3.8 1.7 3.8 3.8v2.6h-7.6Z" fill="#0B0B0B"/></svg>';

/**
 * Trezor hardware adapter. Reads the account with `rippleGetAddress` and signs with
 * `rippleSignTransaction` (Trezor's signing popup). Only XRP Payments are supported and
 * the transaction must be complete (Fee, Sequence) — Trezor does not autofill.
 */
export function trezorAdapter(options: TrezorAdapterOptions = {}): XRPLWalletAdapter {
  const path = options.derivationPath ?? DEFAULT_PATH;
  const network: NetworkType = options.network ?? 'mainnet';
  const listeners = {
    accountsChanged: new Set<AdapterEventMap['accountsChanged']>(),
    disconnect: new Set<AdapterEventMap['disconnect']>(),
  };

  let lib: TrezorConnectLike | undefined = options.lib;
  let initialized = false;

  function emit<E extends keyof AdapterEventMap>(event: E, ...args: Parameters<AdapterEventMap[E]>): void {
    for (const cb of listeners[event]) {
      (cb as (...a: Parameters<AdapterEventMap[E]>) => void)(...args);
    }
  }

  async function getLib(): Promise<TrezorConnectLike> {
    if (!lib) {
      const mod = await import('@trezor/connect');
      lib = mod.default as unknown as TrezorConnectLike;
    }
    if (!initialized) {
      const manifest = options.manifest ?? { email: 'dev@wavekit.local', appUrl: 'https://wavekit.dev' };
      await lib.init({ manifest, lazyLoad: true, ...options.initOptions });
      initialized = true;
    }
    return lib;
  }

  return {
    id: 'trezor',
    name: 'Trezor',
    icon: TREZOR_ICON,
    downloadUrl: 'https://trezor.io/',

    async connect(connectOptions?: ConnectOptions): Promise<WalletAccount> {
      const sdk = await getLib();
      const net = connectOptions?.network ?? network;
      const res = await withAbort(sdk.rippleGetAddress({ path }), connectOptions?.signal);
      if (!res.success || !res.payload.address) {
        throw new Error(`trezorAdapter: ${res.payload.error ?? 'could not read address'}`);
      }
      const account: WalletAccount = { address: res.payload.address, network: net };
      emit('accountsChanged', account);
      return account;
    },

    async disconnect(): Promise<void> {
      emit('disconnect');
    },

    async signTransaction(
      txJson: Record<string, unknown>,
      signOptions?: SignOptions,
    ): Promise<SignedTransaction> {
      const sdk = await getLib();
      const transaction = toTrezorRippleTransaction(normalizeTransactionAmounts(txJson));
      const res = await withAbort(sdk.rippleSignTransaction({ path, transaction }), signOptions?.signal);
      if (!res.success || !res.payload.serializedTx) {
        throw new Error(`trezorAdapter: ${res.payload.error ?? 'signing failed'}`);
      }
      const txBlob = res.payload.serializedTx.toUpperCase();
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
