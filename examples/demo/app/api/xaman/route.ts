import { NextResponse } from 'next/server';

// Runs on the server so the Xaman API SECRET never reaches the browser.
export const runtime = 'nodejs';

const API_KEY = process.env.NEXT_PUBLIC_XAMAN_API_KEY;
const API_SECRET = process.env.XAMAN_API_SECRET;

async function getSdk() {
  if (!API_KEY || !API_SECRET) return null;
  const { XummSdk } = await import('xumm-sdk');
  return new XummSdk(API_KEY, API_SECRET);
}

const NOT_CONFIGURED =
  'Xaman QR mode needs NEXT_PUBLIC_XAMAN_API_KEY + XAMAN_API_SECRET (server-side) in examples/demo/.env.local';

/** Create a Xaman payload (default: a SignIn) and return its QR + uuid. */
export async function POST(req: Request) {
  const sdk = await getSdk();
  if (!sdk) return NextResponse.json({ error: NOT_CONFIGURED }, { status: 400 });

  const body = (await req.json().catch(() => ({}))) as {
    txjson?: Record<string, unknown>;
    options?: Record<string, unknown>;
  };
  const txjson = body.txjson ?? { TransactionType: 'SignIn' };

  try {
    const created = await sdk.payload.create(
      { txjson, options: body.options } as Parameters<typeof sdk.payload.create>[0],
    );
    if (!created) return NextResponse.json({ error: 'Failed to create payload' }, { status: 502 });
    return NextResponse.json({
      uuid: created.uuid,
      qr_png: created.refs.qr_png,
      next: created.next.always,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Xaman payload error' },
      { status: 502 },
    );
  }
}

/** Poll a payload's status: returns `signed` (bool) once resolved, plus the result. */
export async function GET(req: Request) {
  const sdk = await getSdk();
  if (!sdk) return NextResponse.json({ error: NOT_CONFIGURED }, { status: 400 });

  const uuid = new URL(req.url).searchParams.get('uuid');
  if (!uuid) return NextResponse.json({ error: 'uuid required' }, { status: 400 });

  try {
    const p = await sdk.payload.get(uuid);
    if (!p) return NextResponse.json({ error: 'not found' }, { status: 404 });
    return NextResponse.json({
      resolved: p.meta.resolved,
      signed: p.meta.signed,
      expired: p.meta.expired,
      cancelled: p.meta.cancelled,
      account: p.response.account,
      txid: p.response.txid,
      hex: p.response.hex,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Xaman status error' },
      { status: 502 },
    );
  }
}
