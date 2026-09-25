/**
 * HYPERON-DEX Enterprise Web3 Wallet Architecture Types
 * Strictly enforces EIP-1193, EIP-6963, EIP-4361 (SIWE), and Real WalletConnect v2 semantics.
 */

import { ChainId } from '../../types';

export type WalletLifecycleState =
  | 'DISCONNECTED'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'RECONNECTING'
  | 'CHAIN_SWITCHING'
  | 'WRONG_CHAIN'
  | 'ERROR';

export type SupportedWalletType =
  | 'metamask'
  | 'coinbase'
  | 'rabby'
  | 'phantom'
  | 'okx'
  | 'trust'
  | 'rainbow'
  | 'bitget'
  | 'zerion'
  | 'brave'
  | 'safe'
  | 'binance'
  | 'kraken'
  | 'exodus'
  | 'backpack'
  | 'uniswap'
  | 'onekey'
  | 'walletconnect'
  | 'injected'
  | 'sandbox'
  | null;

export interface EIP1193Provider {
  request(args: { method: string; params?: unknown[] | Record<string, unknown> }): Promise<unknown>;
  on?(eventName: string, listener: (...args: any[]) => void): void;
  removeListener?(eventName: string, listener: (...args: any[]) => void): void;
}

export interface EIP6963ProviderInfo {
  uuid: string;
  name: string;
  icon: string;
  rdns: string;
}

export interface EIP6963ProviderDetail {
  info: EIP6963ProviderInfo;
  provider: EIP1193Provider;
}

export interface EIP6963AnnounceProviderEvent extends CustomEvent {
  type: 'eip6963:announceProvider';
  detail: EIP6963ProviderDetail;
}

export interface RecentWalletAccount {
  type: SupportedWalletType;
  address: string;
  name?: string;
  lastConnected: number;
}

export type WalletErrorCode =
  | 'USER_REJECTED'
  | 'REQUEST_PENDING'
  | 'WALLET_LOCKED'
  | 'PROVIDER_NOT_FOUND'
  | 'UNSUPPORTED_CHAIN'
  | 'ACCOUNT_UNAVAILABLE'
  | 'CHAIN_SWITCH_REJECTED'
  | 'CHAIN_ADD_REJECTED'
  | 'SESSION_EXPIRED'
  | 'SIWE_FAILED'
  | 'ENVIRONMENT_BLOCKED'
  | 'PROVIDER_DISCONNECTED'
  | 'UNKNOWN_ERROR';

export class WalletError extends Error {
  code: WalletErrorCode;
  rawError?: unknown;

  constructor(code: WalletErrorCode, message: string, rawError?: unknown) {
    super(message);
    this.name = 'WalletError';
    this.code = code;
    this.rawError = rawError;
    Object.setPrototypeOf(this, WalletError.prototype);
  }
}

export interface WalletConnectionResult {
  provider: EIP1193Provider;
  account: `0x${string}`;
  chainId: ChainId;
  rawChainHex: string;
  walletType: SupportedWalletType;
  rdns?: string;
  isWalletConnect?: boolean;
}
