/** Minimal storage surface — a subset of the Web Storage API. */
export interface WaveKitStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** In-memory fallback used during SSR or when `localStorage` is unavailable. */
export function createMemoryStorage(): WaveKitStorage {
  const map = new Map<string, string>();
  return {
    getItem: (key) => (map.has(key) ? (map.get(key) as string) : null),
    setItem: (key, value) => {
      map.set(key, value);
    },
    removeItem: (key) => {
      map.delete(key);
    },
  };
}

/**
 * Returns `window.localStorage` when it is usable, otherwise an in-memory store.
 * Access is wrapped in try/catch because some browsers throw on `localStorage` in
 * private mode or when storage is disabled — and it must never throw under SSR.
 */
export function getDefaultStorage(): WaveKitStorage {
  try {
    const ls = (globalThis as { localStorage?: WaveKitStorage }).localStorage;
    if (ls) {
      const probe = '__wavekit_probe__';
      ls.setItem(probe, '1');
      ls.removeItem(probe);
      return ls;
    }
  } catch {
    /* fall through to memory storage */
  }
  return createMemoryStorage();
}
