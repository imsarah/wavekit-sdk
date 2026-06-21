import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { createPaymentRequest, rlusd } from '@wavekit-sdk/core';
import {
  Checkout,
  createXrplPaymentWatcher,
  getXrplServerInfo,
  usePayment,
  type PaymentRequest,
  type XrplServerInfo,
} from '@wavekit-sdk/react';
import { Playground } from './Playground';
import { fakeQrDataUri } from './mockAdapters';
import { Code, CodeBlock, H1, H2, Lead, P, Ul } from './ui';

function Overview() {
  return (
    <div>
      <H1>WaveKit</H1>
      <Lead>A unified wallet connector and payment toolkit for the XRP Ledger.</Lead>
      <P>
        WaveKit hides each wallet behind one common interface, so you connect, sign and
        manage state the same way for every wallet. Add a new wallet by writing one small
        “adapter” — the rest of your app never changes.
      </P>
      <H2>The four packages</H2>
      <Ul>
        <li>
          <Code>@wavekit-sdk/core</Code> — the engine: connect/disconnect, session memory,
          XRP↔drops conversion, fee helpers. No dependencies.
        </li>
        <li>
          <Code>@wavekit-sdk/adapter-xaman</Code> — the Xaman (XUMM) wallet.
        </li>
        <li>
          <Code>@wavekit-sdk/adapter-tangem</Code> — the Tangem wallet (over WalletConnect).
        </li>
        <li>
          <Code>@wavekit-sdk/react</Code> — the React hooks and the <Code>&lt;ConnectModal /&gt;</Code> UI.
        </li>
      </Ul>
      <H2>How it fits together</H2>
      <CodeBlock>{`        [ <ConnectModal /> ]        UI
                 |
           [ useWallet() ]          React hooks
                 |
         [ WaveKit client ]         state engine
        /        |        \\
   [Xaman]   [Tangem]   [ ... ]     wallet adapters`}</CodeBlock>
    </div>
  );
}

function QuickStart() {
  return (
    <div>
      <H1>Quick start</H1>
      <Lead>Four steps from zero to a working “Connect Wallet” button.</Lead>

      <H2>1. Install</H2>
      <CodeBlock>{`npm install @wavekit-sdk/core @wavekit-sdk/react \\
  @wavekit-sdk/adapter-xaman @wavekit-sdk/adapter-tangem

# plus the SDKs for the wallets you enable:
npm install xumm @walletconnect/sign-client xrpl ripple-binary-codec`}</CodeBlock>

      <div className="my-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-200">
        Now on npm under the <Code>@wavekit-sdk</Code> scope (early 0.0.1 preview). You can
        also run WaveKit straight from this repo — the demo does exactly that.
      </div>

      <H2>2. Create the client (once)</H2>
      <CodeBlock>{`import { createWaveKit } from '@wavekit-sdk/core';
import { xamanAdapter } from '@wavekit-sdk/adapter-xaman';
import { tangemAdapter } from '@wavekit-sdk/adapter-tangem';

export const waveKit = createWaveKit({
  network: 'mainnet',
  rpcUrl: 'wss://xrplcluster.com',
  adapters: [
    xamanAdapter({ apiKey: process.env.NEXT_PUBLIC_XAMAN_API_KEY }),
    tangemAdapter({ walletConnectProjectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID }),
  ],
});`}</CodeBlock>

      <H2>3. Wrap your app</H2>
      <CodeBlock>{`import { WaveKitProvider } from '@wavekit-sdk/react';

function App() {
  return (
    <WaveKitProvider client={waveKit}>
      <Dashboard />
    </WaveKitProvider>
  );
}`}</CodeBlock>

      <H2>4. Connect button + modal</H2>
      <CodeBlock>{`import { useState } from 'react';
import { useWallet, ConnectModal } from '@wavekit-sdk/react';

function Dashboard() {
  const { connected, account, disconnect } = useWallet();
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
}`}</CodeBlock>
      <P>That’s the whole integration. Open the “Live playground” page to see it running.</P>
    </div>
  );
}

