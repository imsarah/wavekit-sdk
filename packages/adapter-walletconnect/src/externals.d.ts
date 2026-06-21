/**
 * Ambient declarations for the optional peer dependencies this adapter lazy-loads:
 * `@walletconnect/sign-client` (always) and `ripple-binary-codec` (only when the wallet
 * returns a signed `tx_json` that still needs to be serialized locally).
 */
declare module '@walletconnect/sign-client' {
  export interface SessionNamespace {
    accounts: string[];
    methods: string[];
    events: string[];
  }
  export interface SessionStruct {
    topic: string;
    namespaces: Record<string, SessionNamespace>;
  }
  export interface ConnectResult {
    uri?: string;
    approval: () => Promise<SessionStruct>;
  }
  export interface SignClientInstance {
    connect(params: Record<string, unknown>): Promise<ConnectResult>;
    request<T = unknown>(args: {
      topic: string;
      chainId: string;
      request: { method: string; params: unknown };
    }): Promise<T>;
    disconnect(args: { topic: string; reason: { code: number; message: string } }): Promise<void>;
    on(event: string, callback: (...args: unknown[]) => void): void;
  }
  export const SignClient: {
    init(opts: {
      projectId: string;
      metadata?: Record<string, unknown>;
      relayUrl?: string;
    }): Promise<SignClientInstance>;
  };
  export default SignClient;
}

declare module 'ripple-binary-codec' {
  export function encode(txJson: Record<string, unknown>): string;
  export function decode(blob: string): Record<string, unknown>;
}
