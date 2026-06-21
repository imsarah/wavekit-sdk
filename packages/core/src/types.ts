/**
 * Core type definitions for WaveKit — the unified wallet adapter for the XRP Ledger.
 *
 * Every wallet integration is expressed as an {@link XRPLWalletAdapter}. The core
 * client is wallet-agnostic and only ever talks to wallets through this contract,
 * which is what makes adding a new wallet a matter of writing one small adapter.
 */

export type NetworkType = 'mainnet' | 'testnet' | 'devnet';

export interface WalletAccount {
  /** The classic r-address of the connected account. */
  address: string;
  /** Hex-encoded public key, when the wallet exposes it. */
  publicKey?: string;
  /** Network the account is currently bound to. */
  network: NetworkType;
}

/** Result of asking a wallet to sign a transaction. */
export interface SignedTransaction {
  /** Hex-encoded, fully-signed transaction blob, ready to `submit`. */
  txBlob: string;
  /** The transaction hash (a.k.a. `txid`). */
  hash: string;
}

export type Unsubscribe = () => void;

/** Strongly-typed event map shared by every adapter. */
export interface AdapterEventMap {
  accountsChanged: (account: WalletAccount) => void;
  disconnect: () => void;
}

/**
 * Signal surfaced by QR / deep-link based wallets (Xaman, WalletConnect) while
 * they wait for the user to approve a request on their phone. Wallets that
 * authenticate without a QR (e.g. injected providers) never emit this.
 */
export interface AuthRequest {
  /** URL (or data URI) of a ready-to-render QR image. */
  qrPng?: string;
  /** Raw URI behind the QR, for client-side rendering or copy-to-clipboard. */
  qrUri?: string;
  /** Mobile deep link that opens the wallet app directly. */
  deeplink?: string;
  /** Unix epoch (ms) at which the request expires, when known. */
  expiresAt?: number;
}

export interface ConnectOptions {
  /** Network the caller wants the session bound to. */
  network?: NetworkType;
  /**
   * Called as soon as a QR / deep-link is available so the UI can render it.
   */
  onAuthRequest?: (request: AuthRequest) => void;
  /** Abort an in-flight connection (e.g. the user closed the modal). */
  signal?: AbortSignal;
}

export interface SignOptions {
  /** Called as soon as a QR / deep-link is available so the UI can render it. */
  onAuthRequest?: (request: AuthRequest) => void;
  /** Abort an in-flight signing request. */
  signal?: AbortSignal;
}

/**
 * The contract every wallet integration must satisfy. Adapters are usually
 * produced by a small factory (e.g. `xamanAdapter({...})`) so they can keep
 * private state without leaking it to the core client.
 */
export interface XRPLWalletAdapter {
  /** Stable unique id, e.g. `'xaman'`. */
  readonly id: string;
  /** Human-readable name shown in the UI. */
  readonly name: string;
  /** SVG markup, data URI or URL for the wallet logo. */
  readonly icon: string;
  /** Where to send users who don't have the wallet installed yet. */
  readonly downloadUrl?: string;

  connect(options?: ConnectOptions): Promise<WalletAccount>;
  disconnect(): Promise<void>;
  signTransaction(
    txJson: Record<string, unknown>,
    options?: SignOptions,
  ): Promise<SignedTransaction>;

  /**
   * Subscribe to an adapter event. Returns an unsubscribe function — calling it
   * removes the listener. (This is a strict superset of the classic
   * `on(event, cb): void` shape from the spec: callers that ignore the return
   * value keep working unchanged.)
   */
  on<E extends keyof AdapterEventMap>(event: E, callback: AdapterEventMap[E]): Unsubscribe;
}