function Hooks() {
  return (
    <div>
      <H1>Provider &amp; hooks</H1>
      <Lead>One provider at the top, then hooks anywhere below it.</Lead>

      <H2>WaveKitProvider</H2>
      <P>
        Put it once near the root of your app. When <Code>autoConnect</Code> is on (the
        default) it silently restores the last session on refresh.
      </P>
      <CodeBlock>{`<WaveKitProvider client={waveKit}>
  <App />
</WaveKitProvider>`}</CodeBlock>

      <H2>useWallet()</H2>
      <P>The main hook. It returns:</P>
      <Ul>
        <li><Code>account</Code> / <Code>address</Code> — the connected account (or null)</li>
        <li><Code>connected</Code>, <Code>isConnecting</Code>, <Code>status</Code></li>
        <li><Code>network</Code>, <Code>error</Code>, <Code>adapters</Code></li>
        <li><Code>connect(id?)</Code>, <Code>disconnect()</Code>, <Code>signTransaction(tx)</Code>, <Code>switchNetwork(net)</Code></li>
      </Ul>
      <CodeBlock>{`const { connected, account, connect, disconnect, signTransaction } = useWallet();

// connect a specific wallet by id (or omit if there is only one):
await connect('xaman');

// sign a payment (XRP amount auto-converted to drops):
const { hash } = await signTransaction({
  TransactionType: 'Payment',
  Destination: 'rDestination...',
  Amount: { xrp: '1.5' },
});`}</CodeBlock>

      <H2>useWaveKitState()</H2>
      <P>
        If you only need the raw state (and not the action callbacks), this re-renders on
        every change via React’s <Code>useSyncExternalStore</Code>.
      </P>
    </div>
  );
}

function Modal() {
  return (
    <div>
      <H1>ConnectModal</H1>
      <Lead>A clean, shadcn/ui-style wallet picker. Pure Tailwind — no UI dependency.</Lead>
      <CodeBlock>{`import { ConnectModal } from '@wavekit-sdk/react';

<ConnectModal
  open={open}
  onClose={() => setOpen(false)}
  title="Connect a wallet"
  accentColor="#3052FF"     // your brand colour
  theme="auto"              // 'light' | 'dark' | 'auto'
  onConnected={(id) => console.log('connected', id)}
/>`}</CodeBlock>

      <H2>Props</H2>
      <Ul>
        <li><Code>open</Code> / <Code>onClose</Code> — you control visibility</li>
        <li><Code>title</Code> — heading text</li>
        <li><Code>accentColor</Code> — colour for the spinner and primary buttons</li>
        <li><Code>theme</Code> — light, dark, or follow the page</li>
        <li><Code>onConnected(id)</Code> — called after a wallet connects</li>
        <li><Code>renderQr(req)</Code> — plug in your own QR renderer (optional)</li>
      </Ul>

      <H2>It handles the whole flow</H2>
      <P>
        Wallet list → loading skeleton → QR code or connect link → connected, with a
        friendly retry screen if something fails. Dark mode and your accent colour are
        built in.
      </P>

      <H2>Prefer no UI?</H2>
      <P>
        Skip the modal entirely and build your own buttons with <Code>useWallet()</Code> —
        the engine works the same.
      </P>
    </div>
  );
}

