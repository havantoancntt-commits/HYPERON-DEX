/**
 * HYPERON-DEX Canonical Token Identity & Resolver Service
 * Strict token resolution based on ChainId + Normalized Contract Address.
 *
 * Rules:
 * - Symbol is metadata, NOT unique identity.
 * - Resolves canonical tokens by (chainId, normalized address).
 * - When resolving by symbol: returns token if exactly 1 exists; throws AMBIGUOUS_TOKEN or TOKEN_NOT_FOUND otherwise.
 * - On-chain RPC fallback for undeclared ERC-20s (verifies bytecode & decimals).
 * - ZERO zero-address or hardcoded USDC fallbacks!
 */

import { Address, getAddress, isAddress } from 'viem';
import { ChainId, Token } from '../../src/types';
import { VERIFIED_TOKENS, SUPPORTED_CHAINS } from '../../src/lib/constants';
import { getContractBytecode, getERC20Metadata } from './rpc';
import { getUsdPrice } from './priceFeed';

export interface TokenResolutionQuery {
  chainId?: string;
  address?: string;
  symbol?: string;
}

export interface ResolvedToken {
  chainId: ChainId;
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  source: 'REGISTRY' | 'ONCHAIN_RPC' | 'USER_SPECIFIED';
  verified: boolean;
  timestamp: number;
  priceUsd: number | null;
  category: Token['category'];
  isNative?: boolean;
  logoUrl?: string;
}

export class CanonicalTokenResolver {
  /**
   * Normalizes chain ID to verified supported chains.
   */
  normalizeChainId(chainId?: string): ChainId {
    if (!chainId) return 'ethereum';
    const c = chainId.toLowerCase() as ChainId;
    return SUPPORTED_CHAINS[c] ? c : 'ethereum';
  }

  /**
   * Normalizes an Ethereum address into checksummed or lowercased format.
   */
  normalizeAddress(addr?: string): string {
    if (!addr) return '';
    const trimmed = addr.trim();
    if (trimmed === '0x0000000000000000000000000000000000000000' || trimmed.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') {
      return trimmed.toLowerCase();
    }
    if (isAddress(trimmed)) {
      return getAddress(trimmed);
    }
    return trimmed.toLowerCase();
  }

