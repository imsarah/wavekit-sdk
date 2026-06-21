import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import type { AuthRequest, XRPLWalletAdapter } from '@wavekit-sdk/core';
import { useWallet } from '../hooks';

type View = 'list' | 'pending' | 'error';

export interface ConnectModalProps {
  open: boolean;
  onClose: () => void;
  /** Modal heading shown on the wallet list. */
  title?: string;
  /** Brand / accent color (used for spinners and the primary button). */
  accentColor?: string;
  /** `'dark'` / `'light'` force a theme; `'auto'` (default) follows the `dark` class. */
  theme?: 'light' | 'dark' | 'auto';
  /** Called after a wallet connects successfully (before the modal closes). */
  onConnected?: (adapterId: string) => void;
  /** Plug in a client-side QR renderer (e.g. for WalletConnect URIs). */
  renderQr?: (request: AuthRequest) => ReactNode;
}

const HINTS: Record<string, string> = {
  xaman: 'Scan the QR code with the Xaman app to approve the connection.',
  tangem: 'Open the link in the Tangem app, then tap your Tangem card to your phone.',
};

/**
 * A clean, shadcn/ui-flavoured wallet picker. Renders the configured adapters,
 * drives the per-wallet async connect flow (QR skeleton → QR/deep-link), and
 * surfaces a retryable error state. Pure Tailwind classes — no UI dependency.
 */
export function ConnectModal({
  open,
  onClose,
  title = 'Connect a wallet',
  accentColor = '#3b82f6',
  theme = 'auto',
  onConnected,
  renderQr,
}: ConnectModalProps) {
  const { adapters, connect } = useWallet();
  const [view, setView] = useState<View>('list');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [authRequest, setAuthRequest] = useState<AuthRequest | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => setMounted(true), []);

  const selected = useMemo(
    () => adapters.find((adapter) => adapter.id === selectedId) ?? null,
    [adapters, selectedId],
  );

  const cancelInflight = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  const reset = useCallback(() => {
    cancelInflight();
    setView('list');
    setSelectedId(null);
    setAuthRequest(null);
    setErrorMsg(null);
  }, [cancelInflight]);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  const startConnect = useCallback(
    async (adapter: XRPLWalletAdapter) => {
      cancelInflight();
      const controller = new AbortController();
      abortRef.current = controller;
      setSelectedId(adapter.id);
      setAuthRequest(null);
      setErrorMsg(null);
      setView('pending');
      try {
        await connect(adapter.id, {
          signal: controller.signal,
          onAuthRequest: (req) => {
            if (!controller.signal.aborted) setAuthRequest(req);
          },
        });
        if (controller.signal.aborted) return;
        onConnected?.(adapter.id);
        handleClose();
      } catch (err) {
        if (controller.signal.aborted) return;
        setErrorMsg(err instanceof Error ? err.message : 'Failed to connect');
        setView('error');
      } finally {
        if (abortRef.current === controller) abortRef.current = null;
      }
    },
    [connect, cancelInflight, onConnected, handleClose],
  );

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, handleClose]);

  // Reset transient state whenever the modal is closed.
  useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  if (!open || !mounted) return null;

  const rootStyle = { '--wk-accent': accentColor } as CSSProperties;
  const rootClass = theme === 'dark' ? 'dark' : theme === 'light' ? '' : '';

  const content = (
    <div className={rootClass} style={rootStyle}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="fixed inset-0 z-[9999] flex items-end justify-center p-0 sm:items-center sm:p-4"
      >
        <button
          type="button"
          aria-label="Close"
          onClick={handleClose}
          className="absolute inset-0 cursor-default bg-zinc-950/40 backdrop-blur-sm"
        />
        <div className="relative w-full max-w-sm overflow-hidden rounded-t-2xl border border-zinc-200 bg-white text-zinc-900 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 sm:rounded-2xl">
          <Header
            title={view === 'list' ? title : selected?.name ?? title}
            onBack={view === 'list' ? undefined : reset}
            onClose={handleClose}
          />
          <div className="px-4 pb-2 pt-1">
            {view === 'list' && <WalletList adapters={adapters} onSelect={startConnect} />}
            {view === 'pending' && (
              <PendingView adapter={selected} authRequest={authRequest} renderQr={renderQr} />
            )}
            {view === 'error' && (
              <ErrorView
                adapter={selected}
                message={errorMsg}
                onRetry={() => selected && startConnect(selected)}
                onBack={reset}
              />
            )}
          </div>
          <Footer />
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}