function Adapters() {
  return (
    <div>
      <H1>Adapters &amp; drops</H1>
      <Lead>Each wallet is a small adapter. All amounts are handled in “drops”.</Lead>

      <H2>Xaman</H2>
      <CodeBlock>{`import { xamanAdapter } from '@wavekit-sdk/adapter-xaman';

xamanAdapter({ apiKey: process.env.NEXT_PUBLIC_XAMAN_API_KEY });`}</CodeBlock>
      <P>Shows a QR code and resolves once the user approves in the Xaman app.</P>

      <H2>Tangem</H2>
      <CodeBlock>{`import { tangemAdapter } from '@wavekit-sdk/adapter-tangem';

tangemAdapter({ walletConnectProjectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID });`}</CodeBlock>
      <P>Connects over WalletConnect; the user taps their Tangem card to their phone.</P>

      <H2>WalletConnect (any WC wallet)</H2>
      <CodeBlock>{`import { walletConnectAdapter } from '@wavekit-sdk/adapter-walletconnect';

walletConnectAdapter({
  walletConnectProjectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID,
  name: 'My Wallet', // optional label/icon for a specific WC wallet
});`}</CodeBlock>
      <P>QR / deep link, then signs with xrpl_signTransaction — for any WalletConnect-compatible XRPL wallet.</P>

      <H2>Ledger (hardware)</H2>
      <CodeBlock>{`import { ledgerAdapter } from '@wavekit-sdk/adapter-ledger';
// npm i @ledgerhq/hw-app-xrp @ledgerhq/hw-transport-webhid ripple-binary-codec

ledgerAdapter(); // connects over WebHID, signs on-device`}</CodeBlock>
      <P>Reads the account with the XRP app and signs locally. Pass a complete (autofilled) transaction.</P>

      <H2>Trezor (hardware)</H2>
      <CodeBlock>{`import { trezorAdapter } from '@wavekit-sdk/adapter-trezor';
// npm i @trezor/connect

trezorAdapter({ manifest: { email: 'you@example.com', appUrl: 'https://yourapp.com' } });`}</CodeBlock>
      <P>Signs via Trezor Connect (Payment transactions; set Fee and Sequence first).</P>

      <H2>Working with drops</H2>
      <P>
        On the XRP Ledger, 1 XRP = 1,000,000 “drops”. Adapters convert XRP amounts for you
        before signing:
      </P>
      <CodeBlock>{`{ Amount: { xrp: '1.5' } }   // -> '1500000'  (converted)
{ Amount: '1500000' }        // already drops, left as-is
{ Amount: 1.5 }              // rejected: a bare number is drops (must be a whole number)`}</CodeBlock>
      <P>And the standalone helpers:</P>
      <CodeBlock>{`import { xrpToDrops, dropsToXrp } from '@wavekit-sdk/core';

xrpToDrops('1.5');     // '1500000'
dropsToXrp('1500000'); // '1.5'`}</CodeBlock>
    </div>
  );
}

function Money() {
  return (
    <div>
      <H1>Monetization &amp; analytics</H1>
      <Lead>Optional extras for sustainable open-source projects.</Lead>

      <H2>Swap fee</H2>
      <P>
        Configure a transparent developer fee. It is always a separate, visible payment to
        your address — never hidden inside a user’s transaction.
      </P>
      <CodeBlock>{`createWaveKit({
  /* ... */
  monetization: { feeRecipient: 'rYourDevAddress...', swapFeeBps: 20 }, // 20 bps = 0.2%
});

// in a component:
const swap = useWaveKitSwap();
const fee = swap.computeFee('100000000'); // 100 XRP in drops
// -> { feeDrops: '200000', feeXrp: '0.2', bps: 20, recipient: '...' }`}</CodeBlock>

      <H2>Usage analytics</H2>
      <P>
        Anonymous, in-session counts of which wallets people connect with (Xaman vs
        Tangem). No personal data, no keys.
      </P>
      <CodeBlock>{`const stats = useWaveKitAnalytics();
// { connectionsByAdapter: { xaman: 3, tangem: 1 }, totalConnections: 4, ... }`}</CodeBlock>
    </div>
  );
}

// A fake "watcher" that pretends the ledger confirms the payment after ~6s, so the
// demo needs no network or wallet. In production this polls XRPL (or a webhook).
const demoWatcher = (_request: PaymentRequest, signal: AbortSignal): Promise<void> =>
  new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, 6000);
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(new Error('cancelled'));
      },
      { once: true },
    );
  });

const TAB = 'rounded-lg px-4 py-1.5 text-zinc-500 transition-colors';
const TAB_ACTIVE = 'rounded-lg bg-zinc-900 px-4 py-1.5 font-medium text-white dark:bg-white dark:text-zinc-900';

// RLUSD issuer on XRPL mainnet (shown for the demo).
const RLUSD_ISSUER = 'rMxCKbEDwqr76QuheSUMdEGf4B9xJ8m5De';

