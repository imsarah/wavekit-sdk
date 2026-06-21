import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createWaveKit } from '../src/client';
import { createMemoryStorage } from '../src/storage';
import type {
  AdapterEventMap,
  ConnectOptions,
  SignedTransaction,
  WalletAccount,
  XRPLWalletAdapter,
} from '../src/types';

interface MockOptions {
  id?: string;
  address?: string;
  failConnect?: boolean;
}

type MockAdapter = XRPLWalletAdapter & {
  emitAccountsChanged: (account: WalletAccount) => void;
  emitDisconnect: () => void;
  readonly connectCalls: number;
  readonly disconnectCalls: number;
};

function createMockAdapter(opts: MockOptions = {}): MockAdapter {
  const id = opts.id ?? 'mock';
  const address = opts.address ?? 'rMockAccount';
  const listeners = {
    accountsChanged: new Set<AdapterEventMap['accountsChanged']>(),
    disconnect: new Set<AdapterEventMap['disconnect']>(),
  };
  let connectCalls = 0;
  let disconnectCalls = 0;

  return {
    id,
    name: id,
    icon: '',
    async connect(options?: ConnectOptions): Promise<WalletAccount> {
      connectCalls += 1;
      if (opts.failConnect) throw new Error('connect failed');
      return { address, network: options?.network ?? 'mainnet' };
    },
    async disconnect(): Promise<void> {
      disconnectCalls += 1;
    },
    async signTransaction(): Promise<SignedTransaction> {
      return { txBlob: 'DEADBEEF', hash: 'HASH' };
    },
    on(event, callback) {
      const set = listeners[event] as Set<typeof callback>;
      set.add(callback);
      return () => {
        set.delete(callback);
      };
    },
    emitAccountsChanged(account: WalletAccount) {
      for (const cb of listeners.accountsChanged) cb(account);
    },
    emitDisconnect() {
      for (const cb of listeners.disconnect) cb();
    },
    get connectCalls() {
      return connectCalls;
    },
    get disconnectCalls() {
      return disconnectCalls;
    },
  };
}

test('connect transitions to connected and persists the session', async () => {
  const storage = createMemoryStorage();
  const adapter = createMockAdapter();
  const client = createWaveKit({ adapters: [adapter], storage, autoConnect: false });

  assert.equal(client.getState().status, 'disconnected');
  const account = await client.connect('mock');
  assert.equal(account.address, 'rMockAccount');
  assert.equal(client.getState().status, 'connected');
  assert.equal(client.getState().account?.address, 'rMockAccount');
  assert.ok(storage.getItem('wavekit.session'));
});

test('failed connect surfaces an error and stays disconnected', async () => {
  const adapter = createMockAdapter({ failConnect: true });
  const client = createWaveKit({ adapters: [adapter], storage: createMemoryStorage(), autoConnect: false });

  await assert.rejects(() => client.connect('mock'), /connect failed/);
  assert.equal(client.getState().status, 'disconnected');
  assert.match(client.getState().error?.message ?? '', /connect failed/);
});

test('disconnect clears state and persisted session', async () => {
  const storage = createMemoryStorage();
  const adapter = createMockAdapter();
  const client = createWaveKit({ adapters: [adapter], storage, autoConnect: false });

  await client.connect('mock');
  await client.disconnect();
  assert.equal(client.getState().status, 'disconnected');
  assert.equal(client.getState().account, null);
  assert.equal(storage.getItem('wavekit.session'), null);
  assert.equal(adapter.disconnectCalls, 1);
});

test('autoConnect restores a persisted session optimistically', async () => {
  const storage = createMemoryStorage();
  const adapter1 = createMockAdapter();
  const client1 = createWaveKit({ adapters: [adapter1], storage, autoConnect: true });
  await client1.connect('mock');

  // A fresh client sharing the same storage should restore the session.
  const adapter2 = createMockAdapter();
  const client2 = createWaveKit({ adapters: [adapter2], storage, autoConnect: true });
  assert.equal(client2.getState().status, 'disconnected');
  await client2.autoConnect();
  assert.equal(client2.getState().status, 'connected');
  assert.equal(client2.getState().account?.address, 'rMockAccount');
  // restore is optimistic: it does not re-call the adapter's connect()
  assert.equal(adapter2.connectCalls, 0);
});

test('accountsChanged from the adapter updates client state', async () => {
  const adapter = createMockAdapter();
  const client = createWaveKit({ adapters: [adapter], storage: createMemoryStorage(), autoConnect: false });
  await client.connect('mock');

  adapter.emitAccountsChanged({ address: 'rNewAccount', network: 'testnet' });
  assert.equal(client.getState().account?.address, 'rNewAccount');
  assert.equal(client.getState().network, 'testnet');
});

test('adapter disconnect event resets the client', async () => {
  const adapter = createMockAdapter();
  const client = createWaveKit({ adapters: [adapter], storage: createMemoryStorage(), autoConnect: false });
  await client.connect('mock');

  adapter.emitDisconnect();
  assert.equal(client.getState().status, 'disconnected');
  assert.equal(client.getState().account, null);
});

test('signTransaction requires a connection', async () => {
  const adapter = createMockAdapter();
  const client = createWaveKit({ adapters: [adapter], storage: createMemoryStorage(), autoConnect: false });
  await assert.rejects(() => client.signTransaction({ TransactionType: 'Payment' }), /no wallet is connected/);

  await client.connect('mock');
  const signed = await client.signTransaction({ TransactionType: 'Payment' });
  assert.equal(signed.hash, 'HASH');
});

test('reset clears everything', async () => {
  const storage = createMemoryStorage();
  const adapter = createMockAdapter();
  const client = createWaveKit({ adapters: [adapter], storage, autoConnect: false });
  await client.connect('mock');
  client.reset();
  assert.equal(client.getState().status, 'disconnected');
  assert.equal(storage.getItem('wavekit.session'), null);
});

test('rejects duplicate adapter ids', () => {
  assert.throws(
    () => createWaveKit({ adapters: [createMockAdapter(), createMockAdapter()], autoConnect: false }),
    /duplicate adapter id/,
  );
});