/* --------------------------------- pieces --------------------------------- */

function Header({
  title,
  onBack,
  onClose,
}: {
  title: string;
  onBack?: () => void;
  onClose: () => void;
}) {
  return (
    <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3 dark:border-zinc-900">
      <div className="flex items-center gap-2">
        {onBack && (
          <button
            type="button"
            aria-label="Back"
            onClick={onBack}
            className="-ml-1 rounded-lg p-1 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
          >
            <BackIcon />
          </button>
        )}
        <h2 className="text-base font-semibold tracking-tight">{title}</h2>
      </div>
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="rounded-lg p-1 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
      >
        <CloseIcon />
      </button>
    </div>
  );
}

function WalletList({
  adapters,
  onSelect,
}: {
  adapters: XRPLWalletAdapter[];
  onSelect: (adapter: XRPLWalletAdapter) => void;
}) {
  if (adapters.length === 0) {
    return (
      <p className="px-1 py-8 text-center text-sm text-zinc-500">No wallets configured.</p>
    );
  }
  return (
    <div className="flex flex-col gap-1.5 py-2">
      {adapters.map((adapter) => (
        <WalletRow key={adapter.id} adapter={adapter} onSelect={onSelect} />
      ))}
    </div>
  );
}

function WalletRow({
  adapter,
  onSelect,
}: {
  adapter: XRPLWalletAdapter;
  onSelect: (adapter: XRPLWalletAdapter) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(adapter)}
      className="group flex w-full items-center gap-3 rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-left transition-colors hover:bg-zinc-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900 dark:focus-visible:ring-zinc-700"
    >
      <WalletIcon icon={adapter.icon} />
      <span className="flex-1 text-sm font-medium">{adapter.name}</span>
      <span className="text-zinc-300 transition-transform group-hover:translate-x-0.5 dark:text-zinc-600">
        <ChevronIcon />
      </span>
    </button>
  );
}

function PendingView({
  adapter,
  authRequest,
  renderQr,
}: {
  adapter: XRPLWalletAdapter | null;
  authRequest: AuthRequest | null;
  renderQr?: (request: AuthRequest) => ReactNode;
}) {
  const hint = (adapter && HINTS[adapter.id]) || 'Approve the request in your wallet to continue.';

  return (
    <div className="flex flex-col items-center gap-4 py-4">
      <QrPanel authRequest={authRequest} renderQr={renderQr} />
      <p className="max-w-[18rem] text-center text-sm text-zinc-500">{hint}</p>
      {authRequest?.deeplink && (
        <a
          href={authRequest.deeplink}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-white shadow-sm transition-opacity hover:opacity-90"
          style={{ backgroundColor: 'var(--wk-accent)' }}
        >
          Open {adapter?.name ?? 'wallet'}
        </a>
      )}
      <div className="flex items-center gap-2 text-xs text-zinc-400">
        <Spinner className="h-3.5 w-3.5" />
        Waiting for approval…
      </div>
    </div>
  );
}

function QrPanel({
  authRequest,
  renderQr,
}: {
  authRequest: AuthRequest | null;
  renderQr?: (request: AuthRequest) => ReactNode;
}) {
  if (authRequest && renderQr) {
    return <div className="flex h-52 w-52 items-center justify-center">{renderQr(authRequest)}</div>;
  }
  if (authRequest?.qrPng) {
    return <QrImage src={authRequest.qrPng} />;
  }
  if (authRequest?.qrUri) {
    return <UriPanel uri={authRequest.qrUri} />;
  }
  // No auth request yet — skeleton while the payload is being created.
  return (
    <div className="relative flex h-52 w-52 items-center justify-center overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="absolute inset-0 animate-pulse bg-zinc-100 dark:bg-zinc-900" />
      <Spinner className="relative h-6 w-6" />
    </div>
  );
}

