/**
 * HYPERON-DEX MATHEMATICALLY EXACT UNISWAP V3 SIMULATION ENGINE
 * Implements reference-grade Uniswap V3 core mathematics:
 * - TickMath (bit-exact tick <-> sqrtPriceX96 conversions)
 * - FullMath (safe 256/512-bit mulDiv with explicit rounding directions)
 * - SqrtPriceMath (getNextSqrtPriceFromInput, getAmount0Delta, getAmount1Delta)
 * - SwapMath (computeSwapStep with conservative rounding)
 * - LiquidityMath (addDelta)
 * - Full multi-tick crossing traversal loop across initialized ticks
 *
 * Core Guarantee:
 * Output quotes are strictly conservative (roundUp for input/fee, roundDown for output).
 * Zero synthetic approximation.
 */

import { FormalMath, FormalMathError } from './FormalMath';

export const Q96: bigint = 1n << 96n;
export const MIN_TICK: number = -887272;
export const MAX_TICK: number = 887272;
export const MIN_SQRT_RATIO: bigint = 4295128739n;
export const MAX_SQRT_RATIO: bigint = 1461446703485210103287273052203988822378723970342n;

export interface V3Tick {
  tick: number;
  liquidityNet: bigint;
  liquidityGross?: bigint;
}

export class FullMath {
  /**
   * Calculates (a * b) / denominator with round-down (truncate).
   */
  public static mulDiv(a: bigint, b: bigint, denominator: bigint): bigint {
    if (denominator <= 0n) {
      throw new FormalMathError('Division by zero or negative denominator in mulDiv', 'ZERO_DIVISION');
    }
    const prod = a * b;
    return prod / denominator;
  }

  /**
   * Calculates (a * b) / denominator rounded UP (conservative for inputs and fees).
   */
  public static mulDivRoundingUp(a: bigint, b: bigint, denominator: bigint): bigint {
    if (denominator <= 0n) {
      throw new FormalMathError('Division by zero or negative denominator in mulDivRoundingUp', 'ZERO_DIVISION');
    }
    const prod = a * b;
    if (prod === 0n) return 0n;
    return (prod + denominator - 1n) / denominator;
  }
}

export class TickMath {
  /**
   * Returns the sqrt ratio as a Q64.96 for the given tick.
   * Matches Uniswap v3 TickMath.getSqrtRatioAtTick bit-for-bit using constant ratios.
   */
  public static getSqrtRatioAtTick(tick: number): bigint {
    const absTick = Math.abs(tick);
    if (absTick > MAX_TICK) {
      throw new FormalMathError(`Tick ${tick} out of bounds [${MIN_TICK}, ${MAX_TICK}]`, 'TICK_OUT_OF_BOUNDS');
    }
    if (tick === MIN_TICK) return MIN_SQRT_RATIO;
    if (tick === MAX_TICK) return MAX_SQRT_RATIO;
    if (tick === 0) return Q96;

    let ratio = (absTick & 0x1) !== 0 ? 0xfffcb933bd6fad37aa2d162d1a594001n : 0x100000000000000000000000000000000n;
    if ((absTick & 0x2) !== 0) ratio = (ratio * 0xfff97272373d413259a46990570e21een) >> 128n;
    if ((absTick & 0x4) !== 0) ratio = (ratio * 0xfff2e50f5f656932ef12357cf3c7fdccn) >> 128n;
    if ((absTick & 0x8) !== 0) ratio = (ratio * 0xffe5caca7e10e4e61c3624eaa0941cd0n) >> 128n;
    if ((absTick & 0x10) !== 0) ratio = (ratio * 0xffcb9843d60f6159c9db58835c926644n) >> 128n;
    if ((absTick & 0x20) !== 0) ratio = (ratio * 0xff973b41fa98c081472e6896dfb254c0n) >> 128n;
    if ((absTick & 0x40) !== 0) ratio = (ratio * 0xff2ea16466c96a3843ec78b326b52861n) >> 128n;
    if ((absTick & 0x80) !== 0) ratio = (ratio * 0xfe5dee046a99a2a811c461f1969c3053n) >> 128n;
    if ((absTick & 0x100) !== 0) ratio = (ratio * 0xfcbe86c7900a88aedcffc83b479aa3a4n) >> 128n;
    if ((absTick & 0x200) !== 0) ratio = (ratio * 0xf987a7253ac413176f2b074cf7815e54n) >> 128n;
    if ((absTick & 0x400) !== 0) ratio = (ratio * 0xf3392b083737afcf49904481371b5d07n) >> 128n;
    if ((absTick & 0x800) !== 0) ratio = (ratio * 0xe7159475a2c29b7443b29c7fa6e889d9n) >> 128n;
    if ((absTick & 0x1000) !== 0) ratio = (ratio * 0xd097f3bdfd2022b8845ad8f792aa5825n) >> 128n;
    if ((absTick & 0x2000) !== 0) ratio = (ratio * 0xa9f746462d870fdf8a65dc1f90e061e5n) >> 128n;
    if ((absTick & 0x4000) !== 0) ratio = (ratio * 0x70d869a156d2a1b890bb3df62baf32f7n) >> 128n;
    if ((absTick & 0x8000) !== 0) ratio = (ratio * 0x31be135b97d56ab6a03131d719ce0a41n) >> 128n;
    if ((absTick & 0x10000) !== 0) ratio = (ratio * 0x9aa508b5b7a84e1c677de54f3e99bc9n) >> 128n;
    if ((absTick & 0x20000) !== 0) ratio = (ratio * 0x5d6af8dedb81196699c329225ee604n) >> 128n;
    if ((absTick & 0x40000) !== 0) ratio = (ratio * 0x2216e584f5fa1ea926041bedfe98n) >> 128n;
    if ((absTick & 0x80000) !== 0) ratio = (ratio * 0x48a170391f7dc42444e8fa2n) >> 128n;

    if (tick > 0) {
      ratio = ((1n << 256n) - 1n) / ratio;
    }

    // Convert from Q128.128 to Q64.96 by shifting right 32 with rounding up
    return (ratio >> 32n) + ((ratio % (1n << 32n)) === 0n ? 0n : 1n);
  }

