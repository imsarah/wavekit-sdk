import { useCallback, useEffect, useRef, useState } from 'react';
import type { PaymentRequest, PaymentStatus } from '@wavekit-sdk/core';

export interface UsePaymentOptions {
  /**
   * Resolves when the payment is detected on-ledger (you implement the polling —
   * e.g. watch the merchant account for an incoming Payment), and rejects on
   * failure. When provided and `autoWatch` is true, the hook flips to
   * `'paid'` / `'error'` automatically. Honour the `signal` to stop polling.
   */
  watcher?: (request: PaymentRequest, signal: AbortSignal) => Promise<void>;
  /** Start watching automatically on mount / when the request changes. Default `true`. */
  autoWatch?: boolean;
  /** Called once when the payment becomes `'paid'`. */
  onPaid?: (request: PaymentRequest) => void;
}

export interface UsePaymentResult {
  status: PaymentStatus;
  /** Begin (or restart) watching. No-op when no `watcher` is configured. */
  start: () => void;
  /** Manually mark the payment as received. */
  markPaid: () => void;
  /** Reset back to `'pending'` and restart watching if `autoWatch` is on. */
  reset: () => void;
}

/**
 * Drive a {@link PaymentRequest} through its lifecycle for a `<Checkout />`.
 *
 * The hook is transport-agnostic: pass a `watcher` that resolves once you detect the
 * payment (poll the ledger, listen to a webhook via SSE, etc.). It also flips to
 * `'expired'` automatically when the request's `expiresAt` passes.
 *
 * Keep `request` stable (e.g. `useMemo`) so watching isn't restarted every render.
 */
export function usePayment(request: PaymentRequest, options: UsePaymentOptions = {}): UsePaymentResult {
  const { watcher, autoWatch = true, onPaid } = options;
  const [status, setStatus] = useState<PaymentStatus>('pending');

  const onPaidRef = useRef(onPaid);
  onPaidRef.current = onPaid;
  const abortRef = useRef<AbortController | null>(null);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  const markPaid = useCallback(() => {
    stop();
    setStatus('paid');
    onPaidRef.current?.(request);
  }, [request, stop]);

  const start = useCallback(() => {
    if (!watcher) return;
    stop();
    const controller = new AbortController();
    abortRef.current = controller;
    setStatus('pending');
    watcher(request, controller.signal)
      .then(() => {
        if (controller.signal.aborted) return;
        setStatus('paid');
        onPaidRef.current?.(request);
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setStatus('error');
      });
  }, [watcher, request, stop]);

  const reset = useCallback(() => {
    setStatus('pending');
    if (watcher && autoWatch) start();
    else stop();
  }, [watcher, autoWatch, start, stop]);

  // (Re)start watching when the request changes.
  useEffect(() => {
    setStatus('pending');
    if (watcher && autoWatch) start();
    return () => stop();
  }, [request, watcher, autoWatch, start, stop]);

  // Flip to 'expired' when the deadline passes (unless already paid).
  useEffect(() => {
    if (request.expiresAt == null) return;
    const ms = request.expiresAt - Date.now();
    const expire = (): void => setStatus((s) => (s === 'paid' ? s : 'expired'));
    if (ms <= 0) {
      expire();
      return;
    }
    const timer = setTimeout(expire, ms);
    return () => clearTimeout(timer);
  }, [request]);

  return { status, start, markPaid, reset };
}
