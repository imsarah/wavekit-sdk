/**
 * Ambient declaration for the optional peer dependency the Trezor adapter lazy-loads.
 */
declare module '@trezor/connect' {
  export interface TrezorResponse<T> {
    success: boolean;
    payload: T & { error?: string };
  }
  const TrezorConnect: {
    init(options: Record<string, unknown>): Promise<unknown>;
    rippleGetAddress(params: { path: string; showOnTrezor?: boolean }): Promise<
      TrezorResponse<{ address?: string }>
    >;
    rippleSignTransaction(params: { path: string; transaction: unknown }): Promise<
      TrezorResponse<{ serializedTx?: string; signature?: string }>
    >;
  };
  export default TrezorConnect;
}
