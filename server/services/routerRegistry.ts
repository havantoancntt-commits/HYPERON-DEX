/**
 * HYPERON-DEX Router Registry
 * Multi-Chain Verified Decentralized Exchange Router & Quoter Addresses
 */
import { Address } from 'viem';
import { ChainId } from '../../src/types';

export interface ChainRouterConfig {
  chainId: ChainId;
  chainNumericId: number;
  nativeSymbol: string;
  nativeDecimals: number;
  wrappedNativeAddress: Address;
  uniswapV2Router?: Address;
  uniswapV2Factory?: Address;
  uniswapV3Router?: Address;
  uniswapV3Quoter?: Address;
  universalRouter?: Address;
  curveRegistry?: Address;
  balancerVault?: Address;
  flashbotsRelaySupported: boolean;
}

export const ROUTER_REGISTRY: Record<ChainId, ChainRouterConfig> = {
  ethereum: {
    chainId: 'ethereum',
    chainNumericId: 1,
    nativeSymbol: 'ETH',
    nativeDecimals: 18,
    wrappedNativeAddress: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    uniswapV2Router: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
    uniswapV2Factory: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
    uniswapV3Router: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
    uniswapV3Quoter: '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6',
    universalRouter: '0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD',
    curveRegistry: '0x90E00ACe148ca3b23Ac1bC8C240C2a7Dd9c2d7f5',
    balancerVault: '0xBA12222222228d8Ba445958a75a0704d566BF2C8',
    flashbotsRelaySupported: true,
  },
  base: {
    chainId: 'base',
    chainNumericId: 8453,
    nativeSymbol: 'ETH',
    nativeDecimals: 18,
    wrappedNativeAddress: '0x4200000000000000000000000000000000000006',
    uniswapV2Router: '0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24',
    uniswapV3Router: '0x2626664c2603336E57B271c5C0b26F421741e481',
    uniswapV3Quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
    universalRouter: '0x198EF79F1F515F02dFE9e3115e9F8AE783F02ec0',
    flashbotsRelaySupported: false,
  },
  arbitrum: {
    chainId: 'arbitrum',
    chainNumericId: 42161,
    nativeSymbol: 'ETH',
    nativeDecimals: 18,
    wrappedNativeAddress: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
    uniswapV2Router: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506', // SushiSwap Router on Arb
    uniswapV3Router: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
    uniswapV3Quoter: '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6',
    universalRouter: '0x4C60051384bd2d3C01bfc845Cf5F4b44bcbE9de5',
    flashbotsRelaySupported: false,
  },
  optimism: {
    chainId: 'optimism',
    chainNumericId: 10,
    nativeSymbol: 'ETH',
    nativeDecimals: 18,
    wrappedNativeAddress: '0x4200000000000000000000000000000000000006',
    uniswapV3Router: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
    uniswapV3Quoter: '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6',
    universalRouter: '0xb555edF5dcF85f42cEeF1f3630a52A108E55A654',
    flashbotsRelaySupported: false,
  },
  bsc: {
    chainId: 'bsc',
    chainNumericId: 56,
    nativeSymbol: 'BNB',
    nativeDecimals: 18,
    wrappedNativeAddress: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
    uniswapV2Router: '0x10ED43C718714eb63d5aA57B78B54704E256024E', // PancakeSwap v2 Router
    uniswapV2Factory: '0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73',
    uniswapV3Router: '0x13f4EA83D0bd40E75C8222255bc855a974568Dd4', // PancakeSwap v3 Router
    uniswapV3Quoter: '0xB048Bbc1Ee6b733FFfCFb9e9CeF7375518e25997',
    universalRouter: '0x1A09873E4781A83FA89a7A2d07584102943A5954',
    flashbotsRelaySupported: false,
  },
  polygon: {
    chainId: 'polygon',
    chainNumericId: 137,
    nativeSymbol: 'POL',
    nativeDecimals: 18,
    wrappedNativeAddress: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270', // WMATIC / WPOL
    uniswapV2Router: '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff', // QuickSwap Router
    uniswapV3Router: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
    uniswapV3Quoter: '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6',
    universalRouter: '0x4C60051384bd2d3C01bfc845Cf5F4b44bcbE9de5',
    flashbotsRelaySupported: false,
  },
};

export function getRouterConfig(chainId: string): ChainRouterConfig {
  const normalized = (chainId || 'ethereum').toLowerCase() as ChainId;
  const config = ROUTER_REGISTRY[normalized];
  if (!config) {
    throw new Error(`Unsupported chain: ${chainId}. Valid chains are: ${Object.keys(ROUTER_REGISTRY).join(', ')}`);
  }
  return config;
}
