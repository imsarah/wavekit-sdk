/**
 * Optional XRPL JSON-RPC helpers — confirm payments against a real rippled / Clio
 * node. Uses the global `fetch`, so there are **no dependencies**. Runs in Node and
 * in browsers where the endpoint sends CORS headers; otherwise run it from your
 * backend (a watcher polling the ledger is a backend concern anyway).
 */
import type { PaymentRequest } from './payments';
import type { NetworkType } from './types';

/** Public JSON-RPC endpoints per network. Swap in your own for production. */
export const XRPL_RPC: Record<NetworkType, string> = {
  mainnet: 'https://xrplcluster.com/',
  testnet: 'https://s.altnet.rippletest.net:51234/',
  devnet: 'https://s.devnet.rippletest.net:51234/',
};

const RIPPLE_EPOCH = 946_684_800; // seconds between the Unix and Ripple epochs

/* --------------------------------- matching -------------------------------- */

export interface DeliveredToken {
  currency?: string;
  issuer?: string;
  value?: string;
}
export type DeliveredAmount = string | DeliveredToken | undefined;

export interface AccountTxEntry {
  tx?: { TransactionType?: string; Destination?: string; DestinationTag?: number; date?: number };
  tx_json?: { TransactionType?: string; Destination?: string; DestinationTag?: number; date?: number };
  meta?:
    | string
    | { delivered_amount?: DeliveredAmount; DeliveredAmount?: DeliveredAmount; TransactionResult?: string };
  validated?: boolean;
}

function splitDec(v: string): { scaled: bigint; scale: number } {
  const [intPart = '0', fracPart = ''] = v.trim().split('.');
  return { scaled: BigInt(intPart + fracPart), scale: fracPart.length };
}

function decimalGte(a: string, b: string): boolean {
  const pa = splitDec(a);
  const pb = splitDec(b);
  const scale = Math.max(pa.scale, pb.scale);
  return pa.scaled * 10n ** BigInt(scale - pa.scale) >= pb.scaled * 10n ** BigInt(scale - pb.scale);
}

function deliveredCovers(delivered: DeliveredAmount, request: PaymentRequest): boolean {
  try {
    if (request.asset.type === 'XRP') {
      if (typeof delivered !== 'string') return false;
      return BigInt(delivered) >= BigInt(request.amountDrops as string);
    }
    if (!delivered || typeof delivered === 'string') return false;
    if ((delivered.currency ?? '').toUpperCase() !== request.asset.currency.toUpperCase()) return false;
    if (delivered.issuer && delivered.issuer !== request.asset.issuer) return false;
    if (typeof delivered.value !== 'string') return false;
    return decimalGte(delivered.value, request.amountValue);
  } catch {
    return false;
  }
}

/**
 * Pure predicate: does an `account_tx` entry settle `request`? Checks it's a
 * validated, successful Payment to the merchant (and tag), recent enough, that
 * delivers at least the requested amount of the right asset. No network.
 */
export function paymentMatches(
  entry: AccountTxEntry,
  request: PaymentRequest,
  clockSkewMs = 120_000,
): boolean {
  const tx = entry.tx ?? entry.tx_json;
  const meta = entry.meta;
  if (!tx || !meta || typeof meta === 'string') return false;
  if (entry.validated === false) return false;
  if (tx.TransactionType !== 'Payment') return false;
  if (tx.Destination !== request.to) return false;
  if (request.destinationTag != null && tx.DestinationTag !== request.destinationTag) return false;
  if (meta.TransactionResult && meta.TransactionResult !== 'tesSUCCESS') return false;
  if (typeof tx.date === 'number') {
    const txMs = (tx.date + RIPPLE_EPOCH) * 1000;
    if (txMs < request.createdAt - clockSkewMs) return false;
  }
  return deliveredCovers(meta.delivered_amount ?? meta.DeliveredAmount, request);
}

/* ----------------------------------- rpc ----------------------------------- */

interface RpcResult {
  status?: string;
  error?: string;
  error_message?: string;
}

async function rpcCall<T extends RpcResult>(
  rpcUrl: string,
  method: string,
  params: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<T> {
  const res = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ method, params: [params] }),
    signal,
  });
  if (!res.ok) throw new Error(`XRPL RPC ${method}: HTTP ${res.status}`);
  const json = (await res.json()) as { result?: T };
  const result = json.result;
  if (!result) throw new Error(`XRPL RPC ${method}: empty result`);
  if (result.status === 'error') {
    throw new Error(`XRPL RPC ${method}: ${result.error_message ?? result.error ?? 'error'}`);
  }
  return result;
}

export interface XrplServerInfo {
  network: NetworkType | 'unknown';
  ledgerIndex: number;
  serverState: string;
}

function networkFromId(id?: number): NetworkType | 'unknown' {
  if (id === 0) return 'mainnet';
  if (id === 1) return 'testnet';
  if (id === 2) return 'devnet';
  return 'unknown';
}

/** Fetch live server/ledger info — handy as a connectivity check. */
export async function getXrplServerInfo(rpcUrl: string, signal?: AbortSignal): Promise<XrplServerInfo> {
  const result = await rpcCall<
    RpcResult & {
      info?: { validated_ledger?: { seq?: number }; server_state?: string; network_id?: number };
    }
  >(rpcUrl, 'server_info', {}, signal);
  const info = result.info ?? {};
  return {
    network: networkFromId(info.network_id),
    ledgerIndex: info.validated_ledger?.seq ?? 0,
    serverState: info.server_state ?? 'unknown',
  };
}

export interface XrplWatcherOptions {
  /** RPC endpoint. Defaults to {@link XRPL_RPC} for the request's network. */
  rpcUrl?: string;
  /** Poll interval in ms (default 4000). */
  pollMs?: number;
}

function delay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(new Error('aborted'));
      },
      { once: true },
    );
  });
}

/**
 * Build a `usePayment`-compatible watcher that polls the ledger for the merchant
 * account until a matching Payment lands. Honours the AbortSignal.
 *
 * @example
 * const watcher = createXrplPaymentWatcher({ pollMs: 5000 });
 * const { status } = usePayment(request, { watcher });
 */
export function createXrplPaymentWatcher(options: XrplWatcherOptions = {}) {
  return async (request: PaymentRequest, signal: AbortSignal): Promise<void> => {
    const rpcUrl = options.rpcUrl ?? XRPL_RPC[request.network];
    const pollMs = options.pollMs ?? 4000;
    while (!signal.aborted) {
      const result = await rpcCall<RpcResult & { transactions?: AccountTxEntry[] }>(
        rpcUrl,
        'account_tx',
        {
          account: request.to,
          ledger_index_min: -1,
          ledger_index_max: -1,
          binary: false,
          forward: false,
          limit: 20,
        },
        signal,
      );
      for (const entry of result.transactions ?? []) {
        if (paymentMatches(entry, request)) return;
      }
      await delay(pollMs, signal);
    }
    throw new Error('aborted');
  };
}
