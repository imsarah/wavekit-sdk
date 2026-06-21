import { useCallback, useState, type CSSProperties, type ReactNode } from 'react';
import type { PaymentRequest, PaymentStatus } from '@wavekit-sdk/core';

export interface CheckoutProps {
  /** The payment request to collect (build it with `createPaymentRequest`). */
  request: PaymentRequest;
  /** Lifecycle status. Drive it with `usePayment()`. Defaults to `'pending'`. */
  status?: PaymentStatus;
  /** Heading shown on the card. */
  title?: string;
  /** Brand / accent color (buttons, spinner). */
  accentColor?: string;
  /** Force a theme; `'auto'` (default) follows the `dark` class. */
  theme?: 'light' | 'dark' | 'auto';
  /** Render a QR for `request.uri` (e.g. via a QR library). Falls back to a copy box. */
  renderQr?: (uri: string) => ReactNode;
  /** Primary action — e.g. open the connected wallet to pay. */
  onPay?: () => void;
  /** Secondary action — e.g. cancel / start over. */
  onCancel?: () => void;
  /** Message shown in the `'error'` status. */
  errorMessage?: string;
}

/**
 * A drop-in "Pay with XRP" checkout card. Presentational and fully controlled — pair
 * it with {@link usePayment} (or your own state) to drive `status`. Pure Tailwind, so
 * it matches the ConnectModal and needs no UI dependency.
 */
export function Checkout({
  request,
  status = 'pending',
  title = 'Pay with XRP',
  accentColor = '#3b82f6',
  theme = 'auto',
  renderQr,
  onPay,
  onCancel,
  errorMessage,
}: CheckoutProps) {
  const rootStyle = { '--wk-accent': accentColor } as CSSProperties;
  const rootClass = theme === 'dark' ? 'dark' : '';

  return (
    <div className={rootClass} style={rootStyle}>
      <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-zinc-200 bg-white text-zinc-900 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50">
        <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3 dark:border-zinc-900">
          <h2 className="text-base font-semibold tracking-tight">{title}</h2>
          <StatusBadge status={status} />
        </div>

        <div className="px-4 py-4">
          {status === 'paid' ? (
            <PaidView request={request} onDone={onCancel} />
          ) : status === 'expired' ? (
            <ExpiredView onRetry={onCancel} />
          ) : status === 'error' ? (
            <ErrorView message={errorMessage} onRetry={onPay} onCancel={onCancel} />
          ) : (
            <PendingView
              request={request}
              renderQr={renderQr}
              onPay={onPay}
              onCancel={onCancel}
            />
          )}
        </div>

        <Footer />
      </div>
    </div>
  );
}

/* --------------------------------- pieces --------------------------------- */

