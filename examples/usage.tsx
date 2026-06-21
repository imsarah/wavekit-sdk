/**
 * End-to-end usage example. This file is type-checked by the root tsconfig (so the
 * public API stays honest) but is not part of the published build.
 */
import { useState } from 'react';
import { createWaveKit } from '@wavekit-sdk/core';
import { xamanAdapter } from '@wavekit-sdk/adapter-xaman';
import { tangemAdapter } from '@wavekit-sdk/adapter-tangem';
import { ConnectModal, useWallet, useWaveKitSwap, WaveKitProvider } from '@wavekit-sdk/react';

// 1) Configure the client once (mirrors spec §3.1).
export const waveKit = createWaveKit({
  network: 'mainnet',
  rpcUrl: 'wss://xrplcluster.com',
  adapters: [
    xamanAdapter({ apiKey: process.env.NEXT_PUBLIC_XAMAN_API_KEY }),
    tangemAdapter({ walletConnectProjectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID }),
  ],
  monetization: {
    feeRecipient: 'rYourDeveloperAddressHere00000000000',
    swapFeeBps: 20, // 0.2%
  },
});

// 2) Wrap your app.
export function App() {
  return (
    <WaveKitProvider client={waveKit}>
      <Dashboard />
    </WaveKitProvider>
  );
}

// 3) Drive it with the hook + the modal (spec §3.2).
function Dashboard() {
  const { account, connected, isConnecting, disconnect } = useWallet();
  const [open, setOpen] = useState(false);

  if (!connected) {
    return (
      <>
        <button type="button" onClick={() => setOpen(true)} disabled={isConnecting}>
          {isConnecting ? 'Connecting…' : 'Connect XRPL Wallet'}
        </button>
        <ConnectModal open={open} onClose={() => setOpen(false)} accentColor="#3052FF" />
      </>
    );
  }

  return (
    <div>
      <p>Address: {account?.address}</p>
      <FeePreview />
      <button type="button" onClick={() => void disconnect()}>
        Disconnect
      </button>
    </div>
  );
}

function FeePreview() {
  const swap = useWaveKitSwap();
  const fee = swap.computeFee('100000000'); // 100 XRP, in drops
  return (
    <p>
      Dev fee on 100 XRP: {fee.feeXrp} XRP ({fee.bps} bps) → {fee.recipient}
    </p>
  );
}
