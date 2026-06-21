import Link from 'next/link';
import {
  LEDGER_ICON,
  TANGEM_ICON,
  TREZOR_ICON,
  WALLETCONNECT_ICON,
  XAMAN_ICON,
} from '../src/mockAdapters';
import { ThemeToggle } from '../src/ThemeToggle';

const GITHUB_URL = 'https://github.com/imsarah/wavekit';
const ACCENT = '#3052FF';

const wallets = [
  { name: 'Xaman', icon: XAMAN_ICON },
  { name: 'Tangem', icon: TANGEM_ICON },
  { name: 'WalletConnect', icon: WALLETCONNECT_ICON },
  { name: 'Ledger', icon: LEDGER_ICON },
  { name: 'Trezor', icon: TREZOR_ICON },
];

const features = [
  { icon: '🔌', title: 'Every wallet, one API', body: 'Xaman, Tangem, WalletConnect, Ledger, Trezor — behind a single interface. Add more with one small adapter.' },
  { icon: '🎨', title: 'Beautiful ConnectModal', body: 'A shadcn-style picker with QR, loading and error states. Pure Tailwind, your accent colour, dark mode built in.' },
  { icon: '💸', title: 'Accept payments', body: 'A drop-in checkout for XRP and RLUSD, with QR, live status and an optional transparent fee. A connector that also gets you paid.' },
  { icon: '🪙', title: 'Drops-safe by design', body: 'BigInt XRP↔drops with a loud failure mode, so you never fat-finger a 1,000,000× mistake.' },
  { icon: '🧩', title: 'TypeScript-first', body: 'Fully typed core, hooks and adapters. Zero-dependency core; SDKs load only when used.' },
  { icon: '⚡', title: 'SSR-ready', body: 'Works cleanly in Next.js — no window access on the server, safe hydration, no flash.' },
];

const stats = [
  { value: '5+', label: 'wallets' },
  { value: '0', label: 'core deps' },
  { value: '63', label: 'tests' },
  { value: 'XRP + RLUSD', label: 'payments' },
];

const snippet = `import { createWaveKit } from '@wavekit-sdk/core';
import { WaveKitProvider, ConnectModal, useWallet } from '@wavekit-sdk/react';
import { xamanAdapter } from '@wavekit-sdk/adapter-xaman';

const waveKit = createWaveKit({
  network: 'mainnet',
  adapters: [xamanAdapter({ apiKey: process.env.NEXT_PUBLIC_XAMAN_API_KEY })],
});

function ConnectButton() {
  const { connected, account } = useWallet();
  const [open, setOpen] = useState(false);
  return connected
    ? <span>{account?.address}</span>
    : <button onClick={() => setOpen(true)}>Connect XRPL Wallet</button>;
}`;

