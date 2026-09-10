/**
 * HYPERON-DEX UNISWAP V3 DIFFERENTIAL & FUZZ TESTING SUITE
 * 
 * Verifies mathematical soundness, bit-exactness, and invariant preservation
 * across 1,000+ randomized iterations over:
 * - TickMath (inversion, monotonicity, boundary exactness)
 * - FullMath (256/512-bit safe mulDiv, rounding directions)
 * - SqrtPriceMath (amount0/1 deltas, nextSqrtPrice input/output)
 * - SwapMath (computeSwapStep invariants across fee tiers 100, 500, 3000, 10000)
 * - Multi-tick crossing fuzzing (1 wei to 1,000,000 ETH)
 */

import {
  TickMath,
  FullMath,
  SqrtPriceMath,
  SwapMath,
  simulateUniswapV3Swap,
  MIN_TICK,
  MAX_TICK,
  MIN_SQRT_RATIO,
  MAX_SQRT_RATIO,
  Q96,
  V3Tick,
} from '../server/services/uniswapV3Math';

// Deterministic Pseudo-Random Generator for Reproducible Differential Testing
class PRNG {
  private seed: bigint;
  constructor(seed: number = 42) {
    this.seed = BigInt(seed);
  }

  public nextBigInt(bits: number): bigint {
    // 64-bit LCG
    this.seed = (this.seed * 6364136223846793005n + 1442695040888963407n) & 0xffffffffffffffffn;
    let res = this.seed;
    if (bits > 64) {
      const rounds = Math.ceil(bits / 64);
      for (let i = 1; i < rounds; i++) {
        this.seed = (this.seed * 6364136223846793005n + 1442695040888963407n) & 0xffffffffffffffffn;
        res = (res << 64n) | this.seed;
      }
    }
    const mask = (1n << BigInt(bits)) - 1n;
    return res & mask;
  }

  public nextRange(min: number, max: number): number {
    const span = max - min + 1;
    const rnd = Number(this.nextBigInt(32) % BigInt(span));
    return min + rnd;
  }
}

