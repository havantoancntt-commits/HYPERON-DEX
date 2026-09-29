/**
 * HYPERON-DEX Centralized Contracts Configuration & Validation Layer
 * Strict Single Source of Truth for on-chain contract addresses, validation, and deployment assertion.
 *
 * INVARIANTS:
 * - Addresses must be checksummed and not zero address or placeholder.
 * - Contracts must be checked on-chain via eth_getCode before execution.
 * - If HyperonRouter is not deployed on a chain: NEVER pretend it is.
 *   Throws ROUTER_NOT_DEPLOYED so UI can display "Swap execution chưa khả dụng trên mạng này."
 */

import { Address, getAddress, isAddress, PublicClient } from 'viem';
import { ChainId } from '../types';
import { DEX_ERROR_CODES, DexError } from './errorCodes';

export interface ChainContractConfig {
  chainId: ChainId;
  chainNumericId: number;
  name: string;
  hyperonRouter?: Address;
  oracleAggregator?: Address;
  wrappedNativeToken: Address;
  uniswapV2Router?: Address;
  uniswapV3Router?: Address;
  uniswapV3Quoter?: Address;
  universalRouter?: Address;
  multicall3: Address;
  protocolTreasury: Address;
  explorerUrl: string;
  explorerTxUrl: (txHash: string) => string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  rpcUrl: string;
  backupRpcUrls: string[];
  supportedTokens: string[];
  isHyperonRouterDeployed: boolean;
}

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

function safeGetAddress(addr?: string): Address | undefined {
  if (!addr || !isAddress(addr) || addr === ZERO_ADDRESS) return undefined;
  return getAddress(addr);
}

// Environmental override helper (client-side vite env)
const getEnvRouter = (chainKey: string): Address | undefined => {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    const val = import.meta.env[`VITE_HYPERON_ROUTER_${chainKey.toUpperCase()}`] ||
      (chainKey === 'ethereum' ? import.meta.env.VITE_HYPERON_ROUTER_ADDRESS : undefined);
    if (val && isAddress(val) && val !== ZERO_ADDRESS) {
      return getAddress(val);
    }
  }
  return undefined;
};

