/**
 * @wavekit-sdk/react — React provider, hooks and UI for WaveKit.
 */
export { WaveKitProvider, useWaveKit, WaveKitContext } from './context';
export type { WaveKitProviderProps } from './context';

export {
  useWallet,
  useWaveKitState,
  useWaveKitAnalytics,
  useWaveKitSwap,
} from './hooks';
export type {
  UseWalletResult,
  WalletUsageStats,
  SwapFeeBreakdown,
  UseWaveKitSwapResult,
} from './hooks';

export { ConnectModal } from './components/ConnectModal';
export type { ConnectModalProps } from './components/ConnectModal';

export { Checkout } from './components/Checkout';
export type { CheckoutProps } from './components/Checkout';

export { usePayment } from './usePayment';
export type { UsePaymentOptions, UsePaymentResult } from './usePayment';

// Re-export the payment + XRPL helpers so apps can build everything from one package.
export {
  createPaymentRequest,
  buildPaymentTransaction,
  buildFeePaymentForRequest,
  isPaymentExpired,
  paymentAmount,
  currencySymbol,
  rlusd,
  RLUSD_CURRENCY,
  RLUSD_ISSUER_MAINNET,
  XRP_ASSET,
  createXrplPaymentWatcher,
  getXrplServerInfo,
  paymentMatches,
  XRPL_RPC,
} from '@wavekit-sdk/core';

// Re-export the most-used core types for convenience.
export type {
  NetworkType,
  WalletAccount,
  SignedTransaction,
  XRPLWalletAdapter,
  WaveKitClient,
  WaveKitState,
  AuthRequest,
  PaymentRequest,
  PaymentStatus,
  PaymentFee,
  PaymentAmountInput,
  CreatePaymentRequestInput,
  TokenAsset,
  PaymentAsset,
  XrplServerInfo,
  XrplWatcherOptions,
  AccountTxEntry,
} from '@wavekit-sdk/core';
