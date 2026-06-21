/**
 * Minimal ambient declaration for the `xumm` SDK.
 *
 * `xumm` is an **optional peer dependency**: the adapter lazy-loads it via
 * `import('xumm')` only when needed, so apps that don't use Xaman never pay for it.
 * We declare just the slice of the SDK surface the adapter touches, which keeps this
 * package type-checking without the heavy SDK installed.
 */
declare module 'xumm' {
  export interface XummPayloadRefs {
    qr_png: string;
    websocket_status?: string;
  }

  export interface XummPayloadNext {
    always: string;
  }

  export interface XummCreatedPayload {
    uuid: string;
    refs: XummPayloadRefs;
    next: XummPayloadNext;
  }

  export interface XummPayloadEventData {
    signed?: boolean;
    payload_uuidv4?: string;
    [key: string]: unknown;
  }

  export interface XummPayloadSubscription {
    created: XummCreatedPayload;
    resolved: Promise<XummPayloadEventData>;
    websocket?: { close(): void };
  }

  export interface XummPayloadResponse {
    account?: string;
    txid?: string;
    hex?: string;
    [key: string]: unknown;
  }

  export interface XummPayloadResult {
    response: XummPayloadResponse;
  }

  export interface XummPayloadApi {
    createAndSubscribe(
      payload: Record<string, unknown>,
      callback: (event: { data: XummPayloadEventData }) => unknown,
    ): Promise<XummPayloadSubscription>;
    get(uuid: string): Promise<XummPayloadResult | null>;
  }

  export class Xumm {
    constructor(apiKey: string, apiSecret?: string);
    payload?: XummPayloadApi;
    logout?(): Promise<void>;
  }

  export default Xumm;
}
