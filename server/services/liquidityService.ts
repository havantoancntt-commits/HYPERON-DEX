/**
 * HYPERON-DEX Liquidity Pool Discovery Service
 * Strict Zero-Synthetic Data compliance: ONLY serves on-chain verified liquidity pools.
 * If live pools are unavailable on current RPC nodes, fails closed with HTTP 503 NO_LIVE_POOLS.
 */

import { Request, Response } from 'express';
import { poolDiscovery, VerifiedPoolRecord } from './poolDiscovery';
import { ChainId } from '../../src/types';

export interface LiquidityPoolsApiResponse {
  pools: VerifiedPoolRecord[];
  source: 'ONCHAIN_VERIFIED_DISCOVERY';
  count: number;
  timestamp: number;
}

/**
 * Express handler for GET /api/liquidity/pools
 * Zero-Synthetic Policy: Never returns SAMPLE_POOLS or mock data under any environment.
 */
export async function handleGetLiquidityPools(req: Request, res: Response): Promise<Response> {
  try {
    const rawChain = req.query.chainId as string | undefined;
    const chainId = rawChain ? (rawChain.toLowerCase() as ChainId) : undefined;

    const livePools = await poolDiscovery.getAllLiveVerifiedPools(chainId);

    if (!livePools || livePools.length === 0) {
      // STRICT FAIL-CLOSED: No mock or synthetic SAMPLE_POOLS fallback allowed
      return res.status(503).json({
        error: 'NO_LIVE_POOLS',
        code: 'NO_LIVE_POOLS',
        message: 'On-chain discovery yielded no results',
        pools: [],
      });
    }

    const payload: LiquidityPoolsApiResponse = {
      pools: livePools,
      source: 'ONCHAIN_VERIFIED_DISCOVERY',
      count: livePools.length,
      timestamp: Date.now(),
    };

    return res.json(payload);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown on-chain reader error';
    return res.status(503).json({
      error: 'NO_LIVE_POOLS',
      code: 'DISCOVERY_ERROR',
      message: `On-chain discovery yielded no results: ${message}`,
      pools: [],
    });
  }
}