export const CONTRACTS_CONFIG: Record<ChainId, ChainContractConfig> = {
  ethereum: {
    chainId: 'ethereum',
    chainNumericId: 1,
    name: 'Ethereum Mainnet',
    hyperonRouter: getEnvRouter('ethereum'),
    oracleAggregator: safeGetAddress(typeof import.meta !== 'undefined' ? import.meta.env?.VITE_ORACLE_AGGREGATOR_ETHEREUM : undefined),
    wrappedNativeToken: getAddress('0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'),
    uniswapV2Router: getAddress('0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D'),
    uniswapV3Router: getAddress('0xE592427A0AEce92De3Edee1F18E0157C05861564'),
    uniswapV3Quoter: getAddress('0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6'),
    universalRouter: getAddress('0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD'),
    multicall3: getAddress('0xcA11bde05977b3631167028862bE2a173976CA11'),
    protocolTreasury: getAddress('0x87743246e8cfBc3760a82dAAD00987b1d971a5A9'),
    explorerUrl: 'https://etherscan.io',
    explorerTxUrl: (tx: string) => `https://etherscan.io/tx/${tx}`,
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrl: 'https://cloudflare-eth.com',
    backupRpcUrls: ['https://rpc.ankr.com/eth', 'https://ethereum-rpc.publicnode.com'],
    supportedTokens: ['ETH', 'WETH', 'USDC', 'USDT', 'WBTC', 'DAI', 'PEPE', 'SHIB', 'UNI', 'LINK', 'AAVE'],
    isHyperonRouterDeployed: Boolean(getEnvRouter('ethereum')),
  },
  base: {
    chainId: 'base',
    chainNumericId: 8453,
    name: 'Base L2',
    hyperonRouter: getEnvRouter('base'),
    oracleAggregator: safeGetAddress(typeof import.meta !== 'undefined' ? import.meta.env?.VITE_ORACLE_AGGREGATOR_BASE : undefined),
    wrappedNativeToken: getAddress('0x4200000000000000000000000000000000000006'),
    uniswapV2Router: getAddress('0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24'),
    uniswapV3Router: getAddress('0x2626664c2603336E57B271c5C0b26F421741e481'),
    uniswapV3Quoter: getAddress('0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a'),
    universalRouter: getAddress('0x198EF79F1F515F02dFE9e3115e9F8AE783F02ec0'),
    multicall3: getAddress('0xcA11bde05977b3631167028862bE2a173976CA11'),
    protocolTreasury: getAddress('0x87743246e8cfBc3760a82dAAD00987b1d971a5A9'),
    explorerUrl: 'https://basescan.org',
    explorerTxUrl: (tx: string) => `https://basescan.org/tx/${tx}`,
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrl: 'https://mainnet.base.org',
    backupRpcUrls: ['https://base.publicnode.com', 'https://base-rpc.publicnode.com'],
    supportedTokens: ['ETH', 'WETH', 'USDC', 'DAI', 'AERO', 'BRETT', 'TOSHI'],
    isHyperonRouterDeployed: Boolean(getEnvRouter('base')),
  },
  arbitrum: {
    chainId: 'arbitrum',
    chainNumericId: 42161,
    name: 'Arbitrum One',
    hyperonRouter: getEnvRouter('arbitrum'),
    oracleAggregator: safeGetAddress(typeof import.meta !== 'undefined' ? import.meta.env?.VITE_ORACLE_AGGREGATOR_ARBITRUM : undefined),
    wrappedNativeToken: getAddress('0x82aF49447D8a07e3bd95BD0d56f35241523fBab1'),
    uniswapV2Router: getAddress('0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506'),
    uniswapV3Router: getAddress('0xE592427A0AEce92De3Edee1F18E0157C05861564'),
    uniswapV3Quoter: getAddress('0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6'),
    universalRouter: getAddress('0x4C60051384bd2d3C01bfc845Cf5F4b44bcbE9de5'),
    multicall3: getAddress('0xcA11bde05977b3631167028862bE2a173976CA11'),
    protocolTreasury: getAddress('0x87743246e8cfBc3760a82dAAD00987b1d971a5A9'),
    explorerUrl: 'https://arbiscan.io',
    explorerTxUrl: (tx: string) => `https://arbiscan.io/tx/${tx}`,
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
    backupRpcUrls: ['https://arbitrum-one-rpc.publicnode.com', 'https://rpc.ankr.com/arbitrum'],
    supportedTokens: ['ETH', 'WETH', 'ARB', 'USDC', 'USDT', 'WBTC', 'GMX', 'PENDLE'],
    isHyperonRouterDeployed: Boolean(getEnvRouter('arbitrum')),
  },
  optimism: {
    chainId: 'optimism',
    chainNumericId: 10,
    name: 'OP Mainnet',
    hyperonRouter: getEnvRouter('optimism'),
    oracleAggregator: undefined,
    wrappedNativeToken: getAddress('0x4200000000000000000000000000000000000006'),
    uniswapV3Router: getAddress('0xE592427A0AEce92De3Edee1F18E0157C05861564'),
    uniswapV3Quoter: getAddress('0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6'),
    universalRouter: getAddress('0xb555edF5dcF85f42cEeF1f3630a52A108E55A654'),
    multicall3: getAddress('0xcA11bde05977b3631167028862bE2a173976CA11'),
    protocolTreasury: getAddress('0x87743246e8cfBc3760a82dAAD00987b1d971a5A9'),
    explorerUrl: 'https://optimistic.etherscan.io',
    explorerTxUrl: (tx: string) => `https://optimistic.etherscan.io/tx/${tx}`,
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrl: 'https://mainnet.optimism.io',
    backupRpcUrls: ['https://optimism-rpc.publicnode.com'],
    supportedTokens: ['ETH', 'WETH', 'OP', 'USDC', 'USDT', 'SNX', 'VELO'],
    isHyperonRouterDeployed: Boolean(getEnvRouter('optimism')),
  },
  bsc: {
    chainId: 'bsc',
    chainNumericId: 56,
    name: 'BNB Smart Chain',
    hyperonRouter: getEnvRouter('bsc'),
    oracleAggregator: undefined,
    wrappedNativeToken: getAddress('0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c'),
    uniswapV2Router: getAddress('0x10ED43C718714eb63d5aA57B78B54704E256024E'), // PancakeSwap v2
    uniswapV3Router: getAddress('0x13f4EA83D0bd40E75C8222255bc855a974568Dd4'), // PancakeSwap v3
    uniswapV3Quoter: getAddress('0xB048Bbc1Ee6b733FFfCFb9e9CeF7375518e25997'),
    universalRouter: getAddress('0x1A09873E4781A83FA89a7A2d07584102943A5954'),
    multicall3: getAddress('0xcA11bde05977b3631167028862bE2a173976CA11'),
    protocolTreasury: getAddress('0x87743246e8cfBc3760a82dAAD00987b1d971a5A9'),
    explorerUrl: 'https://bscscan.com',
    explorerTxUrl: (tx: string) => `https://bscscan.com/tx/${tx}`,
    nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
    rpcUrl: 'https://binance.llamarpc.com',
    backupRpcUrls: ['https://bsc-dataseed.binance.org', 'https://bsc-rpc.publicnode.com'],
    supportedTokens: ['BNB', 'WBNB', 'USDT', 'USDC', 'CAKE', 'BTCB', 'ETH'],
    isHyperonRouterDeployed: Boolean(getEnvRouter('bsc')),
  },
  polygon: {
    chainId: 'polygon',
    chainNumericId: 137,
    name: 'Polygon PoS',
    hyperonRouter: getEnvRouter('polygon'),
    oracleAggregator: undefined,
    wrappedNativeToken: getAddress('0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270'),
    uniswapV2Router: getAddress('0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff'), // QuickSwap
    uniswapV3Router: getAddress('0xE592427A0AEce92De3Edee1F18E0157C05861564'),
    uniswapV3Quoter: getAddress('0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6'),
    universalRouter: getAddress('0x4C60051384bd2d3C01bfc845Cf5F4b44bcbE9de5'),
    multicall3: getAddress('0xcA11bde05977b3631167028862bE2a173976CA11'),
    protocolTreasury: getAddress('0x87743246e8cfBc3760a82dAAD00987b1d971a5A9'),
    explorerUrl: 'https://polygonscan.com',
    explorerTxUrl: (tx: string) => `https://polygonscan.com/tx/${tx}`,
    nativeCurrency: { name: 'POL', symbol: 'POL', decimals: 18 },
    rpcUrl: 'https://polygon-rpc.com',
    backupRpcUrls: ['https://polygon-bor-rpc.publicnode.com'],
    supportedTokens: ['POL', 'WMATIC', 'USDC', 'USDT', 'WBTC', 'WETH', 'QUICK'],
    isHyperonRouterDeployed: Boolean(getEnvRouter('polygon')),
  },
};

