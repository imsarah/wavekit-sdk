import { NextResponse } from 'next/server';
import { Client } from 'xrpl';

// Create a freshly funded **testnet** account via the faucet, and return its address.
// We only need the address (it's the merchant/receiver); the secret stays server-side.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TESTNET_WSS = 'wss://s.altnet.rippletest.net:51233';

export async function POST() {
  const client = new Client(TESTNET_WSS);
  try {
    await client.connect();
    const { wallet } = await client.fundWallet();
    return NextResponse.json({ address: wallet.address });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'faucet failed' },
      { status: 502 },
    );
  } finally {
    try {
      await client.disconnect();
    } catch {
      /* ignore */
    }
  }
}