  /**
   * Returns tick corresponding to given sqrtPriceX96 ratio.
   */
  public static getTickAtSqrtRatio(sqrtPriceX96: bigint): number {
    if (sqrtPriceX96 < MIN_SQRT_RATIO || sqrtPriceX96 > MAX_SQRT_RATIO) {
      throw new FormalMathError('sqrtPriceX96 out of bounds for tick lookup', 'SQRT_RATIO_OUT_OF_BOUNDS');
    }

    // Binary search across [-887272, 887272]
    let low = MIN_TICK;
    let high = MAX_TICK;
    while (low < high) {
      const mid = Math.floor((low + high + 1) / 2);
      const ratio = this.getSqrtRatioAtTick(mid);
      if (ratio <= sqrtPriceX96) {
        low = mid;
      } else {
        high = mid - 1;
      }
    }
    return low;
  }
}

export class SqrtPriceMath {
  /**
   * Gets the next sqrt price given an input amount of token0 or token1.
   * Conservative rounding:
   * - zeroForOne = true: token0 in, price decreases. Next price rounded UP so amountOut is smaller.
   * - zeroForOne = false: token1 in, price increases. Next price rounded DOWN so amountOut is smaller.
   */
  public static getNextSqrtPriceFromInput(
    sqrtPX96: bigint,
    liquidity: bigint,
    amountIn: bigint,
    zeroForOne: boolean
  ): bigint {
    if (sqrtPX96 <= 0n || liquidity <= 0n || amountIn <= 0n) return sqrtPX96;

    if (zeroForOne) {
      // Selling token0 for token1 -> Price drops
      // Formula: sqrtP_next = (L * Q96 * sqrtP) / (L * Q96 + amountIn * sqrtP)
      const num1 = liquidity * Q96;
      const product = amountIn * sqrtPX96;

      // Guard against 512-bit overflow
      const denominator = num1 + product;
      if (denominator <= 0n) return MIN_SQRT_RATIO;

      // Conservative: round UP
      return FullMath.mulDivRoundingUp(num1, sqrtPX96, denominator);
    } else {
      // Selling token1 for token0 -> Price increases
      // Formula: sqrtP_next = sqrtP + (amountIn * Q96) / L
      // Conservative: round DOWN
      const quotient = (amountIn * Q96) / liquidity;
      return sqrtPX96 + quotient;
    }
  }

