'use client';

import Link from 'next/link';
import { useWaveKitAnalytics, WaveKitProvider } from '@wavekit-sdk/react';
import { ThemeToggle } from '../../src/ThemeToggle';
import { waveKit } from '../../src/wavekit';

const ACCENT = '#3052FF';

const WALLET_LABELS: Record<string, string> = {
  xaman: 'Xaman',
  tangem: 'Tangem',
  walletconnect: 'WalletConnect',
  ledger: 'Ledger',
  trezor: 'Trezor',
  broken: 'Other',
};

// Sample data so the dashboard looks alive; your live session is merged in below.
const SAMPLE_CONNECTIONS: Record<string, number> = {
  xaman: 128,
  walletconnect: 92,
  tangem: 64,
  ledger: 41,
  trezor: 23,
};
const PAYMENTS_7D = [12, 18, 9, 24, 31, 27, 40];
const VOLUME_XRP_7D = [310, 480, 220, 690, 905, 740, 1180];
const FUNNEL = [
  { label: 'Modal opened', value: 1000 },
  { label: 'Wallet connected', value: 420 },
  { label: 'Payment completed', value: 181 },
];

export default function DashboardPage() {
  return (
    <WaveKitProvider client={waveKit}>
      <Dashboard />
    </WaveKitProvider>
  );
}

function Dashboard() {
  const { connectionsByAdapter } = useWaveKitAnalytics();

  const connections: Record<string, number> = { ...SAMPLE_CONNECTIONS };
  for (const [id, n] of Object.entries(connectionsByAdapter)) {
    connections[id] = (connections[id] ?? 0) + n;
  }
  const totalConnections = Object.values(connections).reduce((a, b) => a + b, 0);
  const walletsUsed = Object.values(connections).filter((v) => v > 0).length;
  const paymentsTotal = PAYMENTS_7D.reduce((a, b) => a + b, 0);
  const volumeTotal = VOLUME_XRP_7D.reduce((a, b) => a + b, 0);

  const walletRows = Object.entries(connections).sort((a, b) => b[1] - a[1]);
  const maxWallet = Math.max(...walletRows.map(([, v]) => v), 1);
  const maxPay = Math.max(...PAYMENTS_7D, 1);

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <Link href="/" className="text-lg font-semibold tracking-tight hover:opacity-70">
              WaveKit
            </Link>
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500 dark:bg-zinc-800">
              Dashboard
            </span>
          </div>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/docs" className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white">
              Docs
            </Link>
            <Link href="/docs#playground" className="hidden text-zinc-600 hover:text-zinc-900 sm:inline dark:text-zinc-400 dark:hover:text-white">
              Playground
            </Link>
            <ThemeToggle />
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="text-2xl font-semibold tracking-tight">Merchant analytics</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Sample data, with <span className="font-medium">your live session</span> merged into the
          wallet split (connect in the playground to see it move). A taste of the paid B2B surface.
        </p>

        <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Stat label="Connections" value={totalConnections.toLocaleString()} />
          <Stat label="Wallets used" value={String(walletsUsed)} />
          <Stat label="Payments (7d)" value={paymentsTotal.toLocaleString()} />
          <Stat label="Volume (7d)" value={`${volumeTotal.toLocaleString()} XRP`} />
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Card title="Wallet split" subtitle="connections by wallet (sample + live)">
            <div className="space-y-3">
              {walletRows.map(([id, value]) => (
                <div key={id}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="text-zinc-600 dark:text-zinc-300">{WALLET_LABELS[id] ?? id}</span>
                    <span className="text-zinc-400">{value}</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${(value / maxWallet) * 100}%`, backgroundColor: ACCENT }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Payments" subtitle="last 7 days">
            <div className="flex h-40 items-end gap-2">
              {PAYMENTS_7D.map((v, i) => (
                <div key={i} className="flex flex-1 flex-col items-center gap-1">
                  <div
                    className="w-full rounded-t-md"
                    style={{ height: `${(v / maxPay) * 100}%`, backgroundColor: ACCENT, opacity: 0.85 }}
                    title={`${v} payments`}
                  />
                  <span className="text-[10px] text-zinc-400">{`D${i + 1}`}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="mt-6">
          <Card title="Conversion funnel" subtitle="opens → connected → paid (sample)">
            <div className="space-y-3">
              {FUNNEL.map((step) => {
                const pct = Math.round((step.value / FUNNEL[0].value) * 100);
                return (
                  <div key={step.label}>
                    <div className="mb-1 flex justify-between text-xs">
                      <span className="text-zinc-600 dark:text-zinc-300">{step.label}</span>
                      <span className="text-zinc-400">
                        {step.value.toLocaleString()} · {pct}%
                      </span>
                    </div>
                    <div className="h-6 overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">
                      <div
                        className="flex h-full items-center rounded-lg pl-2 text-[10px] font-medium text-white"
                        style={{ width: `${pct}%`, backgroundColor: ACCENT }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        <p className="mt-8 text-center text-xs text-zinc-400">
          Open-core idea: SDK is free, this dashboard is the paid tier. Wire it to a real
          <code className="mx-1 rounded bg-zinc-100 px-1.5 py-0.5 dark:bg-zinc-800">analyticsSink</code>
          + your payments data in production.
        </p>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="text-2xl font-bold tracking-tight">{value}</div>
      <div className="mt-1 text-xs uppercase tracking-wide text-zinc-400">{label}</div>
    </div>
  );
}

function Card({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-4">
        <h2 className="text-sm font-semibold">{title}</h2>
        {subtitle && <p className="text-xs text-zinc-400">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}