function PaymentsDemo() {
  const [nonce, setNonce] = useState(0);
  const [token, setToken] = useState(false);
  const request = useMemo(
    () =>
      createPaymentRequest({
        to: 'rMerchantDemo5n4Rq8Xc2Vb1ZsExample',
        label: 'WaveKit T-shirt',
        network: 'mainnet',
        monetization: { feeRecipient: 'rDevFeeRecipientExample', swapFeeBps: 20 },
        ...(token
          ? { amount: { value: '25' }, asset: rlusd(RLUSD_ISSUER) }
          : { amount: { xrp: '25' } }),
      }),
    // a fresh nonce or asset switch builds a new request
    [nonce, token],
  );
  const { status, markPaid } = usePayment(request, { watcher: demoWatcher, autoWatch: true });

  return (
    <div className="my-6 flex flex-col items-center gap-3">
      <div className="inline-flex rounded-xl border border-zinc-200 p-1 text-sm dark:border-zinc-800">
        <button type="button" onClick={() => setToken(false)} className={token ? TAB : TAB_ACTIVE}>
          XRP
        </button>
        <button type="button" onClick={() => setToken(true)} className={token ? TAB_ACTIVE : TAB}>
          RLUSD
        </button>
      </div>
      <Checkout
        request={request}
        status={status}
        accentColor="#3052FF"
        theme="auto"
        renderQr={(uri) => (
          <img
            src={fakeQrDataUri(uri)}
            alt="Payment QR"
            className="h-44 w-44 rounded-xl border border-zinc-200 bg-white p-2 dark:border-zinc-800"
          />
        )}
        onPay={markPaid}
        onCancel={() => setNonce((n) => n + 1)}
      />
    </div>
  );
}

function TestnetStatus() {
  const [state, setState] = useState<{ kind: 'loading' | 'ok' | 'error'; info?: XrplServerInfo; msg?: string }>(
    { kind: 'loading' },
  );
  useEffect(() => {
    const ctrl = new AbortController();
    getXrplServerInfo('/api/xrpl?network=testnet', ctrl.signal)
      .then((info) => setState({ kind: 'ok', info }))
      .catch((e) => setState({ kind: 'error', msg: e instanceof Error ? e.message : 'unreachable' }));
    return () => ctrl.abort();
  }, []);

  return (
    <div className="my-4 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">XRPL testnet (live)</span>
        {state.kind === 'loading' && <span className="text-xs text-zinc-400">connecting…</span>}
        {state.kind === 'ok' && <span className="text-xs font-medium text-emerald-600">● live</span>}
        {state.kind === 'error' && <span className="text-xs font-medium text-amber-600">● unreachable</span>}
      </div>
      {state.kind === 'ok' && state.info && (
        <p className="mt-1 text-xs text-zinc-500">
          Validated ledger #{state.info.ledgerIndex} · server {state.info.serverState}. A real call to
          the testnet, straight from your browser.
        </p>
      )}
      {state.kind === 'error' && (
        <p className="mt-1 text-xs text-zinc-500">
          Couldn’t reach the testnet from the browser (often CORS). The watcher is meant to run from
          your backend — the code below works there unchanged. ({state.msg})
        </p>
      )}
    </div>
  );
}

function TestnetReceive() {
  const [phase, setPhase] = useState<'idle' | 'creating' | 'ready' | 'error'>('idle');
  const [address, setAddress] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const create = async (): Promise<void> => {
    setPhase('creating');
    setErr(null);
    try {
      const res = await fetch('/api/xrpl/invoice', { method: 'POST' });
      const data = (await res.json()) as { address?: string; error?: string };
      if (!res.ok || !data.address) throw new Error(data.error ?? 'failed');
      setAddress(data.address);
      setPhase('ready');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'failed');
      setPhase('error');
    }
  };

  return (
    <div className="my-4 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium">Try it on real testnet</span>
        {phase !== 'ready' && (
          <button
            type="button"
            onClick={() => void create()}
            disabled={phase === 'creating'}
            className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: '#3052FF' }}
          >
            {phase === 'creating' ? 'Creating…' : 'Create testnet invoice'}
          </button>
        )}
      </div>
      {phase === 'idle' && (
        <p className="mt-2 text-xs text-zinc-500">
          Creates a funded testnet account, then watches the real ledger for an incoming payment.
        </p>
      )}
      {phase === 'error' && (
        <p className="mt-2 text-xs text-amber-600">
          Couldn’t reach the testnet faucet from this environment ({err}). The code is correct — try
          it from your own machine.
        </p>
      )}
      {phase === 'ready' && address && <TestnetCheckout address={address} />}
    </div>
  );
}

