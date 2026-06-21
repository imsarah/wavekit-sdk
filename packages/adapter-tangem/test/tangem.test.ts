import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { AuthRequest } from '@wavekit-sdk/core';
import { tangemAdapter, type SignClientLike } from '../src/index';

function createMockSignClient(opts: {
  result?: Record<string, unknown>;
  account?: string;
  onConnect?: (params: Record<string, unknown>) => void;
  onRequest?: (args: { chainId: string; request: { method: string; params: unknown } }) => void;
}): SignClientLike {
  return {
    async connect(params) {
      opts.onConnect?.(params);
      return {
        uri: 'wc:1234@2?relay-protocol=irn',
        approval: async () => ({
          topic: 'topic-1',
          namespaces: { xrpl: { accounts: [`xrpl:1:${opts.account ?? 'rTangem'}`] } },
        }),
      };
    },
    async request(args) {
      opts.onRequest?.(args);
      return (opts.result ?? {}) as never;
    },
    async disconnect() {},
    on() {},
  };
}

test('connect parses the account and surfaces the WalletConnect uri', async () => {
  const requests: AuthRequest[] = [];
  let connectParams: Record<string, any> = {};
  const adapter = tangemAdapter({
    client: createMockSignClient({
      account: 'rTangemAcct',
      onConnect: (p) => {
        connectParams = p;
      },
    }),
  });

  const account = await adapter.connect({ onAuthRequest: (r) => requests.push(r) });
  assert.equal(account.address, 'rTangemAcct');
  assert.equal(account.network, 'mainnet');
  assert.equal(requests[0]?.qrUri, 'wc:1234@2?relay-protocol=irn');
  // mainnet -> xrpl:1 (WaveKit spec mapping)
  assert.deepEqual(connectParams.requiredNamespaces.xrpl.chains, ['xrpl:1']);
});

test('uses the spec chain mapping for testnet (xrpl:2)', async () => {
  let connectParams: Record<string, any> = {};
  const adapter = tangemAdapter({
    client: createMockSignClient({
      onConnect: (p) => {
        connectParams = p;
      },
    }),
  });
  await adapter.connect({ network: 'testnet' });
  assert.deepEqual(connectParams.requiredNamespaces.xrpl.chains, ['xrpl:2']);
});

test('signTransaction normalizes drops and returns the wallet blob+hash', async () => {
  let req: Record<string, any> = {};
  const adapter = tangemAdapter({
    client: createMockSignClient({
      account: 'rT',
      result: { tx_blob: 'BLOB', hash: 'HASH' },
      onRequest: (a) => {
        req = a;
      },
    }),
  });

  await adapter.connect();
  const signed = await adapter.signTransaction({ TransactionType: 'Payment', Amount: { xrp: '2' } });
  assert.equal(signed.txBlob, 'BLOB');
  assert.equal(signed.hash, 'HASH');
  assert.equal(req.request.params.tx_json.Amount, '2000000');
  assert.equal(req.chainId, 'xrpl:1');
});

test('signTransaction throws before connecting', async () => {
  const adapter = tangemAdapter({ client: createMockSignClient({}) });
  await assert.rejects(() => adapter.signTransaction({ TransactionType: 'Payment' }), /not connected/);
});

test('requires walletConnectProjectId when no client is injected', async () => {
  const adapter = tangemAdapter({});
  await assert.rejects(() => adapter.connect(), /walletConnectProjectId/);
});
