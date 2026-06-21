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

/** The slice of `@walletconnect/sign-client` this adapter relies on. */
export interface SignClientLike {
  connect(params: Record<string, unknown>): Promise<{
    uri?: string;
    approval: () => Promise<{ topic: string; namespaces: Record<string, { accounts: string[] }> }>;
  }>;
  request<T = unknown>(args: {
    topic: string;
    chainId: string;
    request: { method: string; params: unknown };
  }): Promise<T>;
  disconnect(args: { topic: string; reason: { code: number; message: string } }): Promise<void>;
  on?(event: string, callback: (...args: unknown[]) => void): void;
}

export interface WalletConnectAdapterOptions {
  /** WalletConnect Cloud project id. Required unless you inject `client`. */
  walletConnectProjectId?: string;
  /** Adapter id shown to the engine. Default `'walletconnect'`. */
  id?: string;
  /** Display name. Default `'WalletConnect'`. */
  name?: string;
  /** SVG / data-URI / URL icon. */
  icon?: string;
  /** Where to send users who need the wallet. */
  downloadUrl?: string;
  /** CAIP-2 chain ids. Defaults to the WaveKit mapping (mainnet=xrpl:1, …). */
  chains?: Partial<Record<NetworkType, string>>;
  /** WalletConnect session metadata (name, url, icons…). */
  metadata?: Record<string, unknown>;
  /** Custom relay URL. */
  relayUrl?: string;
  /** Network accounts are bound to. Default `'mainnet'`. */
  network?: NetworkType;
  /** Method used to sign. Default `'xrpl_signTransaction'`. */
  signMethod?: string;
  /** Methods requested in the session. Defaults to the XRPL signing methods. */
  methods?: string[];
  /** Provide a pre-initialised SignClient (advanced / testing). */
  client?: SignClientLike;
}

/** CAIP-2 chain ids per the WaveKit spec: mainnet=xrpl:1, testnet=xrpl:2, devnet=xrpl:3. */
const DEFAULT_CHAINS: Record<NetworkType, string> = {
  mainnet: 'xrpl:1',
  testnet: 'xrpl:2',
  devnet: 'xrpl:3',
};

const XRPL_METHODS = ['xrpl_signTransaction', 'xrpl_signTransactionFor'];

const WC_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" role="img" aria-label="WalletConnect">' +
  '<rect width="48" height="48" rx="12" fill="#3B99FC"/>' +
  '<path d="M15.4 19.3c4.75-4.65 12.45-4.65 17.2 0l.58.56a.59.59 0 0 1 0 .85l-1.98 1.94a.31.31 0 0 1-.43 0l-.8-.78c-3.31-3.24-8.69-3.24-12 0l-.86.84a.31.31 0 0 1-.43 0L15.4 20.7a.59.59 0 0 1 0-.85l.58-.56Z" fill="#fff"/></svg>';

/**
 * Generic **WalletConnect v2** adapter for the XRP Ledger. Pairs by QR / deep link
 * (surfaced via `onAuthRequest`), then signs with `xrpl_signTransaction`. Use it for any
 * WalletConnect-compatible XRPL wallet by passing a `name`/`icon` (and your project id).
 */
