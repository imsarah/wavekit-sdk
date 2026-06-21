import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { AuthRequest } from '@wavekit-sdk/core';
import { xamanAdapter, type XummClientLike } from '../src/index';

function createMockXumm(opts: {
  account?: string;
  signed?: boolean;
  response?: { account?: string; txid?: string; hex?: string };
  onPayload?: (txjson: Record<string, unknown>) => void;
}): XummClientLike {
  return {
    payload: {
      async createAndSubscribe(payload, _callback) {
        opts.onPayload?.((payload as { txjson: Record<string, unknown> }).txjson);
        return {
          created: {
            uuid: 'uuid-1',
            refs: { qr_png: 'https://xaman/qr.png' },
            next: { always: 'https://xaman/deeplink' },
          },
          resolved: Promise.resolve(
            opts.signed === false ? { signed: false } : { signed: true, payload_uuidv4: 'uuid-1' },
          ),
          websocket: { close() {} },
        };
      },
      async get(_uuid) {
        return { response: opts.response ?? { account: opts.account ?? 'rXaman' } };
      },
    },
    async logout() {},
  };
}

test('connect returns the account and surfaces a QR + deep link', async () => {
  const requests: AuthRequest[] = [];
  const adapter = xamanAdapter({ sdk: createMockXumm({ account: 'rXamanAcct' }) });
  const account = await adapter.connect({ onAuthRequest: (r) => requests.push(r) });

  assert.equal(account.address, 'rXamanAcct');
  assert.equal(account.network, 'mainnet');
  assert.equal(requests.length, 1);
  assert.equal(requests[0]?.qrPng, 'https://xaman/qr.png');
  assert.equal(requests[0]?.deeplink, 'https://xaman/deeplink');
});

test('signTransaction normalizes XRP amounts to drops and returns blob+hash', async () => {
  let sent: Record<string, unknown> | undefined = undefined;
  const adapter = xamanAdapter({
    sdk: createMockXumm({
      response: { hex: 'AABB', txid: 'HASH1' },
      onPayload: (tx) => {
        sent = tx;
      },
    }),
  });

  const signed = await adapter.signTransaction({ TransactionType: 'Payment', Amount: { xrp: '1' } });
  assert.equal(signed.txBlob, 'AABB');
  assert.equal(signed.hash, 'HASH1');
  assert.equal((sent as Record<string, unknown> | undefined)?.Amount, '1000000');
});

test('connect rejects when the user declines in Xaman', async () => {
  const adapter = xamanAdapter({ sdk: createMockXumm({ signed: false }) });
  await assert.rejects(() => adapter.connect(), /rejected in Xaman/);
});

test('emits accountsChanged on connect and disconnect on disconnect()', async () => {
  const adapter = xamanAdapter({ sdk: createMockXumm({ account: 'rA' }) });
  const seen: string[] = [];
  let disconnected = false;
  const offAcc = adapter.on('accountsChanged', (a) => seen.push(a.address));
  adapter.on('disconnect', () => {
    disconnected = true;
  });

  await adapter.connect();
  await adapter.disconnect();
  assert.deepEqual(seen, ['rA']);
  assert.equal(disconnected, true);

  // unsubscribe works
  offAcc();
  await adapter.connect();
  assert.deepEqual(seen, ['rA']);
});

test('requires apiKey when no sdk is injected', async () => {
  const adapter = xamanAdapter({});
  await assert.rejects(() => adapter.connect(), /apiKey/);
});