function QrImage({ src }: { src: string }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div className="relative h-52 w-52 overflow-hidden rounded-2xl border border-zinc-200 bg-white p-2 dark:border-zinc-800 dark:bg-white">
      {!loaded && <div className="absolute inset-0 animate-pulse bg-zinc-100 dark:bg-zinc-800" />}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt="Wallet QR code"
        onLoad={() => setLoaded(true)}
        className="h-full w-full object-contain"
        style={{ opacity: loaded ? 1 : 0 }}
      />
    </div>
  );
}

function UriPanel({ uri }: { uri: string }) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(() => {
    void navigator.clipboard?.writeText(uri).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [uri]);

  return (
    <div className="flex h-52 w-52 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-4 text-center dark:border-zinc-700 dark:bg-zinc-900">
      <p className="text-xs text-zinc-500">
        Scan this connection request with your wallet, or copy it.
      </p>
      <code className="line-clamp-3 break-all rounded-lg bg-white px-2 py-1 text-[10px] text-zinc-600 dark:bg-zinc-950 dark:text-zinc-400">
        {uri}
      </code>
      <button
        type="button"
        onClick={copy}
        className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900"
      >
        <CopyIcon />
        {copied ? 'Copied' : 'Copy URI'}
      </button>
    </div>
  );
}

function ErrorView({
  adapter,
  message,
  onRetry,
  onBack,
}: {
  adapter: XRPLWalletAdapter | null;
  message: string | null;
  onRetry: () => void;
  onBack: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-4 py-6">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-500 dark:bg-red-950/40">
        <AlertIcon />
      </div>
      <div className="space-y-1 text-center">
        <p className="text-sm font-semibold">Couldn&apos;t connect</p>
        <p className="max-w-[18rem] text-sm text-zinc-500">
          {message ?? 'Something went wrong. Please try again.'}
        </p>
      </div>
      <div className="flex w-full flex-col gap-2">
        <button
          type="button"
          onClick={onRetry}
          className="w-full rounded-xl px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-opacity hover:opacity-90"
          style={{ backgroundColor: 'var(--wk-accent)' }}
        >
          Try again
        </button>
        <button
          type="button"
          onClick={onBack}
          className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-900"
        >
          Choose another wallet
        </button>
      </div>
      {adapter?.downloadUrl && (
        <a
          href={adapter.downloadUrl}
          target="_blank"
          rel="noreferrer"
          className="text-xs text-zinc-400 underline-offset-4 hover:underline"
        >
          Don&apos;t have {adapter.name}? Get it
        </a>
      )}
    </div>
  );
}

function Footer() {
  return (
    <div className="border-t border-zinc-100 px-4 py-2.5 text-center dark:border-zinc-900">
      <span className="text-[11px] text-zinc-400">
        Powered by <span className="font-medium text-zinc-500">WaveKit</span>
      </span>
    </div>
  );
}

function WalletIcon({ icon }: { icon: string }) {
  const trimmed = icon.trim();
  const className =
    'flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg [&>svg]:h-full [&>svg]:w-full';
  if (trimmed.startsWith('<svg')) {
    return <span className={className} aria-hidden dangerouslySetInnerHTML={{ __html: trimmed }} />;
  }
  if (trimmed.length > 0) {
    return (
      <span className={className}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={icon} alt="" aria-hidden className="h-full w-full object-contain" />
      </span>
    );
  }
  return <span className={`${className} bg-zinc-100 dark:bg-zinc-800`} aria-hidden />;
}

/* ---------------------------------- icons --------------------------------- */

function Spinner({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg
      className={`animate-spin ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      style={{ color: 'var(--wk-accent)' }}
      aria-hidden
    >
      <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path
        className="opacity-90"
        d="M12 2a10 10 0 0 1 10 10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function BackIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="9" y="9" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M5 15V5a2 2 0 0 1 2-2h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