export function walletConnectAdapter(options: WalletConnectAdapterOptions = {}): XRPLWalletAdapter {
  const network: NetworkType = options.network ?? 'mainnet';
  const chains: Record<NetworkType, string> = { ...DEFAULT_CHAINS, ...options.chains };
  const signMethod = options.signMethod ?? 'xrpl_signTransaction';
  const methods = options.methods ?? XRPL_METHODS;
  const listeners = {
    accountsChanged: new Set<AdapterEventMap['accountsChanged']>(),
    disconnect: new Set<AdapterEventMap['disconnect']>(),
  };

  let client: SignClientLike | undefined = options.client;
  let topic: string | null = null;
  let activeNetwork: NetworkType = network;

  function emit<E extends keyof AdapterEventMap>(event: E, ...args: Parameters<AdapterEventMap[E]>): void {
    for (const cb of listeners[event]) {
      (cb as (...a: Parameters<AdapterEventMap[E]>) => void)(...args);
    }
  }

  function chainId(net: NetworkType): string {
    const id = chains[net];
    if (!id) throw new Error(`walletConnectAdapter: no chain id configured for network "${net}"`);
    return id;
  }

  async function getClient(): Promise<SignClientLike> {
    if (client) return client;
    if (!options.walletConnectProjectId) {
      throw new Error('walletConnectAdapter: `walletConnectProjectId` is required (or pass a `client`)');
    }
    const mod = (await import('@walletconnect/sign-client')) as unknown as {
      SignClient?: { init(opts: Record<string, unknown>): Promise<SignClientLike> };
      default?: { init(opts: Record<string, unknown>): Promise<SignClientLike> };
    };
    const SignClient = mod.SignClient ?? mod.default;
    if (!SignClient) throw new Error('walletConnectAdapter: could not load `@walletconnect/sign-client`');
    client = await SignClient.init({
      projectId: options.walletConnectProjectId,
      metadata: options.metadata,
      relayUrl: options.relayUrl,
    });
    client.on?.('session_delete', () => {
      topic = null;
      emit('disconnect');
    });
    return client;
  }

  function parseAccount(
    session: { namespaces: Record<string, { accounts: string[] }> },
    net: NetworkType,
  ): WalletAccount {
    const accounts = session.namespaces?.xrpl?.accounts ?? [];
    const first = accounts[0]; // CAIP-10, e.g. "xrpl:1:rAddress..."
    if (!first) throw new Error('walletConnectAdapter: wallet returned no XRPL account');
    const address = first.split(':').pop();
    if (!address) throw new Error(`walletConnectAdapter: could not parse account "${first}"`);
    return { address, network: net };
  }

  return {
    id: options.id ?? 'walletconnect',
    name: options.name ?? 'WalletConnect',
    icon: options.icon ?? WC_ICON,
    downloadUrl: options.downloadUrl ?? 'https://walletconnect.network/',

    async connect(connectOptions?: ConnectOptions): Promise<WalletAccount> {
      const sdk = await getClient();
      const net = connectOptions?.network ?? network;
      const id = chainId(net);

      const { uri, approval } = await sdk.connect({
        requiredNamespaces: { xrpl: { chains: [id], methods, events: [] } },
      });
      if (uri) connectOptions?.onAuthRequest?.({ qrUri: uri, deeplink: uri });

      const session = await withAbort(approval(), connectOptions?.signal);
      topic = session.topic;
      activeNetwork = net;
      const account = parseAccount(session, net);
      emit('accountsChanged', account);
      return account;
    },

    async disconnect(): Promise<void> {
      const sdk = client;
      const currentTopic = topic;
      topic = null;
      if (sdk && currentTopic) {
        try {
          await sdk.disconnect({ topic: currentTopic, reason: { code: 6000, message: 'User disconnected' } });
        } catch {
          /* ignore */
        }
      }
      emit('disconnect');
    },

    async signTransaction(
      txJson: Record<string, unknown>,
      signOptions?: SignOptions,
    ): Promise<SignedTransaction> {
      const sdk = await getClient();
      if (!topic) throw new Error('walletConnectAdapter: not connected');

      const normalized = normalizeTransactionAmounts(txJson);
      const result = await withAbort(
        sdk.request<Record<string, unknown>>({
          topic,
          chainId: chainId(activeNetwork),
          request: { method: signMethod, params: { tx_json: normalized } },
        }),
        signOptions?.signal,
      );
      return toSignedTransaction(result);
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

/**
 * Map a WalletConnect signing result onto `{ txBlob, hash }`. Wallets differ: some
 * return a ready blob (+ hash), others only the signed `tx_json`, which we serialize
 * with `ripple-binary-codec` and hash with WaveKit's built-in `hashSignedTxBlob`.
 */
export async function toSignedTransaction(result: Record<string, unknown>): Promise<SignedTransaction> {
  const directBlob =
    asString(result.tx_blob) ?? asString(result.signedTransaction) ?? asString(result.hex);
  const directHash = asString(result.hash) ?? asString(result.txid) ?? asString(result.id);
  const signedTxJson = isRecord(result.tx_json) ? result.tx_json : undefined;

  if (directBlob && directHash) return { txBlob: directBlob, hash: directHash };
  if (directBlob) return { txBlob: directBlob, hash: await hashSignedTxBlob(directBlob) };
  if (signedTxJson) {
    const blob = await encodeTx(signedTxJson);
    return { txBlob: blob, hash: await hashSignedTxBlob(blob) };
  }
  throw new Error('walletConnectAdapter: wallet returned an unrecognized signing result');
}

async function encodeTx(tx: Record<string, unknown>): Promise<string> {
  try {
    const codec = await import('ripple-binary-codec');
    return codec.encode(tx);
  } catch (err) {
    throw new Error(
      'walletConnectAdapter: install `ripple-binary-codec` to serialize the signed transaction, ' +
        `or have the wallet return a tx_blob (${String(err)})`,
    );
  }
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
