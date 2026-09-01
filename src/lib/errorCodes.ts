/**
 * HYPERON-DEX Centralized Error Codes & Error Formatting
 * Production-Grade Error Management for Web3 Financial Systems
 */

export const DEX_ERROR_CODES = {
  INVALID_ADDRESS: 'INVALID_ADDRESS',
  INVALID_CHAIN: 'INVALID_CHAIN',
  RPC_UNAVAILABLE: 'RPC_UNAVAILABLE',
  PRICE_UNAVAILABLE: 'PRICE_UNAVAILABLE',
  USD_PRICE_UNAVAILABLE: 'USD_PRICE_UNAVAILABLE',
  STALE_PRICE: 'STALE_PRICE',
  STALE_DATA: 'STALE_DATA',
  STALE_BLOCK: 'STALE_BLOCK',
  INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',
  INSUFFICIENT_ALLOWANCE: 'INSUFFICIENT_ALLOWANCE',
  APPROVAL_REQUIRED: 'APPROVAL_REQUIRED',
  NO_LIQUIDITY: 'NO_LIQUIDITY',
  ROUTE_UNAVAILABLE: 'ROUTE_UNAVAILABLE',
  INVALID_ROUTE: 'INVALID_ROUTE',
  PROTOCOL_UNSUPPORTED: 'PROTOCOL_UNSUPPORTED',
  QUOTE_EXPIRED: 'QUOTE_EXPIRED',
  SIMULATION_FAILED: 'SIMULATION_FAILED',
  SIMULATION_REVERT: 'SIMULATION_REVERT',
  USER_ADDRESS_REQUIRED: 'USER_ADDRESS_REQUIRED',
  TRANSACTION_REVERTED: 'TRANSACTION_REVERTED',
  ROUTER_UNAVAILABLE: 'ROUTER_UNAVAILABLE',
  TOKEN_SECURITY_UNKNOWN: 'TOKEN_SECURITY_UNKNOWN',
  UNVERIFIED_CONTRACT: 'UNVERIFIED_CONTRACT',
  TOKEN_NOT_FOUND: 'TOKEN_NOT_FOUND',
  AMBIGUOUS_TOKEN: 'AMBIGUOUS_TOKEN',
  TOKEN_UNVERIFIED: 'TOKEN_UNVERIFIED',
  MEV_UNAVAILABLE: 'MEV_UNAVAILABLE',
  INVALID_SLIPPAGE: 'INVALID_SLIPPAGE',
  INVALID_AMOUNT: 'INVALID_AMOUNT',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
} as const;

export type DexErrorCode = (typeof DEX_ERROR_CODES)[keyof typeof DEX_ERROR_CODES];

export interface DexErrorResponse {
  code: DexErrorCode;
  message: string;
  userMessage: string;
  details?: unknown;
  timestamp: number;
  requestId?: string;
}

export function createDexError(
  code: DexErrorCode,
  message: string,
  userMessage: string,
  details?: unknown
): DexErrorResponse {
  return {
    code,
    message,
    userMessage,
    details,
    timestamp: Date.now(),
  };
}

export const ERROR_MESSAGES: Record<DexErrorCode, string> = {
  INVALID_ADDRESS: 'The provided Ethereum address is invalid or not properly formatted.',
  INVALID_CHAIN: 'The requested blockchain network is unsupported or unavailable.',
  RPC_UNAVAILABLE: 'Unable to connect to the blockchain RPC node. Please try again or switch networks.',
  PRICE_UNAVAILABLE: 'Real-time price feed is currently unavailable for this asset.',
  STALE_PRICE: 'The market price feed is stale and cannot guarantee execution precision.',
  INSUFFICIENT_BALANCE: 'Your wallet has insufficient token balance for this swap amount.',
  INSUFFICIENT_ALLOWANCE: 'Token spending approval is required before executing this trade.',
  APPROVAL_REQUIRED: 'Please approve the DEX router contract to spend your tokens.',
  NO_LIQUIDITY: 'No viable liquidity pool or depth found across connected decentralized exchanges.',
  QUOTE_EXPIRED: 'The swap quote has expired due to block time progression. Refreshing quote...',
  SIMULATION_FAILED: 'Pre-flight transaction simulation failed on-chain. Order will not be submitted.',
  USER_ADDRESS_REQUIRED: 'Wallet sender address is required to simulate transaction execution.',
  TRANSACTION_REVERTED: 'The transaction reverted during on-chain execution.',
  ROUTER_UNAVAILABLE: 'The DEX router contract is unavailable on the target network.',
  TOKEN_SECURITY_UNKNOWN: 'Contract security verification is inconclusive. Proceed with extreme caution.',
  UNVERIFIED_CONTRACT: 'Target token contract is unverified on-chain.',
  TOKEN_NOT_FOUND: 'Token not found or unsupported on this chain.',
  MEV_UNAVAILABLE: 'Private MEV relay is currently unavailable. Swap will use public mempool.',
  INVALID_SLIPPAGE: 'Slippage tolerance must be between 0.01% and 50.0%.',
  INVALID_AMOUNT: 'The swap input amount must be a positive non-zero number.',
  RATE_LIMIT_EXCEEDED: 'API rate limit exceeded. Please wait a moment before sending new requests.',
};