export async function runUniswapV3DifferentialSuite(): Promise<{ passed: number; total: number }> {
  console.log('\n======================================================');
  console.log(' UNISWAP V3 DIFFERENTIAL & FUZZ TESTING SUITE (1,000+ ITERATIONS)');
  console.log('======================================================');

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, desc: string) {
    total++;
    if (!condition) {
      console.error(`  ❌ FAILED: ${desc}`);
      throw new Error(`Assertion failed: ${desc}`);
    }
    passed++;
  }

  const rng = new PRNG(1337);

  // --------------------------------------------------------------------------
  // TEST 1: FullMath Exactness vs Lossless BigInt Across 1,000 Random Vectors
  // --------------------------------------------------------------------------
  console.log('--- 1. FullMath Differential Invariants (1,000 Vectors) ---');
  let fullMathSuccess = true;
  for (let i = 0; i < 1000; i++) {
    const a = rng.nextBigInt(128) + 1n;
    const b = rng.nextBigInt(128) + 1n;
    const d = rng.nextBigInt(128) + 1n;

    const expectedDown = (a * b) / d;
    const expectedUp = (a * b + d - 1n) / d;

    const actualDown = FullMath.mulDiv(a, b, d);
    const actualUp = FullMath.mulDivRoundingUp(a, b, d);

    if (actualDown !== expectedDown || actualUp !== expectedUp) {
      fullMathSuccess = false;
      break;
    }
    if (actualUp < actualDown) {
      fullMathSuccess = false;
      break;
    }
    if (actualUp - actualDown > 1n) {
      fullMathSuccess = false;
      break;
    }
  }
  assert(fullMathSuccess, 'FullMath mulDiv and mulDivRoundingUp are bit-exact with arbitrary precision reference');

  // --------------------------------------------------------------------------
  // TEST 2: TickMath Invertibility & Monotonicity Across 1,000 Random Ticks
  // --------------------------------------------------------------------------
  console.log('--- 2. TickMath Invertibility & Monotonicity (1,000 Ticks) ---');
  let invertibilitySuccess = true;
  let prevTick = MIN_TICK;
  let prevSqrtP = MIN_SQRT_RATIO;

  for (let i = 0; i < 1000; i++) {
    const tick = rng.nextRange(MIN_TICK + 1, MAX_TICK - 1);
    const sqrtP = TickMath.getSqrtRatioAtTick(tick);
    const recoveredTick = TickMath.getTickAtSqrtRatio(sqrtP);

    if (recoveredTick !== tick) {
      invertibilitySuccess = false;
      break;
    }

    if (tick > prevTick && sqrtP <= prevSqrtP) {
      invertibilitySuccess = false;
      break;
    }

    prevTick = tick;
    prevSqrtP = sqrtP;
  }
  assert(invertibilitySuccess, 'TickMath is strictly monotonic and 100% invertible: getTickAtSqrtRatio(getSqrtRatioAtTick(t)) === t');

  // --------------------------------------------------------------------------
  // TEST 3: SqrtPriceMath Deltas Symmetry and Rounding Bounds (1,000 Vectors)
  // --------------------------------------------------------------------------
  console.log('--- 3. SqrtPriceMath Rounding Bounds & Symmetry (1,000 Vectors) ---');
  let deltasSound = true;
  for (let i = 0; i < 1000; i++) {
    const tickA = rng.nextRange(MIN_TICK + 10, MAX_TICK - 10);
    const tickB = rng.nextRange(MIN_TICK + 10, MAX_TICK - 10);
    const pA = TickMath.getSqrtRatioAtTick(tickA);
    const pB = TickMath.getSqrtRatioAtTick(tickB);
    const liquidity = rng.nextBigInt(100) + 1_000_000n;

    // Amount0 deltas
    const d0Up = SqrtPriceMath.getAmount0Delta(pA, pB, liquidity, true);
    const d0Down = SqrtPriceMath.getAmount0Delta(pA, pB, liquidity, false);
    const d0Symmetric = SqrtPriceMath.getAmount0Delta(pB, pA, liquidity, true);

    if (d0Up < d0Down || d0Up !== d0Symmetric) {
      deltasSound = false;
      break;
    }
    if (d0Up - d0Down > 1n) {
      deltasSound = false;
      break;
    }

    // Amount1 deltas
    const d1Up = SqrtPriceMath.getAmount1Delta(pA, pB, liquidity, true);
    const d1Down = SqrtPriceMath.getAmount1Delta(pA, pB, liquidity, false);
    const d1Symmetric = SqrtPriceMath.getAmount1Delta(pB, pA, liquidity, true);

    if (d1Up < d1Down || d1Up !== d1Symmetric) {
      deltasSound = false;
      break;
    }
    if (d1Up - d1Down > 1n) {
      deltasSound = false;
      break;
    }
  }
  assert(deltasSound, 'SqrtPriceMath amount0/1 deltas satisfy roundUp >= roundDown (diff <= 1 wei) and argument symmetry');

  // --------------------------------------------------------------------------
  // TEST 4: SwapMath Across 1,000 Steps and All Fee Tiers [100, 500, 3000, 10000]
  // --------------------------------------------------------------------------
  console.log('--- 4. SwapMath Step Invariants Across All Fee Tiers (1,000 Steps) ---');
  const feeTiers = [100, 500, 3000, 10000];
  let swapStepSound = true;

  for (let i = 0; i < 1000; i++) {
    const feePips = feeTiers[i % feeTiers.length];
    const currentTick = rng.nextRange(-10000, 10000);
    const targetTick = rng.nextRange(-10000, 10000);
    if (currentTick === targetTick) continue;

    const currentP = TickMath.getSqrtRatioAtTick(currentTick);
    const targetP = TickMath.getSqrtRatioAtTick(targetTick);
    const liquidity = rng.nextBigInt(90) + 1_000_000n;
    const amountRemaining = rng.nextBigInt(80) + 1000n;

    const step = SwapMath.computeSwapStep(currentP, targetP, liquidity, amountRemaining, feePips);

    // Invariant: total consumed cost <= amountRemaining
    if (step.amountIn + step.feeAmount > amountRemaining) {
      swapStepSound = false;
      break;
    }

    // Invariant: Price movement bounded between current and target
    const zeroForOne = currentP >= targetP;
    if (zeroForOne) {
      if (step.sqrtRatioNextX96 > currentP || step.sqrtRatioNextX96 < targetP) {
        swapStepSound = false;
        break;
      }
    } else {
      if (step.sqrtRatioNextX96 < currentP || step.sqrtRatioNextX96 > targetP) {
        swapStepSound = false;
        break;
      }
    }

    // Invariant: Fee is non-negative and fee <= amountRemaining
    if (step.feeAmount < 0n || step.feeAmount > amountRemaining) {
      swapStepSound = false;
      break;
    }
  }
  assert(swapStepSound, 'SwapMath satisfies strict price-boundedness and input-conservation across fee tiers [100, 500, 3000, 10000]');

  // --------------------------------------------------------------------------
  // TEST 5: Fuzz Multi-Tick Crossing Swaps (1 wei to 1,000,000 ETH)
  // --------------------------------------------------------------------------
  console.log('--- 5. Multi-Tick Traversal Fuzzing (1 wei to 1,000,000 ETH) ---');
  let multiTickSound = true;

  // Setup multi-tick pool
  const baseTick = 0;
  const initialSqrtP = TickMath.getSqrtRatioAtTick(baseTick);
  const baseLiquidity = 100_000_000_000_000_000_000n; // 100 L

  const mockTicks: V3Tick[] = [
    { tick: -3000, liquidityNet: 20_000_000_000_000_000_000n },
    { tick: -2000, liquidityNet: -10_000_000_000_000_000_000n },
    { tick: -1000, liquidityNet: 15_000_000_000_000_000_000n },
    { tick: 1000, liquidityNet: 15_000_000_000_000_000_000n },
    { tick: 2000, liquidityNet: -10_000_000_000_000_000_000n },
    { tick: 3000, liquidityNet: 20_000_000_000_000_000_000n },
  ];

  // Test across powers of 10 from 10 wei to 1,000,000 ETH (10^24 wei)
  let prevOutputDown = 0n;
  for (let exp = 1; exp <= 24; exp++) {
    const amountIn = 10n ** BigInt(exp);

    // zeroForOne = true
    const resultDown = simulateUniswapV3Swap({
      sqrtPriceX96: initialSqrtP,
      liquidity: baseLiquidity,
      tick: baseTick,
      feePips: 3000, // 0.3%
      amountIn,
      zeroForOne: true,
      ticks: mockTicks,
    });

    if (resultDown.amountInConsumed <= 0n || resultDown.amountOut <= 0n) {
      multiTickSound = false;
      break;
    }
    if (resultDown.amountOut < prevOutputDown) {
      // Non-monotonic output!
      multiTickSound = false;
      break;
    }
    if (resultDown.endSqrtPriceX96 >= initialSqrtP) {
      // Price must drop on zeroForOne
      multiTickSound = false;
      break;
    }
    prevOutputDown = resultDown.amountOut;

    // zeroForOne = false
    const resultUp = simulateUniswapV3Swap({
      sqrtPriceX96: initialSqrtP,
      liquidity: baseLiquidity,
      tick: baseTick,
      feePips: 3000,
      amountIn,
      zeroForOne: false,
      ticks: mockTicks,
    });

    if (resultUp.amountInConsumed <= 0n || resultUp.amountOut <= 0n) {
      multiTickSound = false;
      break;
    }
    if (resultUp.endSqrtPriceX96 <= initialSqrtP) {
      // Price must rise on !zeroForOne
      multiTickSound = false;
      break;
    }
  }
  assert(multiTickSound, 'Multi-tick traversal maintains monotonic output growth and correct price trajectory from 1 wei to 1,000,000 ETH');

  console.log(`\n======================================================`);
  console.log(` ✅ ALL UNISWAP V3 DIFFERENTIAL TESTS PASSED (${passed}/${total})`);
  console.log(`======================================================\n`);

  return { passed, total };
}

// Direct execution when invoked via tsx
if (process.argv[1]?.endsWith('uniswapV3Differential.test.ts')) {
  runUniswapV3DifferentialSuite().then(res => {
    if (res.passed !== res.total) {
      process.exit(1);
    }
  }).catch(err => {
    console.error('Test run error:', err);
    process.exit(1);
  });
}