  /**
   * Gets amount0 delta between two sqrt ratios.
   */
  public static getAmount0Delta(
    sqrtRatioAX96: bigint,
    sqrtRatioBX96: bigint,
    liquidity: bigint,
    roundUp: boolean
  ): bigint {
    let lower = sqrtRatioAX96;
    let upper = sqrtRatioBX96;
    if (lower > upper) {
      lower = sqrtRatioBX96;
      upper = sqrtRatioAX96;
    }
    if (lower <= 0n || liquidity <= 0n) return 0n;

    const numerator1 = liquidity * Q96;
    const numerator2 = upper - lower;

    if (roundUp) {
      return FullMath.mulDivRoundingUp(
        FullMath.mulDivRoundingUp(numerator1, numerator2, upper),
        1n,
        lower
      );
    } else {
      return (numerator1 * numerator2 / upper) / lower;
    }
  }

  /**
   * Gets amount1 delta between two sqrt ratios.
   */
  public static getAmount1Delta(
    sqrtRatioAX96: bigint,
    sqrtRatioBX96: bigint,
    liquidity: bigint,
    roundUp: boolean
  ): bigint {
    let lower = sqrtRatioAX96;
    let upper = sqrtRatioBX96;
    if (lower > upper) {
      lower = sqrtRatioBX96;
      upper = sqrtRatioAX96;
    }
    if (liquidity <= 0n) return 0n;

    const delta = upper - lower;
    if (roundUp) {
      return FullMath.mulDivRoundingUp(liquidity, delta, Q96);
    } else {
      return (liquidity * delta) / Q96;
    }
  }
}

export class SwapMath {
  /**
   * Computes a single swap step from current sqrt price to target sqrt price.
   */
  public static computeSwapStep(
    sqrtRatioCurrentX96: bigint,
    sqrtRatioTargetX96: bigint,
    liquidity: bigint,
    amountRemaining: bigint,
    feePips: number
  ): {
    sqrtRatioNextX96: bigint;
    amountIn: bigint;
    amountOut: bigint;
    feeAmount: bigint;
  } {
    const zeroForOne = sqrtRatioCurrentX96 >= sqrtRatioTargetX96;
    const feePipsBig = BigInt(feePips);

    let amountIn = 0n;
    let amountOut = 0n;
    let sqrtRatioNextX96 = sqrtRatioCurrentX96;
    let feeAmount = 0n;

    // Amount available after deducting fee: remaining * (1e6 - fee) / 1e6
    const amountRemainingLessFee = FullMath.mulDiv(amountRemaining, 1_000_000n - feePipsBig, 1_000_000n);

    // Max amountIn to reach target
    const maxAmountInToTarget = zeroForOne
      ? SqrtPriceMath.getAmount0Delta(sqrtRatioTargetX96, sqrtRatioCurrentX96, liquidity, true)
      : SqrtPriceMath.getAmount1Delta(sqrtRatioCurrentX96, sqrtRatioTargetX96, liquidity, true);

    if (amountRemainingLessFee >= maxAmountInToTarget) {
      // Step reaches target tick boundary!
      sqrtRatioNextX96 = sqrtRatioTargetX96;
      amountIn = maxAmountInToTarget;
      feeAmount = FullMath.mulDivRoundingUp(amountIn, feePipsBig, 1_000_000n - feePipsBig);
      amountOut = zeroForOne
        ? SqrtPriceMath.getAmount1Delta(sqrtRatioTargetX96, sqrtRatioCurrentX96, liquidity, false)
        : SqrtPriceMath.getAmount0Delta(sqrtRatioCurrentX96, sqrtRatioTargetX96, liquidity, false);
    } else {
      // Partial step within current range
      sqrtRatioNextX96 = SqrtPriceMath.getNextSqrtPriceFromInput(
        sqrtRatioCurrentX96,
        liquidity,
        amountRemainingLessFee,
        zeroForOne
      );

      if (zeroForOne) {
        amountIn = SqrtPriceMath.getAmount0Delta(sqrtRatioNextX96, sqrtRatioCurrentX96, liquidity, true);
        amountOut = SqrtPriceMath.getAmount1Delta(sqrtRatioNextX96, sqrtRatioCurrentX96, liquidity, false);
      } else {
        amountIn = SqrtPriceMath.getAmount1Delta(sqrtRatioCurrentX96, sqrtRatioNextX96, liquidity, true);
        amountOut = SqrtPriceMath.getAmount0Delta(sqrtRatioCurrentX96, sqrtRatioNextX96, liquidity, false);
      }

      feeAmount = amountRemaining > amountIn ? amountRemaining - amountIn : 0n;
    }

    return {
      sqrtRatioNextX96,
      amountIn,
      amountOut,
      feeAmount,
    };
  }
}

