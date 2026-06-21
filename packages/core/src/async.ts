import { WaveKitAbortError } from './errors';

/**
 * Race a promise against an `AbortSignal`. If the signal fires first the returned
 * promise rejects with {@link WaveKitAbortError}; otherwise it settles with the
 * original promise. The abort listener is always cleaned up.
 */
export function withAbort<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return promise;
  if (signal.aborted) return Promise.reject(new WaveKitAbortError());

  return new Promise<T>((resolve, reject) => {
    const onAbort = (): void => reject(new WaveKitAbortError());
    signal.addEventListener('abort', onAbort, { once: true });
    const cleanup = (): void => signal.removeEventListener('abort', onAbort);
    promise.then(
      (value) => {
        cleanup();
        resolve(value);
      },
      (error: unknown) => {
        cleanup();
        reject(error as Error);
      },
    );
  });
}