  /**
   * Resolves a token strictly by chainId + address, or uniquely by symbol.
   * Throws TOKEN_NOT_FOUND or AMBIGUOUS_TOKEN if resolution fails.
   */
  async resolveToken(query: TokenResolutionQuery): Promise<ResolvedToken> {
    const chainId = this.normalizeChainId(query.chainId);
    const rawAddress = query.address ? query.address.trim() : undefined;
    const rawSymbol = query.symbol ? query.symbol.trim() : undefined;

    if (!rawAddress && !rawSymbol) {
      throw new Error('TOKEN_NOT_FOUND: Either token address or symbol must be provided.');
    }

    const now = Date.now();

    // 1. Resolution via Explicit Address
    if (rawAddress) {
      const isNativeZero =
        rawAddress === '0x0000000000000000000000000000000000000000' ||
        rawAddress.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';

      if (isNativeZero) {
        const nativeCurrency = SUPPORTED_CHAINS[chainId].nativeCurrency;
        const nativeMatch = VERIFIED_TOKENS.find(
          (t) => t.isNative && t.chainId === chainId
        ) || VERIFIED_TOKENS.find((t) => t.isNative && t.symbol === nativeCurrency.symbol);

        const price = getUsdPrice(nativeCurrency.symbol) ?? nativeMatch?.priceUsd ?? null;

        return {
          chainId,
          address: '0x0000000000000000000000000000000000000000',
          symbol: nativeCurrency.symbol,
          name: nativeCurrency.name,
          decimals: nativeCurrency.decimals,
          source: 'REGISTRY',
          verified: true,
          timestamp: now,
          priceUsd: price,
          category: 'Layer 1',
          isNative: true,
          logoUrl: nativeMatch?.logoUrl || '',
        };
      }

      if (!isAddress(rawAddress)) {
        throw new Error(`INVALID_ADDRESS: Invalid EVM address provided: "${rawAddress}"`);
      }

      const checksummed = getAddress(rawAddress);
      const lower = checksummed.toLowerCase();

      // Check registry
      const regMatch = VERIFIED_TOKENS.find(
        (t) => t.address && t.address.toLowerCase() === lower && t.chainId === chainId
      ) || VERIFIED_TOKENS.find(
        (t) => t.address && t.address.toLowerCase() === lower && chainId === 'ethereum'
      );

      if (regMatch) {
        const livePrice = getUsdPrice(regMatch.symbol) ?? regMatch.priceUsd ?? null;
        return {
          chainId,
          address: checksummed,
          symbol: regMatch.symbol,
          name: regMatch.name,
          decimals: regMatch.decimals,
          source: 'REGISTRY',
          verified: true,
          timestamp: now,
          priceUsd: livePrice,
          category: regMatch.category,
          isNative: regMatch.isNative,
          logoUrl: regMatch.logoUrl,
        };
      }

      // Check on-chain RPC bytecode & ERC20 metadata
      const codeRes = await getContractBytecode(checksummed, chainId);
      const bytecode = codeRes.data;
      if (!bytecode || bytecode === '0x' || bytecode.length <= 2) {
        throw new Error(`TOKEN_NOT_FOUND: No smart contract deployed at address ${checksummed} on ${chainId}.`);
      }

      const metadata = await getERC20Metadata(checksummed, chainId);
      if (!metadata.isValid || metadata.decimals === undefined) {
        throw new Error(`TOKEN_UNVERIFIED: Contract at ${checksummed} does not implement standard ERC-20 interface.`);
      }

      const inferredSymbol = metadata.symbol || rawSymbol || 'TOKEN';
      const livePrice = getUsdPrice(inferredSymbol);

      return {
        chainId,
        address: checksummed,
        symbol: inferredSymbol,
        name: metadata.name || inferredSymbol,
        decimals: metadata.decimals,
        source: 'ONCHAIN_RPC',
        verified: false,
        timestamp: now,
        priceUsd: livePrice,
        category: 'DeFi',
        isNative: false,
      };
    }

    // 2. Resolution via Symbol
    if (rawSymbol) {
      const symUpper = rawSymbol.toUpperCase();

      // Check native currency of chain
      const nativeCurr = SUPPORTED_CHAINS[chainId].nativeCurrency;
      if (symUpper === nativeCurr.symbol) {
        const nativeMatch = VERIFIED_TOKENS.find((t) => t.isNative && t.chainId === chainId);
        const livePrice = getUsdPrice(symUpper) ?? nativeMatch?.priceUsd ?? null;
        return {
          chainId,
          address: '0x0000000000000000000000000000000000000000',
          symbol: nativeCurr.symbol,
          name: nativeCurr.name,
          decimals: nativeCurr.decimals,
          source: 'REGISTRY',
          verified: true,
          timestamp: now,
          priceUsd: livePrice,
          category: 'Layer 1',
          isNative: true,
          logoUrl: nativeMatch?.logoUrl || '',
        };
      }

      // Find all matches on target chain
      const matches = VERIFIED_TOKENS.filter(
        (t) => t.symbol.toUpperCase() === symUpper && t.chainId === chainId
      );

      if (matches.length === 1) {
        const token = matches[0];
        const livePrice = getUsdPrice(token.symbol) ?? token.priceUsd ?? null;
        return {
          chainId,
          address: token.address ? getAddress(token.address) : '0x0000000000000000000000000000000000000000',
          symbol: token.symbol,
          name: token.name,
          decimals: token.decimals,
          source: 'REGISTRY',
          verified: true,
          timestamp: now,
          priceUsd: livePrice,
          category: token.category,
          isNative: token.isNative,
          logoUrl: token.logoUrl,
        };
      }

      if (matches.length > 1) {
        throw new Error(
          `AMBIGUOUS_TOKEN: Multiple tokens found with symbol "${rawSymbol}" on ${chainId}. Please specify contract address.`
        );
      }

      throw new Error(`TOKEN_NOT_FOUND: No verified token found with symbol "${rawSymbol}" on ${chainId}.`);
    }

    throw new Error('TOKEN_NOT_FOUND: Token resolution failed.');
  }

  /**
   * Converts a ResolvedToken to standard frontend Token structure.
   */
  toToken(resolved: ResolvedToken): Token {
    return {
      address: resolved.address,
      symbol: resolved.symbol,
      name: resolved.name,
      decimals: resolved.decimals,
      chainId: resolved.chainId,
      priceUsd: resolved.priceUsd ?? 0,
      change24h: 0,
      volume24h: 0,
      liquidityUsd: 0,
      marketCapUsd: 0,
      logoUrl: resolved.logoUrl || '',
      isVerified: resolved.verified,
      isNative: resolved.isNative,
      category: resolved.category,
    };
  }
}

export const tokenResolver = new CanonicalTokenResolver();
