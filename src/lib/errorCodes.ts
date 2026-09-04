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
  CLAIM_ALREADY_IN_PROGRESS: 'CLAIM_ALREADY_IN_PROGRESS',
  NO_WINNINGS_FOUND: 'NO_WINNINGS_FOUND',
  SYNDICATE_NOT_FOUND: 'SYNDICATE_NOT_FOUND',
  ROUND_NOT_OPEN: 'ROUND_NOT_OPEN',
  VRF_VERIFICATION_FAILED: 'VRF_VERIFICATION_FAILED',
  CIRCUIT_BREAKER_TRIGGERED: 'CIRCUIT_BREAKER_TRIGGERED',
  SSRF_DETECTED: 'SSRF_DETECTED',
  INVALID_PARAMS: 'INVALID_PARAMS',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type DexErrorCode = (typeof DEX_ERROR_CODES)[keyof typeof DEX_ERROR_CODES];

export class DexError extends Error {
  public readonly code: DexErrorCode;
  public readonly details?: unknown;

  constructor(code: DexErrorCode, message?: string, details?: unknown) {
    super(message || ERROR_MESSAGES[code] || code);
    this.name = 'DexError';
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, DexError.prototype);
  }
}

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
  USD_PRICE_UNAVAILABLE: 'USD price oracle feed is unavailable for this asset.',
  STALE_PRICE: 'The market price feed is stale and cannot guarantee execution precision.',
  STALE_DATA: 'Cached market data is stale and requires refresh.',
  STALE_BLOCK: 'The queried blockchain block height is stale.',
  INSUFFICIENT_BALANCE: 'Your wallet has insufficient token balance for this swap amount.',
  INSUFFICIENT_ALLOWANCE: 'Token spending approval is required before executing this trade.',
  APPROVAL_REQUIRED: 'Please approve the DEX router contract to spend your tokens.',
  NO_LIQUIDITY: 'No viable liquidity pool or depth found across connected decentralized exchanges.',
  ROUTE_UNAVAILABLE: 'No routing path found for this token pair.',
  INVALID_ROUTE: 'The specified swap route or pair is invalid.',
  PROTOCOL_UNSUPPORTED: 'The requested DEX protocol is unsupported on this chain.',
  QUOTE_EXPIRED: 'The swap quote has expired due to block time progression. Refreshing quote...',
  SIMULATION_FAILED: 'Pre-flight transaction simulation failed on-chain. Order will not be submitted.',
  SIMULATION_REVERT: 'Pre-flight simulation reverted on-chain.',
  USER_ADDRESS_REQUIRED: 'Wallet sender address is required to simulate transaction execution.',
  TRANSACTION_REVERTED: 'The transaction reverted during on-chain execution.',
  ROUTER_UNAVAILABLE: 'The DEX router contract is unavailable on the target network.',
  TOKEN_SECURITY_UNKNOWN: 'Contract security verification is inconclusive. Proceed with extreme caution.',
  UNVERIFIED_CONTRACT: 'Target token contract is unverified on-chain.',
  TOKEN_NOT_FOUND: 'Token not found or unsupported on this chain.',
  AMBIGUOUS_TOKEN: 'Token symbol is ambiguous. Provide explicit contract address.',
  TOKEN_UNVERIFIED: 'Token is unverified on the active blockchain network.',
  MEV_UNAVAILABLE: 'Private MEV relay is currently unavailable. Swap will use public mempool.',
  INVALID_SLIPPAGE: 'Slippage tolerance must be between 0.01% and 50.0%.',
  INVALID_AMOUNT: 'The swap input amount must be a positive non-zero number.',
  RATE_LIMIT_EXCEEDED: 'API rate limit exceeded. Please wait a moment before sending new requests.',
  CLAIM_ALREADY_IN_PROGRESS: 'Prize claim is already in progress for this wallet address. Please wait for confirmation.',
  NO_WINNINGS_FOUND: 'No unclaimed lottery winnings found for this wallet address.',
  SYNDICATE_NOT_FOUND: 'The specified lottery syndicate pool was not found or has concluded.',
  ROUND_NOT_OPEN: 'The specified lottery round is currently not open for participation.',
  VRF_VERIFICATION_FAILED: 'Provably fair VRF seed verification failed. Commitment integrity check rejected.',
  CIRCUIT_BREAKER_TRIGGERED: 'Circuit breaker active: Extreme price volatility detected (>20% in 60s). Routing paused to prevent flashloan exploits.',
  SSRF_DETECTED: 'Security violation: The target destination is restricted or resolved to internal/private infrastructure.',
  INVALID_PARAMS: 'Invalid or missing request parameters.',
  INTERNAL_ERROR: 'An internal error occurred while processing the request.',
};
