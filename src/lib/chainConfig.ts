/**
 * HYPERON-DEX Chain Configuration Single Source of Truth
 * Production-Grade Strict Chain Definition, Checksummed Contract Addresses & Fail-Closed Validation.
 *
 * INVARIANTS:
 * - NO silent fallback to Ethereum Mainnet when an unknown chain is requested.
 * - Unknown chain -> throws INVALID_CHAIN -> FAIL CLOSED.
 * - Missing contract address -> throws CONTRACT_NOT_CONFIGURED.
 * - Invalid checksum or invalid address -> throws INVALID_CONTRACT_ADDRESS.
 */

import { Address, getAddress, isAddress } from 'viem';
import { ChainId } from '../types';

export interface UnifiedChainConfig {
  chainId: ChainId;
  numericChainId: number;
  hexChainId: `0x${string}`;
  name: string;
  shortName: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  rpcUrls: string[];
  explorerUrl: string;
  explorerApiUrl?: string;
  blockTimeSec: number;
  confirmationBlocks: number;
  color: string;
  logo: string;
  isL2: boolean;
  status: 'active' | 'degraded' | 'maintenance';
  contracts: {
    wrappedNative: Address;
    uniswapV2Router?: Address;
    uniswapV2Factory?: Address;
    uniswapV3Router?: Address;
    uniswapV3Quoter?: Address;
    universalRouter?: Address;
    multicall3: Address;
    hyperonRouter?: Address;
    protocolTreasury: Address;
  };
  supportedDexes: string[];
}

export class DexChainError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = 'DexChainError';
    this.code = code;
  }
}

/**
 * Validates and checksums an EVM address.
 * Fails closed if invalid.
 */
export function validateAndChecksumAddress(address: string, context: string = 'address'): Address {
  if (!address || typeof address !== 'string') {
    throw new DexChainError('INVALID_CONTRACT_ADDRESS', `Missing or empty ${context}.`);
  }
  const trimmed = address.trim();
  if (!isAddress(trimmed, { strict: false })) {
    throw new DexChainError('INVALID_CONTRACT_ADDRESS', `Invalid Ethereum address format for ${context}: ${address}`);
  }
  try {
    return getAddress(trimmed);
  } catch {
    throw new DexChainError('INVALID_CONTRACT_ADDRESS', `Failed to checksum ${context}: ${address}`);
  }
}

