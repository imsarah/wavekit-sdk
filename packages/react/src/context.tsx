import { createContext, useContext, useEffect, type ReactNode } from 'react';
import type { WaveKitClient } from '@wavekit-sdk/core';

const WaveKitContext = createContext<WaveKitClient | null>(null);

export interface WaveKitProviderProps {
  client: WaveKitClient;
  children: ReactNode;
}

/**
 * Provides a {@link WaveKitClient} to the React tree and, when `autoConnect` is
 * enabled on the client, restores a persisted session on mount.
 */
export function WaveKitProvider({ client, children }: WaveKitProviderProps) {
  useEffect(() => {
    if (client.config.autoConnect) {
      void client.autoConnect();
    }
  }, [client]);

  return <WaveKitContext.Provider value={client}>{children}</WaveKitContext.Provider>;
}

/** Access the WaveKit client. Throws if used outside of a {@link WaveKitProvider}. */
export function useWaveKit(): WaveKitClient {
  const client = useContext(WaveKitContext);
  if (!client) {
    throw new Error('useWaveKit must be used within a <WaveKitProvider>');
  }
  return client;
}

export { WaveKitContext };
