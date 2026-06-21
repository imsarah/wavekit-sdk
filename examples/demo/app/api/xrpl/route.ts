import { NextResponse } from 'next/server';

// A thin same-origin proxy for XRPL JSON-RPC, so the browser can talk to the ledger
// without hitting CORS. The client posts a normal rippled JSON-RPC body; we forward
// it to the public node for the chosen network. This is also a fine production
// template (swap in your own node / add caching + rate limiting).
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const RPC: Record<string, string> = {
  mainnet: 'https://xrplcluster.com/',
  testnet: 'https://s.altnet.rippletest.net:51234/',
  devnet: 'https://s.devnet.rippletest.net:51234/',
};

export async function POST(req: Request) {
  const network = new URL(req.url).searchParams.get('network') ?? 'testnet';
  const upstream = RPC[network] ?? RPC.testnet;
  const body = await req.text();
  try {
    const res = await fetch(upstream, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
    });
    const text = await res.text();
    return new NextResponse(text, {
      status: res.status,
      headers: { 'content-type': 'application/json' },
    });
  } catch (e) {
    return NextResponse.json(
      {
        result: {
          status: 'error',
          error: 'proxy_failed',
          error_message: e instanceof Error ? e.message : 'upstream unreachable',
        },
      },
      { status: 502 },
    );
  }
}