export const UNIFIED_CHAIN_CONFIGS: Record<ChainId, UnifiedChainConfig> = {
  ethereum: {
    chainId: 'ethereum',
    numericChainId: 1,
    hexChainId: '0x1',
    name: 'Ethereum Mainnet',
    shortName: 'ETH',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: [
      'https://cloudflare-eth.com',
      'https://rpc.ankr.com/eth',
      'https://ethereum-rpc.publicnode.com',
      'https://eth.meowrpc.com',
    ],
    explorerUrl: 'https://etherscan.io',
    blockTimeSec: 12,
    confirmationBlocks: 2,
    color: '#627EEA',
    logo: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
    isL2: false,
    status: 'active',
    contracts: {
      wrappedNative: getAddress('0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'),
      uniswapV2Router: getAddress('0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D'),
      uniswapV2Factory: getAddress('0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f'),
      uniswapV3Router: getAddress('0xE592427A0AEce92De3Edee1F18E0157C05861564'),
      uniswapV3Quoter: getAddress('0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6'),
      universalRouter: getAddress('0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD'),
      multicall3: getAddress('0xcA11bde05977b3631167028862bE2a173976CA11'),
      protocolTreasury: getAddress('0x87743246e8cfBc3760a82dAAD00987b1d971a5A9'),
    },
    supportedDexes: ['Uniswap V3', 'Uniswap V2', 'Curve', 'Balancer'],
  },
  base: {
    chainId: 'base',
    numericChainId: 8453,
    hexChainId: '0x2105',
    name: 'Base L2',
    shortName: 'BASE',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: [
      'https://mainnet.base.org',
      'https://base.publicnode.com',
      'https://base-rpc.publicnode.com',
    ],
    explorerUrl: 'https://basescan.org',
    blockTimeSec: 2,
    confirmationBlocks: 1,
    color: '#0052FF',
    logo: 'https://assets.coingecko.com/asset_platforms/images/131/small/base.jpeg',
    isL2: true,
    status: 'active',
    contracts: {
      wrappedNative: getAddress('0x4200000000000000000000000000000000000006'),
      uniswapV2Router: getAddress('0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24'),
      uniswapV3Router: getAddress('0x2626664c2603336E57B271c5C0b26F421741e481'),
      uniswapV3Quoter: getAddress('0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a'),
      universalRouter: getAddress('0x198EF79F1F515F02dFE9e3115e9F8AE783F02ec0'),
      multicall3: getAddress('0xcA11bde05977b3631167028862bE2a173976CA11'),
      protocolTreasury: getAddress('0x87743246e8cfBc3760a82dAAD00987b1d971a5A9'),
    },
    supportedDexes: ['Uniswap V3', 'Aerodrome', 'BaseSwap'],
  },
  arbitrum: {
    chainId: 'arbitrum',
    numericChainId: 42161,
    hexChainId: '0xa4b1',
    name: 'Arbitrum One',
    shortName: 'ARB',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: [
      'https://arb1.arbitrum.io/rpc',
      'https://arbitrum-one-rpc.publicnode.com',
      'https://rpc.ankr.com/arbitrum',
    ],
    explorerUrl: 'https://arbiscan.io',
    blockTimeSec: 0.25,
    confirmationBlocks: 1,
    color: '#28A0F0',
    logo: 'https://assets.coingecko.com/coins/images/16547/small/arbitrum-shield.png',
    isL2: true,
    status: 'active',
    contracts: {
      wrappedNative: getAddress('0x82aF49447D8a07e3bd95BD0d56f35241523fBab1'),
      uniswapV2Router: getAddress('0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506'), // SushiSwap Router
      uniswapV3Router: getAddress('0xE592427A0AEce92De3Edee1F18E0157C05861564'),
      uniswapV3Quoter: getAddress('0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6'),
      universalRouter: getAddress('0x4C60051384bd2d3C01bfc845Cf5F4b44bcbE9de5'),
      multicall3: getAddress('0xcA11bde05977b3631167028862bE2a173976CA11'),
      protocolTreasury: getAddress('0x87743246e8cfBc3760a82dAAD00987b1d971a5A9'),
    },
    supportedDexes: ['Uniswap V3', 'SushiSwap', 'Camelot'],
  },
  optimism: {
    chainId: 'optimism',
    numericChainId: 10,
    hexChainId: '0xa',
    name: 'OP Mainnet',
    shortName: 'OP',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: [
      'https://mainnet.optimism.io',
      'https://optimism-rpc.publicnode.com',
      'https://rpc.ankr.com/optimism',
    ],
    explorerUrl: 'https://optimistic.etherscan.io',
    blockTimeSec: 2,
    confirmationBlocks: 1,
    color: '#FF0420',
    logo: 'https://assets.coingecko.com/coins/images/25244/small/Optimism.png',
    isL2: true,
    status: 'active',
    contracts: {
      wrappedNative: getAddress('0x4200000000000000000000000000000000000006'),
      uniswapV3Router: getAddress('0xE592427A0AEce92De3Edee1F18E0157C05861564'),
      uniswapV3Quoter: getAddress('0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6'),
      universalRouter: getAddress('0xb555edF5dcF85f42cEeF1f3630a52A108E55A654'),
      multicall3: getAddress('0xcA11bde05977b3631167028862bE2a173976CA11'),
      protocolTreasury: getAddress('0x87743246e8cfBc3760a82dAAD00987b1d971a5A9'),
    },
    supportedDexes: ['Uniswap V3', 'Velodrome'],
  },
  bsc: {
    chainId: 'bsc',
    numericChainId: 56,
    hexChainId: '0x38',
    name: 'BNB Smart Chain',
    shortName: 'BSC',
    nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
    rpcUrls: [
      'https://binance.ankr.com',
      'https://bsc-dataseed.binance.org',
      'https://bsc-rpc.publicnode.com',
    ],
    explorerUrl: 'https://bscscan.com',
    blockTimeSec: 3,
    confirmationBlocks: 2,
    color: '#F3BA2F',
    logo: 'https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png',
    isL2: false,
    status: 'active',
    contracts: {
      wrappedNative: getAddress('0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c'),
      uniswapV2Router: getAddress('0x10ED43C718714eb63d5aA57B78B54704E256024E'), // PancakeSwap v2
      uniswapV2Factory: getAddress('0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73'),
      uniswapV3Router: getAddress('0x13f4EA83D0bd40E75C8222255bc855a974568Dd4'), // PancakeSwap v3
      uniswapV3Quoter: getAddress('0xB048Bbc1Ee6b733FFfCFb9e9CeF7375518e25997'),
      universalRouter: getAddress('0x1A09873E4781A83FA89a7A2d07584102943A5954'),
      multicall3: getAddress('0xcA11bde05977b3631167028862bE2a173976CA11'),
      protocolTreasury: getAddress('0x87743246e8cfBc3760a82dAAD00987b1d971a5A9'),
    },
    supportedDexes: ['PancakeSwap V3', 'PancakeSwap V2', 'BiSwap'],
  },
  polygon: {
    chainId: 'polygon',
    numericChainId: 137,
    hexChainId: '0x89',
    name: 'Polygon PoS',
    shortName: 'POL',
    nativeCurrency: { name: 'POL', symbol: 'POL', decimals: 18 },
    rpcUrls: [
      'https://polygon-rpc.com',
      'https://polygon-bor-rpc.publicnode.com',
      'https://rpc.ankr.com/polygon',
    ],
    explorerUrl: 'https://polygonscan.com',
    blockTimeSec: 2,
    confirmationBlocks: 3,
    color: '#8247E5',
    logo: 'https://assets.coingecko.com/coins/images/4713/small/polygon.png',
    isL2: false,
    status: 'active',
    contracts: {
      wrappedNative: getAddress('0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270'), // WPOL / WMATIC
      uniswapV2Router: getAddress('0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff'), // QuickSwap Router
      uniswapV3Router: getAddress('0xE592427A0AEce92De3Edee1F18E0157C05861564'),
      uniswapV3Quoter: getAddress('0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6'),
      universalRouter: getAddress('0x4C60051384bd2d3C01bfc845Cf5F4b44bcbE9de5'),
      multicall3: getAddress('0xcA11bde05977b3631167028862bE2a173976CA11'),
      protocolTreasury: getAddress('0x87743246e8cfBc3760a82dAAD00987b1d971a5A9'),
    },
    supportedDexes: ['QuickSwap V3', 'Uniswap V3', 'QuickSwap V2'],
  },
};

