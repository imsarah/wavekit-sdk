import { createWaveKit } from '@wavekit-sdk/core';
import { xamanAdapter } from '@wavekit-sdk/adapter-xaman';
import { backendXummSdk } from './xamanQrSdk';
import {
  createMockAdapter,
  GENERIC_ICON,
  LEDGER_ICON,
  TANGEM_ICON,
  TREZOR_ICON,
  WALLETCONNECT_ICON,
  XAMAN_ICON,
} from './mockAdapters';

// Real Xaman vs mock:
// Set NEXT_PUBLIC_XAMAN_API_KEY (in examples/demo/.env.local) to test the REAL Xaman
// wallet — you'll get a real, scannable QR and a real connection. Without it, a mock
// Xaman is used so the demo runs offline with no keys.
// Get a free API key at https://apps.xaman.dev (create an app; set its Origin/redirect
// to http://localhost:3000), then put it in examples/demo/.env.local:
//   NEXT_PUBLIC_XAMAN_API_KEY=your-key-here
const XAMAN_API_KEY = process.env.NEXT_PUBLIC_XAMAN_API_KEY;

// Quick confirmation in the browser console that .env.local was picked up.
if (typeof window !== 'undefined') {
  console.info(
    XAMAN_API_KEY
      ? '[WaveKit demo] Real Xaman adapter active (NEXT_PUBLIC_XAMAN_API_KEY loaded).'
      : '[WaveKit demo] Mock Xaman — set NEXT_PUBLIC_XAMAN_API_KEY in examples/demo/.env.local and restart `npm run dev`.',
  );
  // Xaman's PKCE popup can emit a benign "Sign In window closed" rejection right after
  // a successful sign-in; ignore that one so it doesn't trip Next's dev error overlay.
  window.addEventListener('unhandledrejection', (event) => {
    const message =
      event.reason instanceof Error ? event.reason.message : String(event.reason ?? '');
    if (message.includes('Sign In window closed')) event.preventDefault();
  });
}

const xaman = XAMAN_API_KEY
  ? xamanAdapter({ apiKey: XAMAN_API_KEY, submit: false }) // demo: sign only, never broadcast
  : createMockAdapter({
      id: 'xaman',
      name: 'Xaman',
      icon: XAMAN_ICON,
      qr: 'png',
      address: 'rXamanDemo7h8Tq2k9PfBwLrVnExample',
      downloadUrl: 'https://xaman.app/',
    });

// "Xaman (QR)" — renders Xaman's QR inside WaveKit's own modal, via the demo's server
// route (/api/xaman). Needs XAMAN_API_SECRET (server-side) in examples/demo/.env.local.
const xamanQr = {
  ...xamanAdapter({ sdk: backendXummSdk(), submit: false }), // demo: sign only, never broadcast
  id: 'xaman-qr',
  name: 'Xaman (QR)',
};

/**
 * The demo client. Xaman is the REAL adapter when NEXT_PUBLIC_XAMAN_API_KEY is set,
 * otherwise a mock; the other wallets stay mocks (they need hardware / their own keys).
 */
export const waveKit = createWaveKit({
  network: 'mainnet',
  adapters: [
    xaman,
    xamanQr,
    createMockAdapter({
      id: 'tangem',
      name: 'Tangem',
      icon: TANGEM_ICON,
      qr: 'uri',
      address: 'rTangemDemo5n4Rq8Xc2Vb1ZsExample',
      downloadUrl: 'https://tangem.com/',
    }),
    createMockAdapter({
      id: 'ledger',
      name: 'Ledger',
      icon: LEDGER_ICON,
      delayMs: 1500,
      address: 'rLedgerDemo3k2Pq7Xc9Vb1ZsExample',
      downloadUrl: 'https://www.ledger.com/',
    }),
    createMockAdapter({
      id: 'walletconnect',
      name: 'WalletConnect',
      icon: WALLETCONNECT_ICON,
      qr: 'uri',
      address: 'rWcDemo8m5Rq2Xc4Vb7ZsExampleAddr',
      downloadUrl: 'https://walletconnect.network/',
    }),
    createMockAdapter({
      id: 'trezor',
      name: 'Trezor',
      icon: TREZOR_ICON,
      delayMs: 1500,
      address: 'rTrezorDemo6n3Rq9Xc1Vb5ZsExample',
      downloadUrl: 'https://trezor.io/',
    }),
    createMockAdapter({
      id: 'broken',
      name: 'Always-fails Wallet',
      icon: GENERIC_ICON,
      delayMs: 1200,
      fail: 'User rejected the request (this wallet always fails — it demos the error screen)',
    }),
  ],
  monetization: { feeRecipient: 'rDevFeeRecipientExample', swapFeeBps: 20 },
});