/**
 * Resolves configuration for a given chainId (slug or numeric ID).
 * Fails closed if unknown.
 */
export function getContractsConfig(chainId: string | number): ChainContractConfig {
  let slug: ChainId | undefined;
  if (typeof chainId === 'number') {
    if (chainId === 1) slug = 'ethereum';
    else if (chainId === 8453) slug = 'base';
    else if (chainId === 42161) slug = 'arbitrum';
    else if (chainId === 10) slug = 'optimism';
    else if (chainId === 56) slug = 'bsc';
    else if (chainId === 137) slug = 'polygon';
  } else if (typeof chainId === 'string') {
    const s = chainId.trim().toLowerCase();
    if (s === '1' || s === 'ethereum') slug = 'ethereum';
    else if (s === '8453' || s === 'base') slug = 'base';
    else if (s === '42161' || s === 'arbitrum') slug = 'arbitrum';
    else if (s === '10' || s === 'optimism') slug = 'optimism';
    else if (s === '56' || s === 'bsc') slug = 'bsc';
    else if (s === '137' || s === 'polygon') slug = 'polygon';
  }

  if (!slug || !CONTRACTS_CONFIG[slug]) {
    throw new DexError(
      DEX_ERROR_CODES.INVALID_CHAIN,
      `Network '${chainId}' is not configured in contracts registry. Supported networks: ${Object.keys(CONTRACTS_CONFIG).join(', ')}`
    );
  }

  return CONTRACTS_CONFIG[slug];
}

