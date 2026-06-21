import type { XummClientLike } from '@wavekit-sdk/adapter-xaman';

/**
 * A browser-side "Xumm SDK" shim for the **QR-in-our-own-modal** flow.
 *
 * Instead of running the Xaman SDK with a secret in the browser (impossible/unsafe),
 * it creates the payload via the demo's server route (`/api/xaman`, which holds the
 * API secret), surfaces the returned `qr_png` through WaveKit's `onAuthRequest`, and
 * resolves by polling the route until the payload is signed or rejected.
 *
 * Injected into `xamanAdapter({ sdk })` so the existing adapter renders our own QR.
 */
export function backendXummSdk(): XummClientLike {
  return {
    payload: {
      async createAndSubscribe(payload, callback) {
        const p = payload as {
          txjson?: Record<string, unknown>;
          options?: Record<string, unknown>;
        };
        const txjson = p.txjson ?? payload;

        const res = await fetch('/api/xaman', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ txjson, options: p.options }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? 'Failed to create Xaman payload');
        const uuid: string = data.uuid;

        let stopped = false;
        const resolved = (async () => {
          // Poll until the user resolves the payload (signs/rejects) or it expires.
          // NOTE: meta.signed is `false` while still PENDING, so we must wait for
          // meta.resolved (or expiry) — not just for `signed` to be a boolean.
          for (;;) {
            if (stopped) return { signed: false, payload_uuidv4: uuid };
            await new Promise((r) => setTimeout(r, 2500));
            if (stopped) return { signed: false, payload_uuidv4: uuid };
            const sr = await fetch(`/api/xaman?uuid=${encodeURIComponent(uuid)}`);
            const s = await sr.json().catch(() => ({}));
            if (!sr.ok) continue;
            if (s.expired) {
              callback({ data: { signed: false, payload_uuidv4: uuid } });
              return { signed: false, payload_uuidv4: uuid };
            }
            if (s.resolved === true) {
              callback({ data: { signed: Boolean(s.signed), payload_uuidv4: uuid } });
              return { signed: Boolean(s.signed), payload_uuidv4: uuid };
            }
          }
        })();

        return {
          created: { uuid, refs: { qr_png: data.qr_png }, next: { always: data.next } },
          resolved,
          // Called by the adapter when the sign is aborted — stops the poll loop.
          websocket: {
            close() {
              stopped = true;
            },
          },
        };
      },
      async get(uuid: string) {
        const res = await fetch(`/api/xaman?uuid=${encodeURIComponent(uuid)}`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) return null;
        return { response: { account: data.account, txid: data.txid, hex: data.hex } };
      },
    },
  };
}
