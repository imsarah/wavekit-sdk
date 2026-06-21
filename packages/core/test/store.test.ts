import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createStore } from '../src/store';

test('notifies subscribers on change and returns stable refs otherwise', () => {
  const store = createStore({ a: 1, b: 'x' });
  let calls = 0;
  const unsub = store.subscribe(() => {
    calls += 1;
  });

  const first = store.getState();
  store.setState({ a: 1 }); // no change -> no notify, same ref
  assert.equal(calls, 0);
  assert.equal(store.getState(), first);

  store.setState({ a: 2 });
  assert.equal(calls, 1);
  assert.equal(store.getState().a, 2);
  assert.notEqual(store.getState(), first);

  unsub();
  store.setState({ a: 3 });
  assert.equal(calls, 1); // no longer subscribed
});

test('supports updater functions and replaceState', () => {
  const store = createStore({ count: 0 });
  store.setState((prev) => ({ count: prev.count + 1 }));
  assert.equal(store.getState().count, 1);

  store.replaceState({ count: 99 });
  assert.equal(store.getState().count, 99);
});
