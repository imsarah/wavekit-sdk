import { NextResponse } from 'next/server';
import { xrpToDrops } from '@wavekit-sdk/core';
import { Client, type Payment } from 'xrpl';

// Demo-only: spin up a second funded testnet account and send a REAL payment to the
// invoice address (with the destination tag, so the watcher matches it and not the
// faucet funding). This is what makes the receive demo self-driving on testnet.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TESTNET_WSS = 'wss://s.altnet.rippletest.net:51233';

export async function POST(req: Request) {
  let to = '';
  let amountXrp = '5';
  let destinationTag: number | undefined;
  try {
    const body = (await req.json()) as { to?: string; amountXrp?: string; destinationTag?: number };
    to = String(body.to ?? '');
    if (body.amountXrp) amountXrp = String(body.amountXrp);
    if (typeof body.destinationTag === 'number') destinationTag = body.destinationTag;
  } catch {
    /* fall through to validation */
  }
  if (!to) return NextResponse.json({ error: 'missing `to`' }, { status: 400 });

  const client = new Client(TESTNET_WSS);
  try {
    await client.connect();
    const { wallet: payer } = await client.fundWallet();
    const tx: Payment = {
      TransactionType: 'Payment',
      Account: payer.address,
      Destination: to,
      Amount: xrpToDrops(amountXrp),
      ...(destinationTag != null ? { DestinationTag: destinationTag } : {}),
    };
    const prepared = await client.autofill(tx);
    const signed = payer.sign(prepared);
    const res = await client.submitAndWait(signed.tx_blob);
    const meta = res.result.meta;
    const code = typeof meta === 'object' && meta ? meta.TransactionResult : undefined;
    return NextResponse.json({ hash: signed.hash, payer: payer.address, result: code });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'payment failed' }, { status: 502 });
  } finally {
    try {
      await client.disconnect();
    } catch {
      /* ignore */
    }
  }
}