const NUMERIC_TO_SLUG: Record<number, ChainId> = {
  1: 'ethereum',
  8453: 'base',
  42161: 'arbitrum',
  10: 'optimism',
  56: 'bsc',
  137: 'polygon',
};

const HEX_TO_SLUG: Record<string, ChainId> = {
  '0x1': 'ethereum',
  '0x2105': 'base',
  '0xa4b1': 'arbitrum',
  '0xa': 'optimism',
  '0x38': 'bsc',
  '0x89': 'polygon',
};

/**
 * Normalizes and validates chain identifier.
 * STRICT: Does NOT fallback to Ethereum! Throws INVALID_CHAIN error on any unsupported chain.
 */
export function validateChainId(chain: string | number | undefined | null): ChainId {
  if (chain === undefined || chain === null || chain === '') {
    throw new DexChainError('INVALID_CHAIN', 'Chain identifier is required and cannot be empty.');
  }

  if (typeof chain === 'number') {
    const slug = NUMERIC_TO_SLUG[chain];
    if (slug) return slug;
    throw new DexChainError(
      'INVALID_CHAIN',
      `Unsupported numeric chain ID: ${chain}. Supported IDs: ${Object.keys(NUMERIC_TO_SLUG).join(', ')}`
    );
  }

  const str = String(chain).trim().toLowerCase();

  // Check hex
  if (str.startsWith('0x')) {
    const slug = HEX_TO_SLUG[str];
    if (slug) return slug;
    throw new DexChainError('INVALID_CHAIN', `Unsupported hex chain ID: ${chain}.`);
  }

  // Check numeric as string
  const parsedNum = Number(str);
  if (!Number.isNaN(parsedNum) && parsedNum > 0 && NUMERIC_TO_SLUG[parsedNum]) {
    return NUMERIC_TO_SLUG[parsedNum];
  }

  // Check slug
  if (str in UNIFIED_CHAIN_CONFIGS) {
    return str as ChainId;
  }

  throw new DexChainError(
    'INVALID_CHAIN',
    `Unsupported chain: '${chain}'. Valid chains: ${Object.keys(UNIFIED_CHAIN_CONFIGS).join(', ')}. FAIL CLOSED.`
  );
}

/**
 * Checks if a chain identifier is supported.
 */
export function isSupportedChain(chain: string | number | undefined | null): boolean {
  try {
    validateChainId(chain);
    return true;
  } catch {
    return false;
  }
}

/**
 * Retrieves the unified configuration for a chain.
 * Fails closed if the chain is invalid.
 */
export function getChainConfig(chain: string | number | undefined | null): UnifiedChainConfig {
  const validatedSlug = validateChainId(chain);
  return UNIFIED_CHAIN_CONFIGS[validatedSlug];
}

/**
 * Gets a verified contract address for a chain.
 * Throws CONTRACT_NOT_CONFIGURED if not present.
 */
export function getVerifiedContractAddress(
  chain: string | number,
  contractKey: keyof UnifiedChainConfig['contracts']
): Address {
  const config = getChainConfig(chain);
  const addr = config.contracts[contractKey];
  if (!addr) {
    throw new DexChainError(
      'CONTRACT_NOT_CONFIGURED',
      `Contract '${String(contractKey)}' is not configured for chain '${config.name}' (${config.chainId}). FAIL CLOSED.`
    );
  }
  return addr;
}
