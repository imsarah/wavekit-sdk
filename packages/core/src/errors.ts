/** Base class for all errors thrown by WaveKit, so consumers can `instanceof` them. */
export class WaveKitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WaveKitError';
  }
}

/** Thrown when an in-flight connect/sign is aborted (e.g. the user closed the modal). */
export class WaveKitAbortError extends WaveKitError {
  constructor(message = 'Operation aborted') {
    super(message);
    this.name = 'WaveKitAbortError';
  }
}

/** Normalize any thrown value into an `Error`. */
export function toError(err: unknown): Error {
  if (err instanceof Error) return err;
  if (typeof err === 'string') return new Error(err);
  try {
    return new Error(JSON.stringify(err));
  } catch {
    return new Error('Unknown error');
  }
}

/** True if the given value represents an aborted operation. */
export function isAbortError(err: unknown): boolean {
  return (
    err instanceof WaveKitAbortError ||
    (typeof err === 'object' && err !== null && (err as { name?: string }).name === 'AbortError')
  );
}