function TestnetCheckout({ address }: { address: string }) {
  const tag = useMemo(() => Math.floor(Math.random() * 1_000_000_000), []);
  const request = useMemo(
    () =>
      createPaymentRequest({
        to: address,
        amount: { xrp: '5' },
        network: 'testnet',
        destinationTag: tag,
        label: 'Testnet invoice',
      }),
    [address, tag],
  );
  const watcher = useMemo(
    () => createXrplPaymentWatcher({ rpcUrl: '/api/xrpl?network=testnet', pollMs: 4000 }),
    [],
  );
  const { status } = usePayment(request, { watcher, autoWatch: true });
  const [paying, setPaying] = useState(false);
  const [payMsg, setPayMsg] = useState<string | null>(null);

  const pay = async (): Promise<void> => {
    setPaying(true);
    setPayMsg(null);
    try {
      const res = await fetch('/api/xrpl/pay', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ to: address, amountXrp: '5', destinationTag: tag }),
      });
      const data = (await res.json()) as { result?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'failed');
      setPayMsg(`Submitted (${data.result ?? 'ok'}) — watching the ledger…`);
    } catch (e) {
      setPayMsg(e instanceof Error ? e.message : 'failed');
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="mt-3 flex flex-col items-center gap-3">
      <Checkout
        request={request}
        status={status}
        accentColor="#3052FF"
        theme="auto"
        renderQr={(uri) => (
          <img
            src={fakeQrDataUri(uri)}
            alt="Payment QR"
            className="h-44 w-44 rounded-xl border border-zinc-200 bg-white p-2 dark:border-zinc-800"
          />
        )}
      />
      <a
        href={`https://testnet.xrpl.org/accounts/${address}`}
        target="_blank"
        rel="noreferrer"
        className="max-w-full truncate text-xs text-zinc-400 underline-offset-4 hover:underline"
      >
        {address} ↗
      </a>
      {status !== 'paid' && (
        <button
          type="button"
          onClick={() => void pay()}
          disabled={paying}
          className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
        >
          {paying ? 'Sending a real testnet payment…' : 'Simulate a real payment'}
        </button>
      )}
      {payMsg && <p className="text-center text-xs text-zinc-500">{payMsg}</p>}
    </div>
  );
}

