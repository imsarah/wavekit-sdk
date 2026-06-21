import type {
  AdapterEventMap,
  ConnectOptions,
  NetworkType,
  SignedTransaction,
  WalletAccount,
  XRPLWalletAdapter,
} from '@wavekit-sdk/core';

export const XAMAN_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect width="48" height="48" rx="12" fill="#111827"/><path d="M16 16l16 16M32 16L16 32" stroke="#34C6F0" stroke-width="4.6" stroke-linecap="round"/></svg>';

export const TANGEM_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect width="48" height="48" rx="12" fill="#0B0E11"/><circle cx="24" cy="24" r="9" fill="none" stroke="#27E0A6" stroke-width="3.4"/><circle cx="24" cy="24" r="2.6" fill="#27E0A6"/></svg>';

export const GENERIC_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect width="48" height="48" rx="12" fill="#3F3F46"/><path d="M16 24h16M24 16v16" stroke="#fff" stroke-width="3" stroke-linecap="round"/></svg>';

export const LEDGER_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect width="48" height="48" rx="12" fill="#000"/><g fill="#fff"><path d="M14 14h10v3.4h-6.6V24H14V14Z"/><path d="M34 34H24v-3.4h6.6V24H34v10Z"/></g></svg>';

export const WALLETCONNECT_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect width="48" height="48" rx="12" fill="#3B99FC"/><path d="M15.4 19.3c4.75-4.65 12.45-4.65 17.2 0l.58.56a.59.59 0 0 1 0 .85l-1.98 1.94a.31.31 0 0 1-.43 0l-.8-.78c-3.31-3.24-8.69-3.24-12 0l-.86.84a.31.31 0 0 1-.43 0L15.4 20.7a.59.59 0 0 1 0-.85l.58-.56Z" fill="#fff"/></svg>';

export const TREZOR_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect width="48" height="48" rx="12" fill="#fff"/><path d="M24 11c-3.87 0-7 3.13-7 7v2.6h-2.3v11.1L24 36l9.3-4.3V20.6H31V18c0-3.87-3.13-7-7-7Zm-3.8 9.6V18c0-2.1 1.7-3.8 3.8-3.8s3.8 1.7 3.8 3.8v2.6h-7.6Z" fill="#0B0B0B"/></svg>';

/** Build a fake but QR-looking SVG image (data URI) so the demo needs no network. */
export function fakeQrDataUri(seed: string): string {
  const n = 23;
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = (Math.imul(h ^ seed.charCodeAt(i), 16777619) >>> 0);
  const rand = (): number => {
    h = (Math.imul(h, 1103515245) + 12345) >>> 0;
    return h / 0xffffffff;
  };
  let cells = '';
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (rand() > 0.5) cells += `<rect x="${x}" y="${y}" width="1" height="1"/>`;
    }
  }
  // Three "finder" squares like a real QR code.
  const finder = (fx: number, fy: number): string =>
    `<rect x="${fx}" y="${fy}" width="7" height="7" fill="black"/>` +
    `<rect x="${fx + 1}" y="${fy + 1}" width="5" height="5" fill="white"/>` +
    `<rect x="${fx + 2}" y="${fy + 2}" width="3" height="3" fill="black"/>`;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n} ${n}" shape-rendering="crispEdges">` +
    `<rect width="${n}" height="${n}" fill="white"/><g fill="black">${cells}</g>` +
    finder(0, 0) +
    finder(n - 7, 0) +
    finder(0, n - 7) +
    `</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error('aborted'));
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(new Error('aborted'));
      },
      { once: true },
    );
  });
}

export interface MockConfig {
  id: string;
  name: string;
  icon: string;
  /** Which proof-of-connection UI to surface. */
  qr?: 'png' | 'uri';
  /** How long the fake "waiting for approval" takes. */
  delayMs?: number;
  /** If set, the connection fails with this message (to show the error UI). */
  fail?: string;
  address?: string;
  downloadUrl?: string;
}

/**
 * A fully working, offline wallet adapter for the demo. It mimics the real flow —
 * surface a QR / link, wait for "approval", then resolve an account — without any
 * SDKs or API keys.
 */
export function createMockAdapter(cfg: MockConfig): XRPLWalletAdapter {
  const listeners = {
    accountsChanged: new Set<AdapterEventMap['accountsChanged']>(),
    disconnect: new Set<AdapterEventMap['disconnect']>(),
  };

  function emit<E extends keyof AdapterEventMap>(event: E, ...args: Parameters<AdapterEventMap[E]>): void {
    for (const cb of listeners[event]) {
      (cb as (...a: Parameters<AdapterEventMap[E]>) => void)(...args);
    }
  }

  return {
    id: cfg.id,
    name: cfg.name,
    icon: cfg.icon,
    downloadUrl: cfg.downloadUrl ?? 'https://xrpl.org/',

    async connect(options?: ConnectOptions): Promise<WalletAccount> {
      if (cfg.qr === 'png') {
        options?.onAuthRequest?.({ qrPng: fakeQrDataUri(cfg.id), deeplink: 'https://example.com/open' });
      } else if (cfg.qr === 'uri') {
        options?.onAuthRequest?.({
          qrUri: `wc:demo-${cfg.id}-0e1f2a3b@2?relay-protocol=irn&symKey=demo`,
          deeplink: 'https://example.com/open',
        });
      }
      await wait(cfg.delayMs ?? 2200, options?.signal);
      if (cfg.fail) throw new Error(cfg.fail);
      const network: NetworkType = options?.network ?? 'mainnet';
      const account: WalletAccount = {
        address: cfg.address ?? 'rDemoAcctXXXXXXXXXXXXXXXXXXXXXXX',
        network,
      };
      emit('accountsChanged', account);
      return account;
    },

    async disconnect(): Promise<void> {
      emit('disconnect');
    },

    async signTransaction(): Promise<SignedTransaction> {
      await wait(900);
      return { txBlob: 'DEMO_SIGNED_BLOB', hash: 'DEMO0000HASH0000DEMO' };
    },

    on(event, callback) {
      const set = listeners[event] as Set<typeof callback>;
      set.add(callback);
      return () => {
        set.delete(callback);
      };
    },
  };
}