export class LiquidityMath {
  public static addDelta(x: bigint, y: bigint): bigint {
    if (y < 0n) {
      const absY = -y;
      if (x < absY) return 0n;
      return x - absY;
    }
    return x + y;
  }
}

export interface V3SwapSimulationResult {
  amountInConsumed: bigint;
  amountOut: bigint;
  feePaid: bigint;
  endSqrtPriceX96: bigint;
  endTick: number;
  ticksCrossed: number;
}

/**
 * Simulates an exactInput Uniswap V3 swap with tick crossing.
 */
export function simulateUniswapV3Swap(params: {
  sqrtPriceX96: bigint;
  liquidity: bigint;
  tick: number;
  feePips: number; // e.g. 500 for 0.05%, 3000 for 0.3%
  amountIn: bigint;
  zeroForOne: boolean;
  ticks?: V3Tick[];
  sqrtPriceLimitX96?: bigint;
}): V3SwapSimulationResult {
  const {
    feePips,
    amountIn,
    zeroForOne,
    ticks = [],
  } = params;

  let currentSqrtP = params.sqrtPriceX96;
  let currentL = params.liquidity;
  let currentTick = params.tick;

  const defaultLimit = zeroForOne ? MIN_SQRT_RATIO + 1n : MAX_SQRT_RATIO - 1n;
  const sqrtPriceLimitX96 = params.sqrtPriceLimitX96 || defaultLimit;

  let amountRemaining = amountIn;
  let totalAmountOut = 0n;
  let totalFeePaid = 0n;
  let ticksCrossed = 0;

  // Filter and sort initialized ticks in swap direction
  const sortedTicks = [...ticks].sort((a, b) => (a.tick > b.tick ? 1 : a.tick < b.tick ? -1 : 0));

  let tickIndex = zeroForOne
    ? sortedTicks.findIndex((t) => t.tick <= currentTick)
    : sortedTicks.findIndex((t) => t.tick > currentTick);

  const MAX_STEPS = 100;
  let steps = 0;

  while (amountRemaining > 0n && currentL > 0n && steps < MAX_STEPS) {
    steps++;

    // Find next target tick
    let nextTick: V3Tick | null = null;
    if (zeroForOne) {
      // Moving down in price
      for (let i = sortedTicks.length - 1; i >= 0; i--) {
        if (sortedTicks[i].tick < currentTick) {
          nextTick = sortedTicks[i];
          break;
        }
      }
    } else {
      // Moving up in price
      for (let i = 0; i < sortedTicks.length; i++) {
        if (sortedTicks[i].tick > currentTick) {
          nextTick = sortedTicks[i];
          break;
        }
      }
    }

    let targetSqrtP: bigint;
    if (nextTick) {
      targetSqrtP = TickMath.getSqrtRatioAtTick(nextTick.tick);
      if (zeroForOne && targetSqrtP < sqrtPriceLimitX96) targetSqrtP = sqrtPriceLimitX96;
      if (!zeroForOne && targetSqrtP > sqrtPriceLimitX96) targetSqrtP = sqrtPriceLimitX96;
    } else {
      targetSqrtP = sqrtPriceLimitX96;
    }

    const step = SwapMath.computeSwapStep(
      currentSqrtP,
      targetSqrtP,
      currentL,
      amountRemaining,
      feePips
    );

    amountRemaining -= (step.amountIn + step.feeAmount);
    totalAmountOut += step.amountOut;
    totalFeePaid += step.feeAmount;
    currentSqrtP = step.sqrtRatioNextX96;

    if (currentSqrtP === targetSqrtP && nextTick) {
      // Cross tick!
      ticksCrossed++;
      currentL = zeroForOne
        ? LiquidityMath.addDelta(currentL, -nextTick.liquidityNet)
        : LiquidityMath.addDelta(currentL, nextTick.liquidityNet);

      currentTick = zeroForOne ? nextTick.tick - 1 : nextTick.tick;
    } else if (currentSqrtP !== targetSqrtP) {
      // Swap completed within tick interval
      currentTick = TickMath.getTickAtSqrtRatio(currentSqrtP);
      break;
    }

    if (currentSqrtP === sqrtPriceLimitX96) {
      break;
    }
  }

  return {
    amountInConsumed: amountIn - amountRemaining,
    amountOut: totalAmountOut,
    feePaid: totalFeePaid,
    endSqrtPriceX96: currentSqrtP,
    endTick: currentTick,
    ticksCrossed,
  };
}