function Payments() {
  return (
    <div>
      <H1>Payments (Checkout)</H1>
      <Lead>
        Collect XRP or RLUSD with a drop-in checkout — QR, live status, and an optional
        transparent platform fee. This is what turns WaveKit from a connector into a gateway.
      </Lead>

      <PaymentsDemo />
      <p className="-mt-2 text-center text-xs text-zinc-400">
        Live demo · switch XRP / RLUSD · auto-confirms after ~6s, or press “Pay with wallet”.
      </p>

      <H2>1. Build a payment request</H2>
      <CodeBlock>{`import { createPaymentRequest } from '@wavekit-sdk/core';

const request = createPaymentRequest({
  to: 'rMerchant...',            // your merchant address
  amount: { xrp: '25' },         // 25 XRP (auto-converted to drops)
  label: 'Order #1234',
  monetization: { feeRecipient: 'rYourDevAddress...', swapFeeBps: 20 }, // optional 0.2% fee
});
// -> request.amountValue, request.amountDrops, request.fee, request.totalValue, request.uri`}</CodeBlock>

      <H2>Stablecoins (RLUSD)</H2>
      <P>
        Charge a token (IOU) instead of XRP by passing <Code>asset</Code>. WaveKit ships an{' '}
        <Code>rlusd()</Code> helper for Ripple’s USD stablecoin; the fee is taken in the same asset.
      </P>
      <CodeBlock>{`import { createPaymentRequest, rlusd, RLUSD_ISSUER_MAINNET } from '@wavekit-sdk/core';

const request = createPaymentRequest({
  to: 'rMerchant...',
  amount: { value: '25.00' },              // 25 RLUSD
  asset: rlusd(RLUSD_ISSUER_MAINNET),      // Ripple USD stablecoin
  monetization: { feeRecipient: 'rDev...', swapFeeBps: 20 },
});
// buildPaymentTransaction(request, from).Amount === { currency, issuer, value }`}</CodeBlock>

      <H2>2. Render the checkout</H2>
      <P>
        Drive the status with <Code>usePayment</Code>. The same <Code>Checkout</Code> renders XRP or
        RLUSD automatically.
      </P>
      <CodeBlock>{`import { Checkout, usePayment } from '@wavekit-sdk/react';

function Pay({ request }) {
  const { status } = usePayment(request, { watcher });
  return <Checkout request={request} status={status} accentColor="#3052FF" />;
}`}</CodeBlock>

      <H2>3. Confirm on real XRPL</H2>
      <P>
        <Code>createXrplPaymentWatcher</Code> polls the ledger (for the request’s network) until a
        matching, validated Payment lands — XRP or token. No SDK, just <Code>fetch</Code>.
      </P>
      <TestnetStatus />
      <TestnetReceive />
      <CodeBlock>{`import { createXrplPaymentWatcher, getXrplServerInfo, XRPL_RPC } from '@wavekit-sdk/core';
import { usePayment } from '@wavekit-sdk/react';

// optional connectivity check
const info = await getXrplServerInfo(XRPL_RPC.testnet); // { ledgerIndex, network, serverState }

// real on-ledger detection (run from your backend, or the browser if CORS allows)
const { status } = usePayment(request, {
  watcher: createXrplPaymentWatcher({ pollMs: 5000 }),
});`}</CodeBlock>

      <H2>Or sign it with the connected wallet</H2>
      <CodeBlock>{`import { buildPaymentTransaction, buildFeePaymentForRequest } from '@wavekit-sdk/core';
import { useWallet } from '@wavekit-sdk/react';

const { account, signTransaction } = useWallet();

// the merchant transfer (XRP drops, or an IOU amount object for RLUSD)
await signTransaction(buildPaymentTransaction(request, account.address));

// the separate, transparent fee (only if you configured one)
const feeTx = buildFeePaymentForRequest(request, account.address);
if (feeTx) await signTransaction(feeTx);`}</CodeBlock>

      <div className="my-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-200">
        The interactive demo uses a fake 6-second watcher (no wallet needed). The “XRPL testnet
        (live)” box above is a real network call; swap in <Code>createXrplPaymentWatcher</Code> for
        real payment detection.
      </div>
    </div>
  );
}

interface ReceivedWebhook {
  event: {
    id: string;
    type: string;
    createdAt: number;
    data: { amountValue: string; symbol: string; txHash: string; requestId: string };
  };
  verified: boolean;
  receivedAt: number;
}

