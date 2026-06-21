# WaveKit

> Unified wallet adapter **and payment toolkit** for the XRP Ledger (XRPL).

[![npm version](https://img.shields.io/npm/v/@wavekit-sdk/react.svg)](https://www.npmjs.com/package/@wavekit-sdk/react)
[![license](https://img.shields.io/npm/l/@wavekit-sdk/core.svg)](LICENSE)

WaveKit is an open-source, lightweight, modular toolkit for the XRPL ecosystem. It
connects the major XRP wallets behind one
consistent set of React hooks and UI, and adds a **"Pay with XRP / RLUSD" checkout**
so you can both *connect* wallets and *collect* payments.

```
        [ <ConnectModal /> ] [ <Checkout /> ]   ← drop-in UI (Tailwind, no UI dep)
                   │               │
            [ useWallet() ]  [ usePayment() ]    ← React hooks
                   └───────┬───────┘
                  [ WaveKit Client ]              ← framework-agnostic state machine
            ┌──────────────┼──────────────┐
            ▼              ▼               ▼
        [ Xaman ] [ WalletConnect ] [ Ledger ] …  ← adapters (XRPLWalletAdapter)
```

## Features

- **5 wallet adapters** — Xaman (XUMM), Tangem, generic WalletConnect v2, Ledger
  (WebHID hardware), and Trezor (`@trezor/connect`).
- **Payments / Checkout** — `createPaymentRequest` + `<Checkout />` for XRP **and
  RLUSD** (and any XRPL token/IOU), with BigInt-exact drops and decimal maths.
- **Transparent platform fee** — an optional, fully separate fee Payment (never hidden
  inside the user's transfer). The connector is free; the payments layer is where the
  revenue is.
- **Signed merchant webhooks** — `signWebhook` / `verifyWebhook` (HMAC-SHA256,
  Stripe-style `t=…,v1=…`, replay-protected) so your backend learns about `payment.paid`.
- **Beautiful React UI** — `<ConnectModal />` and `<Checkout />`, pure Tailwind, light +
  dark, zero UI dependency.
- **Zero-dependency core** — wallet/XRPL SDKs are *optional peer deps*, lazy-loaded only
  when a given wallet is actually used. You never ship a wallet you don't support.

## Status

WaveKit is on npm as an early **`0.0.1`** preview under the **`@wavekit-sdk`** scope, and is
fully unit-tested (63 tests). Xaman connect + signing are verified end-to-end; the other
adapters (Tangem, WalletConnect, Ledger, Trezor) are built and unit-tested but not yet
exercised against real devices/relays — treat those as beta.

## Packages

| Package | What it is |
| --- | --- |
| [`@wavekit-sdk/core`](packages/core) | Framework-agnostic state machine, payments, XRPL watcher, webhooks, drops utilities. **Zero runtime deps.** |
| [`@wavekit-sdk/react`](packages/react) | `WaveKitProvider`, hooks (`useWallet`, `usePayment`, …) and the `<ConnectModal />` + `<Checkout />` UI. |
| [`@wavekit-sdk/adapter-xaman`](packages/adapter-xaman) | Xaman (XUMM) — QR / push + WebSocket flow. |
| [`@wavekit-sdk/adapter-tangem`](packages/adapter-tangem) | Tangem over WalletConnect v2. |
| [`@wavekit-sdk/adapter-walletconnect`](packages/adapter-walletconnect) | Generic WalletConnect v2 — any WC-compatible XRPL wallet. |
| [`@wavekit-sdk/adapter-ledger`](packages/adapter-ledger) | Ledger hardware over WebHID (`@ledgerhq/hw-app-xrp`). |
| [`@wavekit-sdk/adapter-trezor`](packages/adapter-trezor) | Trezor via `@trezor/connect` (`rippleSignTransaction`). |

Wallet/XRPL SDKs (`xumm`, `@walletconnect/sign-client`, `@ledgerhq/hw-app-xrp`,
`@trezor/connect`, `xrpl`, `ripple-binary-codec`) are **optional peer dependencies** that
the adapters lazy-load only when used.

## Quick start

```bash
npm install @wavekit-sdk/react @wavekit-sdk/adapter-xaman @wavekit-sdk/adapter-walletconnect
# plus the SDKs for the wallets you enable, e.g.:
npm install xumm @walletconnect/sign-client
```

```tsx
import { createWaveKit } from '@wavekit-sdk/core';
import { xamanAdapter } from '@wavekit-sdk/adapter-xaman';
import { walletConnectAdapter } from '@wavekit-sdk/adapter-walletconnect';
import { WaveKitProvider, useWallet, ConnectModal } from '@wavekit-sdk/react';
import { useState } from 'react';

export const waveKit = createWaveKit({
  network: 'mainnet',
  adapters: [
    xamanAdapter({ apiKey: process.env.NEXT_PUBLIC_XAMAN_API_KEY }),
    walletConnectAdapter({ projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID }),
  ],
  monetization: { feeRecipient: 'rYourDevAddress...', swapFeeBps: 20 /* 0.2% */ },
});

function App() {
  return (
    <WaveKitProvider client={waveKit}>
      <Dashboard />
    </WaveKitProvider>
  );
}

function Dashboard() {
  const { account, connected, disconnect } = useWallet();
  const [open, setOpen] = useState(false);

  if (!connected) {
    return (
      <>
        <button onClick={() => setOpen(true)}>Connect XRPL Wallet</button>
        <ConnectModal open={open} onClose={() => setOpen(false)} />
      </>
    );
  }
  return (
    <div>
      <p>Address: {account?.address}</p>
      <button onClick={() => disconnect()}>Disconnect</button>
    </div>
  );
}
```

A full, type-checked example lives in [`examples/usage.tsx`](examples/usage.tsx).

## Payments — "Pay with XRP / RLUSD"

Build a wallet-agnostic payment request, then drop in `<Checkout />` and drive it with
`usePayment()`. The request handles XRP (drops) and tokens like **RLUSD** with exact
decimal maths, an optional transparent fee, a total, and a `ripple:` URI for a QR.

```tsx
import { createPaymentRequest, rlusd, RLUSD_ISSUER_MAINNET } from '@wavekit-sdk/core';
import { Checkout, usePayment } from '@wavekit-sdk/react';

// XRP
const request = createPaymentRequest({
  to: 'rMerchantAddress...',
  amount: { xrp: '25' },
  label: 'Order #1234',
  monetization: { feeRecipient: 'rYourDevAddress...', swapFeeBps: 20 }, // optional 0.2%
});

// …or RLUSD (a stablecoin) — same API, just set `asset`:
const rlusdRequest = createPaymentRequest({
  to: 'rMerchantAddress...',
  amount: { value: '25.00' },
  asset: rlusd(RLUSD_ISSUER_MAINNET),
});

function PayPage() {
  // `watcher` resolves once you detect the payment on-ledger (poll the account,
  // listen to a webhook via SSE, etc.). The card flips to "Paid" automatically.
  const { status } = usePayment(request, {
    watcher: (req, signal) => watchLedgerForPayment(req, signal),
    onPaid: (req) => console.log('paid', req.id),
  });

  return <Checkout request={request} status={status} onPay={openWalletToPay} />;
}
```

`createXrplPaymentWatcher` (zero-dep, `fetch`-based, polls `account_tx`) is provided as a
ready-made `watcher`. The fee, when configured, is built separately via
`buildFeePaymentForRequest` — it is **never** folded into the user's transfer.

## Core API — `createWaveKit`

```ts
const client = createWaveKit({
  network: 'mainnet',          // 'mainnet' | 'testnet' | 'devnet'
  adapters: [...],             // XRPLWalletAdapter[]
  monetization?: { feeRecipient, swapFeeBps },
  autoConnect?: true,          // persist + silently restore the last session
  storage?: customStorage,     // defaults to localStorage (SSR-safe in-memory fallback)
  storageKey?: 'wavekit.session',
});

client.getState();   // { status, account, activeAdapterId, network, error }
client.subscribe(fn) // -> unsubscribe; integrates with useSyncExternalStore

client.connect(adapterId?) // id optional when only one adapter is configured
client.disconnect()
client.signTransaction(txJson, { onAuthRequest?, signal? })
client.switchNetwork('testnet')
client.autoConnect()       // restore a persisted session (the provider calls this for you)
```

- **Subscription / persistence**: state changes are pushed to subscribers; the active
  session is serialized to storage and optimistically restored on reload.
- **Race-safe**: overlapping `connect()` / `disconnect()` calls are guarded with a
  monotonic token so a stale connection can never clobber a newer one.
- **SSR-safe**: storage access is guarded; the store is safe for `useSyncExternalStore`.

## Adapters & drops handling

Every adapter implements `XRPLWalletAdapter`:

```ts
interface XRPLWalletAdapter {
  id: string; name: string; icon: string; downloadUrl?: string;
  connect(options?): Promise<WalletAccount>;
  disconnect(): Promise<void>;
  signTransaction(txJson, options?): Promise<{ txBlob; hash }>;
  on(event, cb): Unsubscribe;
}
```

Before signing, adapters run `normalizeTransactionAmounts`, which converts
developer-friendly XRP amounts into the canonical **drops** the ledger expects
(`1 XRP = 1,000,000 drops`):

```ts
{ Amount: { xrp: '1.5' } }  // -> Amount: '1500000'
{ Amount: '1500000' }       // already drops, passed through
{ Amount: 1.5 }             // rejected: a bare number is drops, and drops are integers
{ Amount: { currency, issuer, value } } // IOU, untouched
```

Standalone helpers are exported too: `xrpToDrops`, `dropsToXrp`, `DROPS_PER_XRP`. The
hardware adapters share a zero-dep `hashSignedTxBlob` (WebCrypto SHA-512Half) from core.

## UI components

### `<ConnectModal />`

```tsx
<ConnectModal
  open={open}
  onClose={() => setOpen(false)}
  accentColor="#3052FF"      // brand color for spinners + primary button
  theme="auto"               // 'light' | 'dark' | 'auto' (follows the `dark` class)
  renderQr={(req) => <MyQr uri={req.qrUri!} />} // optional client-side QR renderer
/>
```

### `<Checkout />`

```tsx
<Checkout
  request={request}          // from createPaymentRequest
  status={status}            // from usePayment
  accentColor="#3052FF"
  theme="auto"
  renderQr={(uri) => <MyQr uri={uri} />}
  onPay={openWalletToPay}
  onCancel={reset}
/>
```

Both are pure Tailwind (rounded corners, dark mode, loading skeletons, micro-interactions)
and need no UI dependency. Prefer headless? Skip the components and drive everything from
the hooks.

## Hooks (`@wavekit-sdk/react`)

- `useWallet()` — `{ account, address, status, connected, isConnecting, network, error, adapters, connect, disconnect, signTransaction, switchNetwork }`
- `usePayment(request, options)` — drives a `PaymentRequest` through `pending → paid / expired / error` for `<Checkout />`.
- `useWaveKitState()` — the raw state via `useSyncExternalStore`.
- `useWaveKitAnalytics()` — anonymous in-session connection counts per adapter. No PII, no keys.
- `useWaveKitSwap()` — fee monetization: `computeFee(inputDrops)` and `buildFeePayment(...)`.

## Monetization

The developer fee is always a **separate, fully transparent** Payment to the configured
`feeRecipient` — nothing is ever hidden inside a user's transaction (the same model as
mainstream swap front-ends). `swapFeeBps` is in basis points (`20` = 0.2%) and the fee is
computed with integer/decimal-exact maths (floored).

## Demo

The [`examples/demo`](examples/demo) Next.js app showcases everything:

| Route | What |
| --- | --- |
| `/` | Marketing landing page. |
| `/docs` | Page-by-page docs + a live playground. |
| `/dashboard` | Merchant analytics (stat cards, wallet split, payments + funnel). |
| `/style` | The WaveKit design system (colors, type, components), light + dark. |

```bash
npm install
npm run dev        # builds the libs, then serves the demo at http://localhost:3000
```

## Development

```bash
npm install
npm run typecheck   # tsc --noEmit across the whole workspace
npm run build       # tsc -b project references -> dist/
npm test            # node:test (drops, store, client, payments, adapters, webhooks)
```

This is an **npm workspaces** monorepo — `npm install` at the root links every package
together. (No pnpm/yarn required.) See [CONTRIBUTING.md](CONTRIBUTING.md) for conventions,
and CI runs the same checks on every push (`.github/workflows/ci.yml`).

## License

[MIT](LICENSE)
