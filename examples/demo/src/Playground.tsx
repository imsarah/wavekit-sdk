import { useRef, useState } from 'react';
import { ConnectModal, useWallet } from '@wavekit-sdk/react';
import { H1, Lead } from './ui';

export function Playground() {
  const { connected, account, isConnecting, network, disconnect, signTransaction } = useWallet();
  const [open, setOpen] = useState(false);
  const [signResult, setSignResult] = useState<string | null>(null);
  const [signQr, setSignQr] = useState<string | null>(null);
  const signAbort = useRef<AbortController | null>(null);

  const onSign = async (): Promise<void> => {
    if (!account?.address) return;
    const controller = new AbortController();
    signAbort.current = controller;
    setSignResult('Signing…');
    setSignQr(null);
    try {
      const res = await signTransaction(
        {
          TransactionType: 'Payment',
          Destination: account.address, // demo self-payment; sign-only, never broadcast
          Amount: { xrp: '1' }, // auto-converted to drops by the adapter
        },
        { onAuthRequest: (req) => setSignQr(req.qrPng ?? null), signal: controller.signal },
      );
      setSignResult(`Signed ✓  hash: ${res.hash}`);
    } catch (err) {
      setSignResult(
        controller.signal.aborted
          ? 'Cancelled.'
          : err instanceof Error
            ? `Error: ${err.message}`
            : 'Error',
      );
    } finally {
      setSignQr(null);
      if (signAbort.current === controller) signAbort.current = null;
    }
  };

  const onCancelSign = (): void => signAbort.current?.abort();

  return (
    <div>
      <H1>Live playground</H1>
      <Lead>
        Most wallets are mocked (offline, no keys). Xaman is real when you set
        NEXT_PUBLIC_XAMAN_API_KEY: “Xaman” uses the popup sign-in, “Xaman (QR)” shows the
        QR in-app. “Always-fails Wallet” demos the error screen.
      </Lead>

      <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        {!connected ? (
          <div className="flex flex-col items-start gap-4">
            <p className="text-sm text-zinc-500">No wallet connected.</p>
            <button
              type="button"
              onClick={() => setOpen(true)}
              disabled={isConnecting}
              className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: '#3052FF' }}
            >
              {isConnecting ? 'Connecting…' : 'Connect XRPL Wallet'}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-zinc-400">Connected account</p>
              <p className="mt-1 break-all font-mono text-sm">{account?.address}</p>
              <span className="mt-2 inline-block rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                {network}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void onSign()}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
                style={{ backgroundColor: '#3052FF' }}
              >
                Sign demo transaction
              </button>
              <button
                type="button"
                onClick={() => {
                  setSignResult(null);
                  void disconnect();
                }}
                className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-medium transition-colors hover:bg-zinc-100 dark:border-zinc-800 dark:hover:bg-zinc-900"
              >
                Disconnect
              </button>
            </div>
            {signQr && (
              <div className="flex flex-col items-center gap-2 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={signQr} alt="Scan to approve in Xaman" className="h-44 w-44" />
                <p className="text-xs text-zinc-500">Scan with Xaman to approve the demo transaction.</p>
              </div>
            )}
            {signResult === 'Signing…' && (
              <button
                type="button"
                onClick={onCancelSign}
                className="self-start rounded-xl border border-zinc-200 px-4 py-2 text-sm font-medium transition-colors hover:bg-zinc-100 dark:border-zinc-800 dark:hover:bg-zinc-900"
              >
                Cancel signing
              </button>
            )}
            {signResult && (
              <p className="break-all rounded-lg bg-zinc-50 px-3 py-2 font-mono text-xs text-zinc-600 dark:bg-zinc-950 dark:text-zinc-400">
                {signResult}
              </p>
            )}
          </div>
        )}

        <ConnectModal open={open} onClose={() => setOpen(false)} accentColor="#3052FF" theme="auto" />
      </div>
    </div>
  );
}