function WebhooksDemo() {
  const [events, setEvents] = useState<ReceivedWebhook[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const refresh = async (): Promise<void> => {
    try {
      const r = await fetch('/api/merchant/webhook');
      const d = (await r.json()) as { events?: ReceivedWebhook[] };
      setEvents(d.events ?? []);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const simulate = async (): Promise<void> => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch('/api/merchant/notify', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          amountXrp: '25',
          txHash: 'TESTNET_' + Math.random().toString(36).slice(2, 10).toUpperCase(),
          destinationTag: Math.floor(Math.random() * 1_000_000),
        }),
      });
      const d = (await res.json()) as { delivered?: boolean; status?: number };
      setMsg(d.delivered ? 'Signed webhook delivered & verified ✓' : `Delivery failed (status ${d.status ?? '?'})`);
      await refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="my-6 rounded-2xl border border-zinc-200 p-5 dark:border-zinc-800">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Live webhook demo</p>
          <p className="text-xs text-zinc-500">
            Fires a signed payment.paid event to a sample merchant endpoint that verifies it.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void simulate()}
          disabled={busy}
          className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: '#3052FF' }}
        >
          {busy ? 'Sending…' : 'Simulate paid order'}
        </button>
      </div>
      {msg && <p className="mt-2 text-xs text-zinc-500">{msg}</p>}
      <div className="mt-4 space-y-2">
        {events.length === 0 && <p className="text-xs text-zinc-400">No events yet — press the button.</p>}
        {events.map((e, i) => (
          <div
            key={`${e.event.id}-${i}`}
            className="flex items-center justify-between gap-2 rounded-lg bg-zinc-50 px-3 py-2 text-xs dark:bg-zinc-900"
          >
            <span className="font-mono font-medium text-emerald-600">✓ {e.event.type}</span>
            <span className="text-zinc-600 dark:text-zinc-300">
              {e.event.data.amountValue} {e.event.data.symbol}
            </span>
            <span className="truncate font-mono text-zinc-400">{e.event.data.txHash}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Webhooks() {
  return (
    <div>
      <H1>Webhooks</H1>
      <Lead>
        Turn an on-ledger payment into a trusted server event. WaveKit signs a{' '}
        <Code>payment.paid</Code> webhook (HMAC-SHA256) so your backend can fulfil orders
        safely — the merchant flow behind the checkout.
      </Lead>

      <WebhooksDemo />

      <H2>1. Verify on your backend</H2>
      <P>
        Always verify against the <em>raw</em> body before trusting an event.
      </P>
      <CodeBlock>{`import { verifyWebhook } from '@wavekit-sdk/core';

// your POST /webhooks/wavekit handler (use the RAW body, not parsed):
const ok = await verifyWebhook(
  process.env.WAVEKIT_WEBHOOK_SECRET,
  rawBody,
  req.headers['wavekit-signature'],
);
if (!ok) return res.status(400).end();

const event = JSON.parse(rawBody); // { type: 'payment.paid', data: { txHash, requestId, ... } }
fulfilOrder(event.data.requestId);`}</CodeBlock>

      <H2>2. Fire it after the ledger confirms</H2>
      <P>Run the watcher server-side, then deliver a signed event to the merchant URL.</P>
      <CodeBlock>{`import { createXrplPaymentWatcher, buildPaymentWebhookEvent, signWebhook } from '@wavekit-sdk/core';

await createXrplPaymentWatcher()(request, signal); // resolves when paid on-ledger

const event = buildPaymentWebhookEvent(request, { txHash });
const body = JSON.stringify(event);
const signature = await signWebhook(process.env.WAVEKIT_WEBHOOK_SECRET, body);

await fetch(merchantWebhookUrl, {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'wavekit-signature': signature },
  body,
});`}</CodeBlock>

      <div className="my-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-200">
        The signature is Stripe-style (<Code>t=…,v1=…</Code>) and includes a timestamp, so
        verification also rejects replays older than ~5 minutes.
      </div>
    </div>
  );
}

export interface DocPage {
  id: string;
  title: string;
  element: ReactNode;
}

export const PAGES: DocPage[] = [
  { id: 'overview', title: 'Overview', element: <Overview /> },
  { id: 'quick-start', title: 'Quick start', element: <QuickStart /> },
  { id: 'hooks', title: 'Provider & hooks', element: <Hooks /> },
  { id: 'modal', title: 'ConnectModal', element: <Modal /> },
  { id: 'adapters', title: 'Adapters & drops', element: <Adapters /> },
  { id: 'monetization', title: 'Monetization & analytics', element: <Money /> },
  { id: 'payments', title: 'Payments', element: <Payments /> },
  { id: 'webhooks', title: 'Webhooks', element: <Webhooks /> },
  { id: 'playground', title: 'Live playground', element: <Playground /> },
];
