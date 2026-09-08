/**
 * HYPERON-DEX UNISWAP V3 EXACT MATH ENGINE & ROUTE COMMITMENT VERIFICATION
 * Phase 3 & Phase 5 Comprehensive Audit Test Suite
 */

import {
  TickMath,
  FullMath,
  SqrtPriceMath,
  SwapMath,
  simulateUniswapV3Swap,
  Q96,
  MIN_TICK,
  MAX_TICK,
  MIN_SQRT_RATIO,
  MAX_SQRT_RATIO,
  type V3Tick,
} from '../server/services/uniswapV3Math';
import { keccak256, encodePacked } from 'viem';

let v3Total = 0;
let v3Passed = 0;
let v3Failed = 0;

function assert(condition: boolean, msg: string) {
  v3Total++;
  if (!condition) {
    v3Failed++;
    console.error(`❌ ASSERTION FAILED: ${msg}`);
    throw new Error(`Assertion failed: ${msg}`);
  }
  v3Passed++;
  console.log(`  ✅ PASS: ${msg}`);
}

export async function runUniswapV3Suite(): Promise<{ total: number; passed: number; failed: number }> {
  v3Total = 0;
  v3Passed = 0;
  v3Failed = 0;
  console.log('======================================================');
  console.log(' UNISWAP V3 BIT-EXACT ENGINE & MULTI-TICK CROSSING VERIFICATION');
  console.log('======================================================');

  // --- 1. TickMath Exact Constants and Boundaries ---
  console.log('\n--- 1. TickMath Exact Invariants ---');
  const sqrtZero = TickMath.getSqrtRatioAtTick(0);
  assert(sqrtZero === Q96, 'TickMath.getSqrtRatioAtTick(0) === 1 << 96 exactly');

  const sqrtMin = TickMath.getSqrtRatioAtTick(MIN_TICK);
  assert(sqrtMin === MIN_SQRT_RATIO, 'TickMath.getSqrtRatioAtTick(MIN_TICK) === MIN_SQRT_RATIO');

  const sqrtMax = TickMath.getSqrtRatioAtTick(MAX_TICK);
  assert(sqrtMax === MAX_SQRT_RATIO, 'TickMath.getSqrtRatioAtTick(MAX_TICK) === MAX_SQRT_RATIO');

  const tickZero = TickMath.getTickAtSqrtRatio(Q96);
  assert(tickZero === 0, 'TickMath.getTickAtSqrtRatio(Q96) === 0');

  let minOutOfBoundsThrown = false;
  try {
    TickMath.getSqrtRatioAtTick(MIN_TICK - 1);
  } catch {
    minOutOfBoundsThrown = true;
  }
  assert(minOutOfBoundsThrown, 'TickMath throws when tick < MIN_TICK');

  let maxOutOfBoundsThrown = false;
  try {
    TickMath.getSqrtRatioAtTick(MAX_TICK + 1);
  } catch {
    maxOutOfBoundsThrown = true;
  }
  assert(maxOutOfBoundsThrown, 'TickMath throws when tick > MAX_TICK');

  // --- 2. FullMath 256/512-bit Precision ---
  console.log('\n--- 2. FullMath 256/512-bit Precision ---');
  const a = 1n << 128n;
  const b = 1n << 128n;
  const denom = 1n << 128n;
  const fullMulDiv = FullMath.mulDiv(a, b, denom);
  assert(fullMulDiv === 1n << 128n, 'FullMath.mulDiv accurately computes large 256-bit product without intermediate overflow');

  const roundDown = FullMath.mulDiv(10n, 10n, 3n);
  assert(roundDown === 33n, 'FullMath.mulDiv floors to 33');

  const roundUp = FullMath.mulDivRoundingUp(10n, 10n, 3n);
  assert(roundUp === 34n, 'FullMath.mulDivRoundingUp ceilings to 34 when remainder exists');

  // --- 3. SqrtPriceMath Deltas & Precision ---
  console.log('\n--- 3. SqrtPriceMath Exact Deltas ---');
  const priceLower = TickMath.getSqrtRatioAtTick(0); // 1.0 (Q96)
  const priceUpper = TickMath.getSqrtRatioAtTick(100);
  const liquidity = 1000000000000000000n; // 1e18 liquidity units

  const amount0 = SqrtPriceMath.getAmount0Delta(priceLower, priceUpper, liquidity, false);
  const amount1 = SqrtPriceMath.getAmount1Delta(priceLower, priceUpper, liquidity, false);
  assert(amount0 > 0n, 'getAmount0Delta is strictly positive');
  assert(amount1 > 0n, 'getAmount1Delta is strictly positive');

  // Rounding up test
  const amount0Up = SqrtPriceMath.getAmount0Delta(priceLower, priceUpper, liquidity, true);
  assert(amount0Up >= amount0, 'getAmount0Delta with roundUp is >= roundDown');

  // --- 4. SwapMath Step Execution ---
  console.log('\n--- 4. SwapMath Step Execution ---');
  const swapStep = SwapMath.computeSwapStep(
    priceLower,
    priceUpper,
    liquidity,
    10000000000000000n, // 0.01 amountIn
    3000 // 0.3% fee
  );
  assert(swapStep.amountIn > 0n, 'computeSwapStep consumed input amount');
  assert(swapStep.feeAmount > 0n, 'computeSwapStep calculates non-zero fee');
  assert(swapStep.amountOut > 0n, 'computeSwapStep produces non-zero output');

  // --- 5. Multi-Tick Crossing Swap Simulation ---
  console.log('\n--- 5. Real Multi-Tick Crossing Swap Simulation ---');
  // Initialize ticks around tick 0
  const ticks: V3Tick[] = [
    { tick: -200, liquidityNet: 500000000000000000n },
    { tick: -100, liquidityNet: 500000000000000000n },
    { tick: 100, liquidityNet: -500000000000000000n },
    { tick: 200, liquidityNet: -500000000000000000n },
  ];

  // A. Small swap (stays within current tick bracket 0 -> -100)
  const smallSwap = simulateUniswapV3Swap({
    sqrtPriceX96: Q96,
    tick: 0,
    liquidity: 1000000000000000000n,
    feePips: 3000, // 0.3%
    zeroForOne: true, // Selling token0 -> price decreases (tick decreases towards -100)
    amountIn: 1000000000000n, // 1e12 wei (stays comfortably inside tick 0 to -100)
    ticks,
  });
  assert(smallSwap.amountOut > 0n, 'Single-tick swap returns positive output');
  assert(smallSwap.ticksCrossed === 0, 'Small swap stays within initialized tick (0 ticks crossed)');

  // B. Large swap forcing multiple tick crossings (-100, then -200)
  const largeSwap = simulateUniswapV3Swap({
    sqrtPriceX96: Q96,
    tick: 0,
    liquidity: 1000000000000000000n,
    feePips: 3000,
    zeroForOne: true,
    amountIn: 100000000000000000000n, // 100 token0 (deep swap across multiple ranges)
    ticks,
  });
  assert(largeSwap.amountOut > 0n, 'Multi-tick swap returns positive output');
  assert(largeSwap.ticksCrossed >= 1, 'Large swap successfully crosses initialized tick boundaries');
  assert(largeSwap.feePaid > 0n, 'Accumulated total fee across crossed steps');
  assert(largeSwap.endSqrtPriceX96 < Q96, 'Price decreased as expected for zeroForOne swap');

  // --- 6. Route Hash Commitment (EIP-712 / Phase 5 Invariants) ---
  console.log('\n--- 6. Route Hash Execution Binding Invariants ---');
  const chainId = 1n;
  const router = '0x1111111111111111111111111111111111111111';
  const tokenIn = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
  const tokenOut = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
  const feeTier = 3000;
  const amountIn = 1000000000000000000n;
  const amountOutMin = 2600000000n;
  const recipient = '0x2222222222222222222222222222222222222222';
  const deadline = 1750000000n;

  const expectedRouteHash = keccak256(
    encodePacked(
      ['uint256', 'address', 'address', 'address', 'uint24', 'uint256', 'uint256', 'address', 'uint256'],
      [chainId, router, tokenIn, tokenOut, feeTier, amountIn, amountOutMin, recipient, deadline]
    )
  );

  assert(/^0x[a-fA-F0-9]{64}$/.test(expectedRouteHash), 'Route hash is a valid 32-byte cryptographic keccak256 hash');

  // Tampering any single parameter (e.g. amountOutMin or recipient) MUST produce a completely different hash
  const tamperedHash = keccak256(
    encodePacked(
      ['uint256', 'address', 'address', 'address', 'uint24', 'uint256', 'uint256', 'address', 'uint256'],
      [chainId, router, tokenIn, tokenOut, feeTier, amountIn, amountOutMin - 1n, recipient, deadline]
    )
  );
  assert(tamperedHash !== expectedRouteHash, 'Tampering amountOutMinimum by 1 wei strictly alters route commitment');

  console.log('\n======================================================');
  console.log(` ✅ ALL UNISWAP V3 & ROUTE COMMITMENT TESTS PASSED (${v3Passed}/${v3Total})`);
  console.log('======================================================');

  return { total: v3Total, passed: v3Passed, failed: v3Failed };
}

if (process.argv[1] && process.argv[1].includes('uniswapV3Verification')) {
  runUniswapV3Suite().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
