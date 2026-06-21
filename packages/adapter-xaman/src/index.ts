import {
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

/** The slice of the `xumm` SDK this adapter relies on (for the `sdk` injection). */
export interface XummClientLike {
  payload?: {
    createAndSubscribe(
      payload: Record<string, unknown>,
      callback: (event: { data: { signed?: boolean; payload_uuidv4?: string } }) => unknown,
    ): Promise<{
      created: { uuid: string; refs: { qr_png: string }; next: { always: string } };
      resolved: Promise<{ signed?: boolean; payload_uuidv4?: string }>;
      websocket?: { close(): void };
    }>;
    get(uuid: string): Promise<{ response: { account?: string; txid?: string; hex?: string } } | null>;
  };
  logout?(): Promise<void>;
  /** PKCE (browser) sign-in — present when the SDK is constructed with only an API key. */
  authorize?(): Promise<unknown>;
  /** Signed-in user data (browser / PKCE mode). */
  user?: { account: Promise<string | undefined> };
}

export interface XamanAdapterOptions {
  /** Your Xaman (XUMM) API key. Required unless you inject `sdk`. */
  apiKey?: string;
  /** Provide a pre-constructed `Xumm` SDK instance (advanced / testing). */
  sdk?: XummClientLike;
  /** Network accounts are bound to. Defaults to `'mainnet'`. */
  network?: NetworkType;
  /**
   * Ask Xaman to submit the signed transaction to the ledger. Defaults to `true`
   * (the usual Xaman flow). Set `false` to sign only — Xaman returns the signed blob
   * without broadcasting it (useful for demos or when you submit it yourself).
   */
  submit?: boolean;
}

const XAMAN_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" role="img" aria-label="Xaman">' +
  '<rect width="48" height="48" rx="12" fill="#111827"/>' +
  '<path d="M16 16l16 16M32 16L16 32" stroke="#34C6F0" stroke-width="4.6" stroke-linecap="round"/></svg>';

/**
 * Xaman (formerly XUMM) adapter. Authentication and signing use Xaman's
 * QR / push + WebSocket flow: the adapter creates a payload, surfaces the QR &
 * deep-link via `onAuthRequest`, then resolves once the user approves on their phone.
 */
export function xamanAdapter(options: XamanAdapterOptions = {}): XRPLWalletAdapter {
  const network: NetworkType = options.network ?? 'mainnet';
  const submit = options.submit ?? true;
  const listeners = {
    accountsChanged: new Set<AdapterEventMap['accountsChanged']>(),
    disconnect: new Set<AdapterEventMap['disconnect']>(),
  };
  let sdk: XummClientLike | undefined = options.sdk;

  async function getSdk(): Promise<XummClientLike> {
    if (sdk) return sdk;
    if (!options.apiKey) {
      throw new Error('xamanAdapter: `apiKey` is required (or pass a `sdk` instance)');
    }
    const mod = (await import('xumm')) as unknown as {
      Xumm?: new (apiKey: string) => XummClientLike;
      default?: new (apiKey: string) => XummClientLike;
    };
    const Xumm = mod.Xumm ?? mod.default;
    if (!Xumm) throw new Error('xamanAdapter: could not load the `xumm` SDK');
    sdk = new Xumm(options.apiKey);
    return sdk;
  }

  function emit<E extends keyof AdapterEventMap>(event: E, ...args: Parameters<AdapterEventMap[E]>): void {
    for (const cb of listeners[event]) {
      (cb as (...a: Parameters<AdapterEventMap[E]>) => void)(...args);
    }
  }

  /** Create a payload, surface its QR/deep-link, and await the user's decision. */
  async function runPayload(
    txjson: Record<string, unknown>,
    opts?: { onAuthRequest?: ConnectOptions['onAuthRequest']; signal?: AbortSignal },
  ): Promise<{ account?: string; txid?: string; hex?: string }> {
    const client = await getSdk();
    if (!client.payload) throw new Error('xamanAdapter: Xumm payload API is unavailable');

    const subscription = await client.payload.createAndSubscribe(
      { txjson, options: { submit } },
      (event) => (typeof event.data.signed === 'boolean' ? event.data : undefined),
    );

    opts?.onAuthRequest?.({
      qrPng: subscription.created.refs.qr_png,
      deeplink: subscription.created.next.always,
    });

    let data: { signed?: boolean; payload_uuidv4?: string };
    try {
      data = await withAbort(subscription.resolved, opts?.signal);
    } finally {
      try {
        subscription.websocket?.close();
      } catch {
        /* ignore */
      }
    }

    if (!data.signed) throw new Error('Request was rejected in Xaman');

    const uuid = data.payload_uuidv4 ?? subscription.created.uuid;
    const full = await client.payload.get(uuid);
    if (!full?.response) throw new Error('xamanAdapter: could not load the resolved payload');
    return full.response;
  }

  return {
    id: 'xaman',
    name: 'Xaman',
    icon: XAMAN_ICON,
    downloadUrl: 'https://xaman.app/',

    async connect(connectOptions?: ConnectOptions): Promise<WalletAccount> {
      const client = await getSdk();

      // Browser (PKCE) mode: when constructed with only an API key, Xaman signs in via
      // its own OAuth2 popup/QR — no API secret, no backend. The SDK renders the
      // sign-in UI itself (so there's no QR to surface through `onAuthRequest`).
      if (typeof client.authorize === 'function') {
        // Some SDK builds reject with "Sign In window closed" even after a successful
        // sign-in (the popup closes before the token resolves), so capture any error
        // and verify against the session before failing.
        let authError: unknown;
        try {
          const resolved = await client.authorize();
          if (resolved instanceof Error) authError = resolved;
        } catch (err) {
          authError = err;
        }
        const address = client.user ? await client.user.account : undefined;
        if (!address) {
          throw authError instanceof Error
            ? authError
            : new Error('xamanAdapter: Xaman sign-in did not return an account');
        }
        const account: WalletAccount = {
          address,
          network: connectOptions?.network ?? network,
        };
        emit('accountsChanged', account);
        return account;
      }

      // Backend mode (API key + secret, injected via `sdk`): create a SignIn payload
      // and surface its QR through `onAuthRequest`.
      const response = await runPayload(
        { TransactionType: 'SignIn' },
        { onAuthRequest: connectOptions?.onAuthRequest, signal: connectOptions?.signal },
      );
      if (!response.account) throw new Error('xamanAdapter: Xaman did not return an account');
      const account: WalletAccount = {
        address: response.account,
        network: connectOptions?.network ?? network,
      };
      emit('accountsChanged', account);
      return account;
    },

    async disconnect(): Promise<void> {
      try {
        await sdk?.logout?.();
      } catch {
        /* ignore */
      }
      emit('disconnect');
    },

    async signTransaction(
      txJson: Record<string, unknown>,
      signOptions?: SignOptions,
    ): Promise<SignedTransaction> {
      // Ensure XRP amounts are expressed in drops before handing the tx to Xaman.
      const normalized = normalizeTransactionAmounts(txJson);
      const response = await runPayload(normalized, {
        onAuthRequest: signOptions?.onAuthRequest,
        signal: signOptions?.signal,
      });
      if (!response.hex || !response.txid) {
        throw new Error('xamanAdapter: Xaman did not return a signed transaction');
      }
      return { txBlob: response.hex, hash: response.txid };
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