function PendingView({
  request,
  renderQr,
  onPay,
  onCancel,
}: {
  request: PaymentRequest;
  renderQr?: (uri: string) => ReactNode;
  onPay?: () => void;
  onCancel?: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-4">
      <AmountSummary request={request} />
      <QrPanel uri={request.uri} renderQr={renderQr} />
      <div className="flex items-center gap-2 text-xs text-zinc-400">
        <Spinner className="h-3.5 w-3.5" />
        Waiting for payment…
      </div>
      <div className="flex w-full flex-col gap-2">
        {onPay && (
          <button
            type="button"
            onClick={onPay}
            className="w-full rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
            style={{ backgroundColor: 'var(--wk-accent)' }}
          >
            Pay with wallet
          </button>
        )}
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-900"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}

function AmountSummary({ request }: { request: PaymentRequest }) {
  return (
    <div className="w-full rounded-xl bg-zinc-50 p-4 dark:bg-zinc-900">
      {request.label && (
        <p className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-200">{request.label}</p>
      )}
      <Row label="Amount" value={`${request.amountValue} ${request.symbol}`} />
      {request.fee && (
        <Row
          label={`Fee (${(request.fee.bps / 100).toString()}%)`}
          value={`${request.fee.value} ${request.symbol}`}
          muted
        />
      )}
      <div className="my-2 border-t border-zinc-200 dark:border-zinc-800" />
      <Row label="Total" value={`${request.totalValue} ${request.symbol}`} strong />
      <p className="mt-3 truncate text-xs text-zinc-400">
        To {truncate(request.to)}
        {request.destinationTag != null ? ` · tag ${request.destinationTag}` : ''} · {request.network}
      </p>
    </div>
  );
}

function Row({
  label,
  value,
  muted,
  strong,
}: {
  label: string;
  value: string;
  muted?: boolean;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className={`text-sm ${muted ? 'text-zinc-400' : 'text-zinc-500'}`}>{label}</span>
      <span
        className={
          strong ? 'text-sm font-semibold' : muted ? 'text-sm text-zinc-400' : 'text-sm font-medium'
        }
      >
        {value}
      </span>
    </div>
  );
}

function QrPanel({ uri, renderQr }: { uri: string; renderQr?: (uri: string) => ReactNode }) {
  if (renderQr) {
    return <div className="flex h-48 w-48 items-center justify-center">{renderQr(uri)}</div>;
  }
  return <UriPanel uri={uri} />;
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
    <div className="flex h-48 w-48 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-4 text-center dark:border-zinc-700 dark:bg-zinc-900">
      <p className="text-xs text-zinc-500">Scan to pay, or copy the payment link.</p>
      <code className="line-clamp-3 break-all rounded-lg bg-white px-2 py-1 text-[10px] text-zinc-600 dark:bg-zinc-950 dark:text-zinc-400">
        {uri}
      </code>
      <button
        type="button"
        onClick={copy}
        className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900"
      >
        <CopyIcon />
        {copied ? 'Copied' : 'Copy link'}
      </button>
    </div>
  );
}

function PaidView({ request, onDone }: { request: PaymentRequest; onDone?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 py-2">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-500 dark:bg-emerald-950/40">
        <CheckIcon />
      </div>
      <div className="space-y-1 text-center">
        <p className="text-sm font-semibold">Payment received</p>
        <p className="text-sm text-zinc-500">
          {request.totalValue} {request.symbol} paid successfully.
        </p>
      </div>
      {onDone && (
        <button
          type="button"
          onClick={onDone}
          className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-900"
        >
          Done
        </button>
      )}
    </div>
  );
}

function ExpiredView({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 py-4">
      <p className="text-sm font-semibold">Payment request expired</p>
      <p className="max-w-[18rem] text-center text-sm text-zinc-500">
        This request is no longer valid. Start a new one to try again.
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="w-full rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
          style={{ backgroundColor: 'var(--wk-accent)' }}
        >
          Start over
        </button>
      )}
    </div>
  );
}

function ErrorView({
  message,
  onRetry,
  onCancel,
}: {
  message?: string;
  onRetry?: () => void;
  onCancel?: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-4 py-4">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-500 dark:bg-red-950/40">
        <AlertIcon />
      </div>
      <div className="space-y-1 text-center">
        <p className="text-sm font-semibold">Payment failed</p>
        <p className="max-w-[18rem] text-sm text-zinc-500">
          {message ?? 'Something went wrong. Please try again.'}
        </p>
      </div>
      <div className="flex w-full flex-col gap-2">
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="w-full rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
            style={{ backgroundColor: 'var(--wk-accent)' }}
          >
            Try again
          </button>
        )}
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-900"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: PaymentStatus }) {
  const map: Record<PaymentStatus, { label: string; className: string }> = {
    pending: {
      label: 'Pending',
      className: 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-300',
    },
    paid: {
      label: 'Paid',
      className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
    },
    expired: {
      label: 'Expired',
      className: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
    },
    error: { label: 'Error', className: 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300' },
  };
  const { label, className } = map[status];
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}>{label}</span>;
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

function truncate(addr: string): string {
  return addr.length > 14 ? `${addr.slice(0, 8)}…${addr.slice(-4)}` : addr;
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

function CheckIcon() {
  return (
    <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
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
