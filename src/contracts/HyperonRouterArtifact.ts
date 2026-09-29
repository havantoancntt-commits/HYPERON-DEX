// SPDX-License-Identifier: MIT
/**
 * Canonical HyperonRouter & HyperonOracleAggregator Artifacts
 * Strictly typed ABI specifications for OpenZeppelin v5 HyperonRouter & HyperonOracleAggregator.
 */

export const HYPERON_ROUTER_ABI = [
  // --- Constructor ---
  {
    inputs: [
      { internalType: 'address', name: '_uniswapV3Router', type: 'address' },
      { internalType: 'address', name: '_uniswapV2Router', type: 'address' },
      { internalType: 'address', name: '_oracleAggregator', type: 'address' },
      { internalType: 'address', name: '_initialOwner', type: 'address' },
    ],
    stateMutability: 'nonpayable',
    type: 'constructor',
  },

  // --- Swap Functions ---
  {
    inputs: [
      { internalType: 'address', name: 'tokenIn', type: 'address' },
      { internalType: 'address', name: 'tokenOut', type: 'address' },
      { internalType: 'uint24', name: 'feeTier', type: 'uint24' },
      { internalType: 'address', name: 'recipient', type: 'address' },
      { internalType: 'uint256', name: 'amountIn', type: 'uint256' },
      { internalType: 'uint256', name: 'amountOutMinimum', type: 'uint256' },
      { internalType: 'uint256', name: 'deadline', type: 'uint256' },
    ],
    name: 'swapExactInputSingleV3',
    outputs: [{ internalType: 'uint256', name: 'amountOut', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'tokenIn', type: 'address' },
      { internalType: 'address', name: 'tokenOut', type: 'address' },
      { internalType: 'uint24', name: 'feeTier', type: 'uint24' },
      { internalType: 'address', name: 'user', type: 'address' },
      { internalType: 'address', name: 'recipient', type: 'address' },
      { internalType: 'uint256', name: 'amountIn', type: 'uint256' },
      { internalType: 'uint256', name: 'amountOutMinimum', type: 'uint256' },
      { internalType: 'uint256', name: 'deadline', type: 'uint256' },
    ],
    name: 'executeRelayedSwapV3',
    outputs: [{ internalType: 'uint256', name: 'amountOut', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'amountIn', type: 'uint256' },
      { internalType: 'uint256', name: 'amountOutMin', type: 'uint256' },
      { internalType: 'address[]', name: 'path', type: 'address[]' },
      { internalType: 'address', name: 'recipient', type: 'address' },
      { internalType: 'uint256', name: 'deadline', type: 'uint256' },
    ],
    name: 'swapExactTokensForTokensV2',
    outputs: [{ internalType: 'uint256[]', name: 'amounts', type: 'uint256[]' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'token', type: 'address' },
      { internalType: 'address', name: 'to', type: 'address' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
    ],
    name: 'rescueFunds',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },

  // --- View Functions ---
  {
    inputs: [],
    name: 'uniswapV3Router',
    outputs: [{ internalType: 'contract ISwapRouter', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'uniswapV2Router',
    outputs: [{ internalType: 'contract IUniswapV2Router02', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'oracleAggregator',
    outputs: [{ internalType: 'contract IERC7528PriceOracle', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'authorizedRelayers',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'canonicalVerifiedTokens',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'owner',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'pendingOwner',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'paused',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },

  // --- Events ---
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'sender', type: 'address' },
      { indexed: true, internalType: 'address', name: 'recipient', type: 'address' },
      { indexed: true, internalType: 'address', name: 'tokenIn', type: 'address' },
      { indexed: false, internalType: 'address', name: 'tokenOut', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'amountIn', type: 'uint256' },
      { indexed: false, internalType: 'uint256', name: 'amountOut', type: 'uint256' },
      { indexed: false, internalType: 'bytes32', name: 'protocol', type: 'bytes32' },
    ],
    name: 'SwapExecuted',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'token', type: 'address' },
      { indexed: true, internalType: 'address', name: 'to', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'amount', type: 'uint256' },
    ],
    name: 'FundsRescued',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'relayer', type: 'address' },
      { indexed: false, internalType: 'bool', name: 'status', type: 'bool' },
    ],
    name: 'RelayerUpdated',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'previousOwner', type: 'address' },
      { indexed: true, internalType: 'address', name: 'newOwner', type: 'address' },
    ],
    name: 'OwnershipTransferred',
    type: 'event',
  },

  // --- Custom Errors ---
  { inputs: [], name: 'InvalidAddress', type: 'error' },
  { inputs: [], name: 'InvalidAmount', type: 'error' },
  { inputs: [], name: 'ExpiredDeadline', type: 'error' },
  { inputs: [], name: 'UnauthorizedRelayer', type: 'error' },
  {
    inputs: [
      { internalType: 'uint256', name: 'received', type: 'uint256' },
      { internalType: 'uint256', name: 'minimumExpected', type: 'uint256' },
    ],
    name: 'InsufficientOutputAmount',
    type: 'error',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'available', type: 'uint256' },
      { internalType: 'uint256', name: 'required', type: 'uint256' },
    ],
    name: 'InsufficientContractBalance',
    type: 'error',
  },
  { inputs: [], name: 'ETHTransferFailed', type: 'error' },
  { inputs: [{ internalType: 'address', name: 'asset', type: 'address' }], name: 'OracleCircuitBreakerTriggered', type: 'error' },
  { inputs: [{ internalType: 'address', name: 'asset', type: 'address' }], name: 'OracleUnavailable', type: 'error' },
] as const;

export const HYPERON_ORACLE_AGGREGATOR_ABI = [
  {
    inputs: [{ internalType: 'address', name: '_initialOwner', type: 'address' }],
    stateMutability: 'nonpayable',
    type: 'constructor',
  },
  {
    inputs: [{ internalType: 'address', name: 'asset', type: 'address' }],
    name: 'getPrice',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'asset', type: 'address' }],
    name: 'getAssetPrice',
    outputs: [
      { internalType: 'uint256', name: 'price', type: 'uint256' },
      { internalType: 'uint256', name: 'lastUpdated', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'asset', type: 'address' }],
    name: 'isCircuitBreakerTripped',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'asset', type: 'address' },
      { internalType: 'uint256', name: 'newPrice', type: 'uint256' },
      { internalType: 'uint256', name: 'medianPrice', type: 'uint256' },
      { internalType: 'uint256', name: 'volume24h', type: 'uint256' },
      { internalType: 'uint256', name: 'confidenceBps', type: 'uint256' },
    ],
    name: 'updatePrice',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'asset', type: 'address' }],
    name: 'resetCircuitBreaker',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;