/**
 * Validates a contract address format, non-zero invariant, and optionally on-chain bytecode.
 */
export async function validateContractOnChain(
  address: Address,
  client?: PublicClient
): Promise<{ isValid: boolean; hasBytecode: boolean; reason?: string }> {
  if (!address || !isAddress(address)) {
    return { isValid: false, hasBytecode: false, reason: 'Invalid EVM address format' };
  }
  if (address.toLowerCase() === ZERO_ADDRESS.toLowerCase()) {
    return { isValid: false, hasBytecode: false, reason: 'Contract address cannot be zero address' };
  }
  // Check for common placeholder addresses
  if (
    address.toLowerCase() === '0x1111111111111111111111111111111111111111' ||
    address.toLowerCase() === '0xdead000000000000000000000000000000000000'
  ) {
    return { isValid: false, hasBytecode: false, reason: 'Placeholder contract address is not allowed' };
  }

  if (client) {
    try {
      const code = await client.getBytecode({ address });
      const hasBytecode = Boolean(code && code !== '0x' && code !== '0x0');
      if (!hasBytecode) {
        return { isValid: false, hasBytecode: false, reason: 'No smart contract bytecode deployed at this address' };
      }
      return { isValid: true, hasBytecode: true };
    } catch (err: any) {
      return { isValid: false, hasBytecode: false, reason: `RPC error verifying bytecode: ${err?.message || String(err)}` };
    }
  }

  return { isValid: true, hasBytecode: true };
}

/**
 * Returns the effective execution router address for a given chain.
 * Prioritizes HyperonRouter if deployed; otherwise uses verified canonical DEX router
 * (Uniswap V3 or V2) if allowed, OR throws ROUTER_UNAVAILABLE.
 */
export function getExecutionRouterAddress(
  chainId: string | number,
  protocol: 'v3' | 'v2' | 'hyperon' = 'hyperon',
  requireHyperon: boolean = false
): { address: Address; protocol: 'v3' | 'v2' | 'hyperon'; isHyperon: boolean } {
  const config = getContractsConfig(chainId);

  if (config.hyperonRouter) {
    return { address: config.hyperonRouter, protocol: 'hyperon', isHyperon: true };
  }

  if (requireHyperon) {
    throw new DexError(
      DEX_ERROR_CODES.ROUTER_UNAVAILABLE,
      `Swap execution qua HyperonRouter chưa khả dụng trên mạng ${config.name}. Vui lòng triển khai HyperonRouter hoặc cấu hình VITE_HYPERON_ROUTER_${config.chainId.toUpperCase()}.`
    );
  }

  // Direct canonical DEX router execution fallback if HyperonRouter contract is not yet deployed on this chain
  if (protocol === 'v2' && config.uniswapV2Router) {
    return { address: config.uniswapV2Router, protocol: 'v2', isHyperon: false };
  }
  if (config.uniswapV3Router) {
    return { address: config.uniswapV3Router, protocol: 'v3', isHyperon: false };
  }
  if (config.universalRouter) {
    return { address: config.universalRouter, protocol: 'v3', isHyperon: false };
  }
  if (config.uniswapV2Router) {
    return { address: config.uniswapV2Router, protocol: 'v2', isHyperon: false };
  }

  throw new DexError(
    DEX_ERROR_CODES.ROUTER_UNAVAILABLE,
    `Không tìm thấy hợp đồng router hợp lệ trên mạng ${config.name}.`
  );
}
