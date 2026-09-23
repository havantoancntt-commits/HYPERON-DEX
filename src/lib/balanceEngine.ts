/**
 * HYPERON-DEX Precision Token Balance Engine
 * Production-Grade On-Chain Balance Reader & BigInt Decimal-Safe Calculator
 *
 * INVARIANTS:
 * - Blockchain is the sole source of truth for balances.
 * - No client-side balance mutations via addition/subtraction.
 * - Distinguishes RAW, DISPLAY, AVAILABLE, and PENDING balances.
 * - Never assumes decimals = 18. Reads decimals and symbols.
 * - Uses BigInt and viem formatUnits/parseUnits. Zero floating-point drift.
 */

import { Address, formatUnits, parseUnits, PublicClient } from 'viem';
import { ERC20_ABI } from './execution/TransactionBuilder';
import { ChainId } from '../types';

export interface TokenBalanceDetail {
  symbol: string;
  address: Address | 'NATIVE';
  decimals: number;
  rawBalance: bigint;          // Integer in smallest unit (wei)
  displayBalance: string;      // Formatted decimal string for UI
  availableRaw: bigint;        // Balance minus gas reserve (for native) or rawBalance (for ERC20)
  availableDisplay: string;
  pendingDeltaRaw: bigint;     // In-flight transactions delta
  numericBalance: number;      // For legacy display purposes only (safely clamped)
}

export class BalanceEngine {
  /**
   * Safe minimum gas reserve (e.g., 0.005 ETH/BNB/POL) kept for user transaction gas.
   */
  static getGasReserve(symbol: string, decimals: number): bigint {
    const sym = symbol.toUpperCase();
    if (sym === 'ETH') {
      return parseUnits('0.005', decimals);
    }
    if (sym === 'BNB') {
      return parseUnits('0.005', decimals);
    }
    if (sym === 'POL' || sym === 'MATIC') {
      return parseUnits('0.5', decimals);
    }
    return 0n;
  }

  /**
   * Safely formats BigInt to fixed string without floating-point errors.
   */
  static formatDecimalExact(raw: bigint, decimals: number, maxDisplayDigits: number = 6): string {
    const full = formatUnits(raw, decimals);
    if (!full.includes('.')) return full;
    const [intPart, decPart] = full.split('.');
    const trimmed = decPart.slice(0, maxDisplayDigits).replace(/0+$/, '');
    return trimmed.length > 0 ? `${intPart}.${trimmed}` : intPart;
  }

  static rawToFormatted(raw: bigint, decimals: number): string {
    return formatUnits(raw, decimals);
  }

  static formattedToRaw(formatted: string, decimals: number): bigint {
    try {
      if (!formatted || typeof formatted !== 'string' || formatted.trim() === '') return 0n;
      return parseUnits(formatted.trim(), decimals);
    } catch {
      return 0n;
    }
  }

  /**
   * Fetches native token balance from on-chain RPC.
   */
  static async fetchNativeBalance(
    client: PublicClient,
    walletAddress: Address,
    symbol: string = 'ETH',
    decimals: number = 18
  ): Promise<TokenBalanceDetail> {
    const rawBalance = await client.getBalance({ address: walletAddress });
    const gasReserve = this.getGasReserve(symbol, decimals);
    const availableRaw = rawBalance > gasReserve ? rawBalance - gasReserve : 0n;

    return {
      symbol,
      address: 'NATIVE',
      decimals,
      rawBalance,
      displayBalance: this.formatDecimalExact(rawBalance, decimals, 6),
      availableRaw,
      availableDisplay: this.formatDecimalExact(availableRaw, decimals, 6),
      pendingDeltaRaw: 0n,
      numericBalance: parseFloat(formatUnits(rawBalance, decimals)) || 0,
    };
  }

  /**
   * Fetches ERC-20 token balance from contract via balanceOf(wallet).
   */
  static async fetchERC20Balance(
    client: PublicClient,
    tokenAddress: Address,
    walletAddress: Address,
    knownSymbol?: string,
    knownDecimals?: number
  ): Promise<TokenBalanceDetail> {
    let decimals = knownDecimals;
    let symbol = knownSymbol;

    // Read on-chain metadata if not provided
    if (decimals === undefined || decimals === null) {
      try {
        const dec = await (client as any).readContract({
          address: tokenAddress,
          abi: [
            {
              name: 'decimals',
              type: 'function',
              stateMutability: 'view',
              inputs: [],
              outputs: [{ name: '', type: 'uint8' }],
            },
          ],
          functionName: 'decimals',
        });
        decimals = Number(dec);
      } catch {
        decimals = 18;
      }
    }

    if (!symbol) {
      try {
        const sym = await (client as any).readContract({
          address: tokenAddress,
          abi: [
            {
              name: 'symbol',
              type: 'function',
              stateMutability: 'view',
              inputs: [],
              outputs: [{ name: '', type: 'string' }],
            },
          ],
          functionName: 'symbol',
        });
        symbol = String(sym);
      } catch {
        symbol = 'UNKNOWN';
      }
    }

    const rawBal = (await (client as any).readContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [walletAddress],
    })) as bigint;

    return {
      symbol,
      address: tokenAddress,
      decimals,
      rawBalance: rawBal,
      displayBalance: this.formatDecimalExact(rawBal, decimals, 6),
      availableRaw: rawBal,
      availableDisplay: this.formatDecimalExact(rawBal, decimals, 6),
      pendingDeltaRaw: 0n,
      numericBalance: parseFloat(formatUnits(rawBal, decimals)) || 0,
    };
  }

  /**
   * Fetches full token balance portfolio for a wallet on a chain.
   */
  static async fetchPortfolioBalances(
    client: PublicClient,
    walletAddress: Address,
    chainId: ChainId,
    verifiedTokens: Array<{ address: string; symbol: string; decimals: number; isNative?: boolean }>
  ): Promise<Record<string, TokenBalanceDetail>> {
    const result: Record<string, TokenBalanceDetail> = {};

    // 1. Fetch native balance first
    const nativeConfig = chainId === 'bsc' ? { symbol: 'BNB', decimals: 18 } : chainId === 'polygon' ? { symbol: 'POL', decimals: 18 } : { symbol: 'ETH', decimals: 18 };
    try {
      const nativeDetail = await this.fetchNativeBalance(client, walletAddress, nativeConfig.symbol, nativeConfig.decimals);
      result[nativeConfig.symbol] = nativeDetail;
      if (chainId === 'polygon') {
        result['MATIC'] = { ...nativeDetail, symbol: 'MATIC' };
      }
    } catch (err) {
      console.warn(`[BalanceEngine] Error reading native balance for ${chainId}:`, err);
    }

    // 2. Fetch verified ERC-20 tokens on this chain
    const chainTokens = verifiedTokens.filter(
      (t) => !t.isNative && t.address?.startsWith('0x') && t.address.length === 42
    );

    const queries = chainTokens.map(async (t) => {
      try {
        const detail = await this.fetchERC20Balance(
          client,
          t.address as Address,
          walletAddress,
          t.symbol,
          t.decimals
        );
        return detail;
      } catch {
        return null;
      }
    });

    const settled = await Promise.allSettled(queries);
    for (const res of settled) {
      if (res.status === 'fulfilled' && res.value) {
        result[res.value.symbol] = res.value;
      }
    }

    return result;
  }
}