function WalletMark({ name, icon, size = 'h-10 w-10' }: { name: string; icon: string; size?: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <span
        aria-label={name}
        className={`${size} overflow-hidden rounded-xl shadow-sm [&>svg]:h-full [&>svg]:w-full`}
        dangerouslySetInnerHTML={{ __html: icon }}
      />
      <span className="text-xs text-zinc-500 dark:text-zinc-400">{name}</span>
    </div>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      {/* Nav */}
      <header className="sticky top-0 z-10 border-b border-zinc-100 bg-white/80 backdrop-blur dark:border-zinc-900 dark:bg-zinc-950/80">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-lg text-sm font-bold text-white" style={{ backgroundColor: ACCENT }}>
              W
            </span>
            <span className="text-lg font-semibold tracking-tight">WaveKit</span>
            <span className="ml-1 hidden rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500 sm:inline dark:bg-zinc-800 dark:text-zinc-400">
              for XRPL
            </span>
          </div>
          <nav className="flex items-center gap-3 text-sm sm:gap-5">
            <Link href="/docs" className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white">Docs</Link>
            <Link href="/dashboard" className="hidden text-zinc-600 hover:text-zinc-900 sm:inline dark:text-zinc-300 dark:hover:text-white">Dashboard</Link>
            <a href={GITHUB_URL} className="hidden text-zinc-600 hover:text-zinc-900 sm:inline dark:text-zinc-300 dark:hover:text-white">GitHub</a>
            <ThemeToggle />
            <Link href="/docs#playground" className="rounded-lg px-3 py-1.5 font-medium text-white" style={{ backgroundColor: ACCENT }}>
              Live demo
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 -top-40 h-80 opacity-25 blur-3xl" style={{ background: `radial-gradient(50% 60% at 50% 50%, ${ACCENT}, transparent)` }} />
        <div className="mx-auto max-w-5xl px-6 pb-10 pt-20 text-center">
          <span className="inline-block rounded-full border border-zinc-200 px-3 py-1 text-xs font-medium text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
            Wallet adapter · payments · for the XRP Ledger
          </span>
          <h1 className="mx-auto mt-5 max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl">
            Connect any XRPL wallet. <span style={{ color: ACCENT }}>Get paid</span> in XRP or RLUSD.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-zinc-500 dark:text-zinc-400">
            WaveKit is the drop-in “Connect Wallet” + checkout toolkit for the XRP Ledger —
            five wallets, a beautiful modal, and a payments primitive, in a few lines of React.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/docs" className="rounded-xl px-6 py-3 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90" style={{ backgroundColor: ACCENT }}>
              Get started →
            </Link>
            <Link href="/docs#payments" className="rounded-xl border border-zinc-200 px-6 py-3 text-sm font-semibold transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900">
              See payments
            </Link>
          </div>

          <div className="mt-12">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">Works with</p>
            <div className="mt-5 flex flex-wrap items-start justify-center gap-x-8 gap-y-5">
              {wallets.map((w) => (
                <WalletMark key={w.name} name={w.name} icon={w.icon} />
              ))}
            </div>
          </div>
        </div>

        {/* Code card */}
        <div className="mx-auto max-w-3xl px-6 pb-20">
          <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-950 shadow-xl dark:border-zinc-800">
            <div className="flex items-center gap-1.5 border-b border-zinc-800 px-4 py-3">
              <span className="h-3 w-3 rounded-full bg-zinc-700" />
              <span className="h-3 w-3 rounded-full bg-zinc-700" />
              <span className="h-3 w-3 rounded-full bg-zinc-700" />
              <span className="ml-3 text-xs text-zinc-500">ConnectButton.tsx</span>
            </div>
            <pre className="overflow-x-auto p-5 text-left text-xs leading-relaxed text-zinc-100">
              <code>{snippet}</code>
            </pre>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-zinc-100 bg-zinc-50/60 dark:border-zinc-900 dark:bg-zinc-900/40">
        <div className="mx-auto grid max-w-4xl grid-cols-2 gap-6 px-6 py-10 sm:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-2xl font-bold tracking-tight" style={{ color: ACCENT }}>{s.value}</div>
              <div className="mt-1 text-xs uppercase tracking-wide text-zinc-400">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Payments highlight */}
      <section className="mx-auto max-w-5xl px-6 py-20">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <span className="text-sm font-semibold" style={{ color: ACCENT }}>Payments</span>
            <h2 className="mt-2 text-3xl font-bold tracking-tight">A connector that gets you paid</h2>
            <p className="mt-4 text-zinc-500 dark:text-zinc-400">
              Build a payment request, render the <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-sm dark:bg-zinc-800">{'<Checkout/>'}</code>,
              and confirm it on-ledger — for XRP or the RLUSD stablecoin. An optional,
              fully transparent fee makes it a revenue stream, not just a button.
            </p>
            <ul className="mt-6 space-y-2 text-sm text-zinc-600 dark:text-zinc-300">
              <li>• QR + live status (pending → paid), wallet-agnostic</li>
              <li>• Real on-ledger detection (poll or webhook)</li>
              <li>• Transparent platform fee, taken in the same asset</li>
            </ul>
            <Link href="/docs#payments" className="mt-7 inline-block rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90" style={{ backgroundColor: ACCENT }}>
              Explore payments →
            </Link>
          </div>

          {/* checkout mockup */}
          <div className="mx-auto w-full max-w-sm rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
              <span className="text-sm font-semibold">Pay with XRP</span>
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">Paid</span>
            </div>
            <div className="space-y-3 px-4 py-5">
              <div className="rounded-xl bg-zinc-50 p-4 text-sm dark:bg-zinc-950">
                <div className="mb-2 font-medium text-zinc-700 dark:text-zinc-200">WaveKit T-shirt</div>
                <div className="flex justify-between text-zinc-500 dark:text-zinc-400"><span>Amount</span><span>25 XRP</span></div>
                <div className="flex justify-between text-zinc-400"><span>Fee (0.2%)</span><span>0.05 XRP</span></div>
                <div className="my-2 border-t border-zinc-200 dark:border-zinc-800" />
                <div className="flex justify-between font-semibold"><span>Total</span><span>25.05 XRP</span></div>
              </div>
              <div className="flex items-center justify-center gap-2 py-2 text-sm text-emerald-600 dark:text-emerald-400">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-emerald-50 dark:bg-emerald-950/40">✓</span>
                Payment received
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-5xl px-6 pb-20">
        <h2 className="text-center text-2xl font-bold tracking-tight">Everything you need to onboard XRPL users</h2>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="rounded-2xl border border-zinc-200 p-6 transition-shadow hover:shadow-sm dark:border-zinc-800">
              <div className="text-2xl">{f.icon}</div>
              <h3 className="mt-3 font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-5xl px-6 pb-24">
        <div className="rounded-3xl px-8 py-14 text-center text-white" style={{ background: `linear-gradient(135deg, ${ACCENT}, #6b3cff)` }}>
          <h2 className="text-3xl font-bold tracking-tight">Ready to build on XRPL?</h2>
          <p className="mx-auto mt-3 max-w-xl text-white/80">
            Read the docs, then try the live playground — connect, sign, and take a payment, all running offline.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/docs" className="rounded-xl bg-white px-6 py-3 text-sm font-semibold text-zinc-900 transition-opacity hover:opacity-90">
              Read the docs
            </Link>
            <Link href="/dashboard" className="rounded-xl border border-white/40 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10">
              View dashboard
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-100 dark:border-zinc-900">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-3 px-6 py-8 text-sm text-zinc-400 sm:flex-row">
          <span>WaveKit — Unified wallet adapter + payments for the XRP Ledger.</span>
          <div className="flex gap-5">
            <Link href="/docs" className="hover:text-zinc-600 dark:hover:text-zinc-200">Docs</Link>
            <Link href="/dashboard" className="hover:text-zinc-600 dark:hover:text-zinc-200">Dashboard</Link>
            <a href={GITHUB_URL} className="hover:text-zinc-600 dark:hover:text-zinc-200">GitHub</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
