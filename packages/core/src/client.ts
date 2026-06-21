import type {
  ConnectOptions,
  NetworkType,
  SignedTransaction,
  SignOptions,
  Unsubscribe,
  WalletAccount,
  XRPLWalletAdapter,
} from './types';
import { createStore, type ReadableStore } from './store';
import { getDefaultStorage, type WaveKitStorage } from './storage';
import type { MonetizationConfig } from './monetization';
import { isAbortError, toError, WaveKitAbortError } from './errors';

export type WaveKitStatus = 'disconnected' | 'connecting' | 'connected';

export interface WaveKitState {
  /** Connection lifecycle status. */
  status: WaveKitStatus;
  /** The connected account, or `null` when disconnected. */
  account: WalletAccount | null;
  /** Id of the adapter that owns the current/last connection attempt. */
  activeAdapterId: string | null;
  /** Network the client is targeting. */
  network: NetworkType;
  /** Last connection error (cleared on a fresh connect). */
  error: Error | null;
}

export interface WaveKitConfig {
  /** Default network. Defaults to `'mainnet'`. */
  network?: NetworkType;
  /** XRPL JSON-RPC / WebSocket endpoint (informational; surfaced on the client). */
  rpcUrl?: string;
  /** The wallets this app supports. */
  adapters: XRPLWalletAdapter[];
  /** Developer monetization config (swap fee). */
  monetization?: MonetizationConfig;
  /** Persist & silently restore the last session. Defaults to `true`. */
  autoConnect?: boolean;
  /** Override storage. Defaults to `localStorage` with an in-memory fallback. */
  storage?: WaveKitStorage;
  /** localStorage key for the persisted session. Defaults to `'wavekit.session'`. */
  storageKey?: string;
}

export interface ResolvedWaveKitConfig {
  network: NetworkType;
  rpcUrl?: string;
  autoConnect: boolean;
  storageKey: string;
  monetization?: MonetizationConfig;
}

export interface WaveKitClient extends ReadableStore<WaveKitState> {
  /** The resolved (defaults-applied) configuration. */
  readonly config: ResolvedWaveKitConfig;
  /** All registered adapters, in declaration order. */
  getAdapters(): XRPLWalletAdapter[];
  getAdapter(id: string): XRPLWalletAdapter | undefined;
  /** The adapter backing the current connection, if any. */
  getActiveAdapter(): XRPLWalletAdapter | undefined;
  /**
   * Connect through the adapter with the given id. The id may be omitted when
   * exactly one adapter is configured; otherwise it is required (use the
   * `<ConnectModal>` to let the user pick).
   */
  connect(adapterId?: string, options?: ConnectOptions): Promise<WalletAccount>;
  /** Disconnect the active wallet and clear persisted state. */
  disconnect(): Promise<void>;
  /** Ask the connected wallet to sign a transaction. */
  signTransaction(txJson: Record<string, unknown>, options?: SignOptions): Promise<SignedTransaction>;
  /** Switch the target network (drops the current session, which is network-bound). */
  switchNetwork(network: NetworkType): void;
  /** Attempt to silently restore a persisted session. Safe to call on app start. */
  autoConnect(): Promise<void>;
  /** Clear all in-memory + persisted state without calling the adapter. */
  reset(): void;
}

interface PersistedSession {
  activeAdapterId: string;
  account: WalletAccount;
  network: NetworkType;
}

const DEFAULT_STORAGE_KEY = 'wavekit.session';

/**
 * Create a WaveKit client: a small, framework-agnostic state machine that owns the
 * wallet connection lifecycle, account state, network selection and session
 * persistence. Subscribe to it directly, or via the `@wavekit-sdk/react` bindings.
 */
