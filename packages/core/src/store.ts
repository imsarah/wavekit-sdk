import type { Unsubscribe } from './types';

export interface ReadableStore<T> {
  getState(): T;
  subscribe(listener: (state: T) => void): Unsubscribe;
}

export interface Store<T> extends ReadableStore<T> {
  setState(partial: Partial<T> | ((prev: T) => Partial<T>)): void;
  replaceState(next: T): void;
}

/**
 * Tiny observable store. The state object reference only changes when the state
 * actually changes, which makes it safe to plug straight into React's
 * `useSyncExternalStore` (no spurious re-renders, no tearing).
 */
export function createStore<T extends object>(initialState: T): Store<T> {
  let state = initialState;
  const listeners = new Set<(state: T) => void>();

  const getState = (): T => state;

  const notify = (): void => {
    for (const listener of listeners) listener(state);
  };

  const setState: Store<T>['setState'] = (partial): void => {
    const patch = typeof partial === 'function' ? partial(state) : partial;
    let changed = false;
    for (const key in patch) {
      if (!Object.is(state[key as keyof T], (patch as Partial<T>)[key as keyof T])) {
        changed = true;
        break;
      }
    }
    if (!changed) return;
    state = { ...state, ...patch };
    notify();
  };

  const replaceState = (next: T): void => {
    if (Object.is(next, state)) return;
    state = next;
    notify();
  };

  const subscribe = (listener: (state: T) => void): Unsubscribe => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };

  return { getState, subscribe, setState, replaceState };
}
