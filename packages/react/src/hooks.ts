import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import {
  buildFeePayment,
  computeSwapFeeDrops,
  dropsToXrp,
  type ConnectOptions,
  type MonetizationConfig,
  type NetworkType,
  type SignedTransaction,
  type SignOptions,
  type WalletAccount,
  type WaveKitState,
  type XRPLWalletAdapter,
} from '@wavekit-sdk/core';
import { useWaveKit } from './context';

/** Subscribe to the full WaveKit state (re-renders on any change). */
export function useWaveKitState(): WaveKitState {
  const client = useWaveKit();
  return useSyncExternalStore(client.subscribe, client.getState, client.getState);
}

export interface UseWalletResult {
  account: WalletAccount | null;
  address: string | null;
  status: WaveKitState['status'];
  connected: boolean;
  isConnecting: boolean;
  network: NetworkType;
  error: Error | null;
  adapters: XRPLWalletAdapter[];
  connect: (adapterId?: string, options?: ConnectOptions) => Promise<WalletAccount>;
  disconnect: () => Promise<void>;
  signTransaction: (
    txJson: Record<string, unknown>,
    options?: SignOptions,
  ) => Promise<SignedTransaction>;
  switchNetwork: (network: NetworkType) => void;
}

/** The primary hook: connection state plus bound action callbacks. */
export function useWallet(): UseWalletResult {
  const client = useWaveKit();
  const state = useWaveKitState();

  const connect = useCallback(
    (adapterId?: string, options?: ConnectOptions) => client.connect(adapterId, options),
    [client],
  );
  const disconnect = useCallback(() => client.disconnect(), [client]);
  const signTransaction = useCallback(
    (txJson: Record<string, unknown>, options?: SignOptions) => client.signTransaction(txJson, options),
    [client],
  );
  const switchNetwork = useCallback((network: NetworkType) => client.switchNetwork(network), [client]);
  const adapters = useMemo(() => client.getAdapters(), [client]);

  return {
    account: state.account,
    address: state.account?.address ?? null,
    status: state.status,
    connected: state.status === 'connected',
    isConnecting: state.status === 'connecting',
    network: state.network,
    error: state.error,
    adapters,
    connect,
    disconnect,
    signTransaction,
    switchNetwork,
  };
}

export interface WalletUsageStats {
  /** Number of successful connections observed this session, per adapter id. */
  connectionsByAdapter: Record<string, number>;
  lastConnectedAdapterId: string | null;
  totalConnections: number;
}

/**
 * Anonymous, in-session usage analytics (spec §5.2). Counts successful connections
 * per adapter so a project can see Xaman vs Tangem adoption. No PII, no keys — just
 * connection counts derived from observed state transitions.
 */
export function useWaveKitAnalytics(): WalletUsageStats {
  const client = useWaveKit();
  const [stats, setStats] = useState<WalletUsageStats>({
    connectionsByAdapter: {},
    lastConnectedAdapterId: null,
    totalConnections: 0,
  });

  useEffect(() => {
    let prevStatus = client.getState().status;
    return client.subscribe((state) => {
      if (prevStatus !== 'connected' && state.status === 'connected' && state.activeAdapterId) {
        const id = state.activeAdapterId;
        setStats((cur) => ({
          connectionsByAdapter: {
            ...cur.connectionsByAdapter,
            [id]: (cur.connectionsByAdapter[id] ?? 0) + 1,
          },
          lastConnectedAdapterId: id,
          totalConnections: cur.totalConnections + 1,
        }));
      }
      prevStatus = state.status;
    });
  }, [client]);

  return stats;
}

export interface SwapFeeBreakdown {
  inputDrops: string;
  feeDrops: string;
  feeXrp: string;
  recipient: string | null;
  bps: number;
}

export interface UseWaveKitSwapResult {
  /** Whether monetization is configured on the client. */
  enabled: boolean;
  config: MonetizationConfig | null;
  /** Compute the developer fee for a swap of `inputDrops`. */
  computeFee: (inputDrops: string | number | bigint) => SwapFeeBreakdown;
  /** Build the transparent developer-fee Payment for a swap (or `null`). */
  buildFeePayment: (args: { from: string; inputDrops: string | number | bigint }) => Record<string, unknown> | null;
}

/**
 * Swap monetization hook (spec §5.1). Exposes the fee maths and the transparent
 * fee-Payment builder using the client's `monetization` config. Pair it with your
 * own AMM quote/route source — WaveKit deliberately doesn't bundle pathfinding.
 */
export function useWaveKitSwap(): UseWaveKitSwapResult {
  const client = useWaveKit();
  const config = client.config.monetization ?? null;

  return useMemo<UseWaveKitSwapResult>(
    () => ({
      enabled: config !== null,
      config,
      computeFee(inputDrops) {
        const bps = config?.swapFeeBps ?? 0;
        const feeDrops = computeSwapFeeDrops(inputDrops, bps);
        return {
          inputDrops: typeof inputDrops === 'bigint' ? inputDrops.toString() : String(inputDrops),
          feeDrops,
          feeXrp: dropsToXrp(feeDrops),
          recipient: config?.feeRecipient ?? null,
          bps,
        };
      },
      buildFeePayment(args) {
        if (!config) return null;
        return buildFeePayment({ from: args.from, inputDrops: args.inputDrops, config });
      },
    }),
    [config],
  );
}