export function createWaveKit(config: WaveKitConfig): WaveKitClient {
  const initialNetwork: NetworkType = config.network ?? 'mainnet';
  const storage = config.storage ?? getDefaultStorage();
  const storageKey = config.storageKey ?? DEFAULT_STORAGE_KEY;
  const autoConnectEnabled = config.autoConnect ?? true;

  const adapters = new Map<string, XRPLWalletAdapter>();
  for (const adapter of config.adapters) {
    if (adapters.has(adapter.id)) {
      throw new Error(`createWaveKit: duplicate adapter id "${adapter.id}"`);
    }
    adapters.set(adapter.id, adapter);
  }

  const store = createStore<WaveKitState>({
    status: 'disconnected',
    account: null,
    activeAdapterId: null,
    network: initialNetwork,
    error: null,
  });

  // Cleanup handles for the active adapter's event listeners.
  let adapterCleanup: Unsubscribe[] = [];
  // Monotonic token guarding against races between overlapping connect()/disconnect().
  let connectToken = 0;

  function clearAdapterListeners(): void {
    for (const off of adapterCleanup) {
      try {
        off();
      } catch {
        /* ignore */
      }
    }
    adapterCleanup = [];
  }

  function persist(session: PersistedSession | null): void {
    try {
      if (session) storage.setItem(storageKey, JSON.stringify(session));
      else storage.removeItem(storageKey);
    } catch {
      /* storage may be unavailable; persistence is best-effort */
    }
  }

  function readPersisted(): PersistedSession | null {
    try {
      const raw = storage.getItem(storageKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as PersistedSession;
      if (
        parsed &&
        typeof parsed.activeAdapterId === 'string' &&
        parsed.account &&
        typeof parsed.account.address === 'string'
      ) {
        return parsed;
      }
    } catch {
      /* ignore corrupt persisted data */
    }
    return null;
  }

  function bindAdapter(adapter: XRPLWalletAdapter): void {
    clearAdapterListeners();
    adapterCleanup.push(
      adapter.on('accountsChanged', (account) => {
        store.setState({ account, network: account.network });
        persist({ activeAdapterId: adapter.id, account, network: account.network });
      }),
    );
    adapterCleanup.push(
      adapter.on('disconnect', () => {
        clearAdapterListeners();
        persist(null);
        store.setState({
          status: 'disconnected',
          account: null,
          activeAdapterId: null,
          error: null,
        });
      }),
    );
  }

  function resolveAdapterId(adapterId?: string): string {
    if (adapterId) return adapterId;
    if (adapters.size === 1) {
      return adapters.keys().next().value as string;
    }
    throw new Error(
      'connect: multiple adapters are configured — pass an adapterId (or open the <ConnectModal>)',
    );
  }

  async function connect(adapterId?: string, options?: ConnectOptions): Promise<WalletAccount> {
    const id = resolveAdapterId(adapterId);
    const adapter = adapters.get(id);
    if (!adapter) throw new Error(`connect: unknown adapter "${id}"`);

    // Tear down any existing/other connection before starting a new one.
    if (store.getState().status !== 'disconnected') {
      await disconnect();
    }

    const token = ++connectToken;
    const network = options?.network ?? store.getState().network;
    store.setState({ status: 'connecting', activeAdapterId: id, network, error: null });

    try {
      const account = await adapter.connect({
        network,
        onAuthRequest: options?.onAuthRequest,
        signal: options?.signal,
      });

      // A newer connect()/disconnect() superseded us — discard this stale result.
      if (token !== connectToken) {
        try {
          await adapter.disconnect();
        } catch {
          /* ignore */
        }
        throw new WaveKitAbortError('Connection superseded by a newer request');
      }

      bindAdapter(adapter);
      store.setState({
        status: 'connected',
        account,
        activeAdapterId: id,
        network: account.network,
        error: null,
      });
      persist({ activeAdapterId: id, account, network: account.network });
      return account;
    } catch (err) {
      if (token === connectToken) {
        store.setState({
          status: 'disconnected',
          account: null,
          activeAdapterId: null,
          error: isAbortError(err) ? null : toError(err),
        });
      }
      throw err;
    }
  }

  async function disconnect(): Promise<void> {
    connectToken++; // cancel any in-flight connect
    const { activeAdapterId } = store.getState();
    const adapter = activeAdapterId ? adapters.get(activeAdapterId) : undefined;
    clearAdapterListeners();
    if (adapter) {
      try {
        await adapter.disconnect();
      } catch {
        /* ignore adapter errors during disconnect */
      }
    }
    persist(null);
    store.setState({
      status: 'disconnected',
      account: null,
      activeAdapterId: null,
      error: null,
    });
  }

  async function signTransaction(
    txJson: Record<string, unknown>,
    options?: SignOptions,
  ): Promise<SignedTransaction> {
    const { activeAdapterId, status } = store.getState();
    if (status !== 'connected' || !activeAdapterId) {
      throw new Error('signTransaction: no wallet is connected');
    }
    const adapter = adapters.get(activeAdapterId);
    if (!adapter) throw new Error('signTransaction: active adapter is no longer registered');
    return adapter.signTransaction(txJson, options);
  }

  function switchNetwork(network: NetworkType): void {
    if (store.getState().network === network && store.getState().status === 'disconnected') {
      store.setState({ network });
      return;
    }
    // A session is bound to a single network; drop it and update the target.
    void disconnect().finally(() => {
      store.setState({ network });
    });
  }

  async function autoConnect(): Promise<void> {
    if (!autoConnectEnabled) return;
    if (store.getState().status !== 'disconnected') return;

    const persisted = readPersisted();
    if (!persisted) return;

    const adapter = adapters.get(persisted.activeAdapterId);
    if (!adapter) {
      persist(null);
      return;
    }

    // Optimistically restore the cached account so the UI shows the wallet
    // immediately, and re-attach event listeners. The adapter remains the source of
    // truth: it will emit `accountsChanged` / `disconnect` if the live session
    // differs, and the next `signTransaction` re-establishes a live session.
    bindAdapter(adapter);
    store.setState({
      status: 'connected',
      account: persisted.account,
      activeAdapterId: persisted.activeAdapterId,
      network: persisted.account.network,
      error: null,
    });
  }

  function reset(): void {
    connectToken++;
    clearAdapterListeners();
    persist(null);
    store.replaceState({
      status: 'disconnected',
      account: null,
      activeAdapterId: null,
      network: initialNetwork,
      error: null,
    });
  }

  return {
    getState: store.getState,
    subscribe: store.subscribe,
    config: {
      network: initialNetwork,
      rpcUrl: config.rpcUrl,
      autoConnect: autoConnectEnabled,
      storageKey,
      monetization: config.monetization,
    },
    getAdapters: () => [...adapters.values()],
    getAdapter: (id) => adapters.get(id),
    getActiveAdapter: () => {
      const id = store.getState().activeAdapterId;
      return id ? adapters.get(id) : undefined;
    },
    connect,
    disconnect,
    signTransaction,
    switchNetwork,
    autoConnect,
    reset,
  };
}
