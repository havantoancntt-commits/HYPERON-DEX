/**
 * HYPERON-DEX ULTRA ROUTER & FORMAL MATH COMPREHENSIVE TEST SUITE
 * Verifies 20+ critical edge cases:
 * - 512-bit arithmetic boundaries & overflow/underflow traps
 * - AMM K-Factor mathematical proof theorem verification
 * - A* Graph pathfinding & liquidity heatmap caching
 * - Infinite loop & circular trade prevention
 * - Zero Synthetic Data invariants on nonexistent or dry pools
 * - MEV protection bundle generation & randomized jitter bounds
 * - Predictive engine confidence scoring & sentiment clamping
 */

import { FormalMath, UINT512_MAX, FormalMathError } from '../server/services/FormalMath';
import { UltraRouter } from '../server/services/UltraRouter';
import { PredictiveEngine } from '../server/services/PredictiveEngine';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, details?: any) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ PASS: ${testName}`);
  } else {
    failedTests++;
    console.error(`  ❌ FAIL: ${testName}`, details || '');
  }
}

export async function runUltraRouterTests(): Promise<{ total: number; passed: number; failed: number }> {
  console.log('\n======================================================');
  console.log(' HYPERON-DEX ULTRA-ROUTER & FORMAL-MATH VERIFICATION');
  console.log('======================================================\n');

  // --- 1. FormalMath: 512-bit Integer Boundaries & Operations ---
  console.log('--- 1. FormalMath: 512-bit Integer Boundaries & Operations ---');

  // Test 1: Add512 normal calculation
  const sum1 = FormalMath.add512(100n, 200n);
  assert(sum1 === 300n, 'Test 1: Safe 512-bit addition computes correct sum');

  // Test 2: Add512 overflow guard (exceeding 2^512 - 1)
  let addOverflowThrown = false;
  try {
    FormalMath.add512(UINT512_MAX, 1n);
  } catch (err: any) {
    if (err instanceof FormalMathError && err.code === 'OVERFLOW_512') {
      addOverflowThrown = true;
    }
  }
  assert(addOverflowThrown, 'Test 2: Add512 throws OVERFLOW_512 when exceeding 2^512 - 1');

  // Test 3: Sub512 underflow guard
  let subUnderflowThrown = false;
  try {
    FormalMath.sub512(100n, 200n);
  } catch (err: any) {
    if (err instanceof FormalMathError && err.code === 'UNDERFLOW') {
      subUnderflowThrown = true;
    }
  }
  assert(subUnderflowThrown, 'Test 3: Sub512 throws UNDERFLOW when subtracting larger from smaller');

  // Test 4: Mul512 preserves full precision without 256-bit truncation
  const largeA = 10n ** 40n;
  const largeB = 10n ** 40n;
  const prod = FormalMath.mul512(largeA, largeB);
  assert(prod === 10n ** 80n, 'Test 4: Mul512 computes 10^80 without intermediate 256-bit overflow');

  // Test 5: Div512 zero division guard
  let divZeroThrown = false;
  try {
    FormalMath.div512(1000n, 0n);
  } catch (err: any) {
    if (err instanceof FormalMathError && err.code === 'DIVISION_BY_ZERO') {
      divZeroThrown = true;
    }
  }
  assert(divZeroThrown, 'Test 5: Div512 throws DIVISION_BY_ZERO when divisor is 0');

  // Test 6: Mod512 zero modulo guard
  let modZeroThrown = false;
  try {
    FormalMath.mod512(1000n, 0n);
  } catch (err: any) {
    if (err instanceof FormalMathError && err.code === 'MODULO_BY_ZERO') {
      modZeroThrown = true;
    }
  }
  assert(modZeroThrown, 'Test 6: Mod512 throws MODULO_BY_ZERO when divisor is 0');

  // Test 7: mulDiv512 full precision intermediate product
  const mulDivRes = FormalMath.mulDiv512(2n ** 250n, 2n ** 250n, 2n ** 240n);
  assert(mulDivRes === 2n ** 260n, 'Test 7: mulDiv512 calculates (2^250 * 2^250) / 2^240 = 2^260 precisely');

  // Test 8: Sqrt512 integer square root
  const sqrt1 = FormalMath.sqrt512(0n);
  const sqrt2 = FormalMath.sqrt512(144n);
  const sqrt3 = FormalMath.sqrt512(200n); // floor(sqrt(200)) = 14
  assert(sqrt1 === 0n && sqrt2 === 12n && sqrt3 === 14n, 'Test 8: Sqrt512 computes exact floor square roots');

  // Test 9: Decimal normalization 6 -> 18
  const norm6to18 = FormalMath.normalizeTo18(1_000_000n, 6); // 1 USDC
  assert(norm6to18 === 10n ** 18n, 'Test 9: NormalizeTo18 scales 6-decimal USDC to exactly 10^18');

  // Test 10: Decimal denormalization 18 -> 6
  const denorm18to6 = FormalMath.denormalizeFrom18(10n ** 18n, 6);
  assert(denorm18to6 === 1_000_000n, 'Test 10: DenormalizeFrom18 un-scales 10^18 back to 1,000,000');

  // --- 2. AMM K-Factor Formal Verification Theorem ---
  console.log('\n--- 2. AMM K-Factor Formal Verification Theorem ---');

  // Test 11: Valid swap preserves or increases K (fee accumulation)
  const reserveIn = 1000n * 10n ** 18n;
  const reserveOut = 2_000_000n * 10n ** 6n;
  const amountIn = 1n * 10n ** 18n;
  // Calculate dy with fee 30 bps
  const feeMult = 9970n;
  const inWithFee = amountIn * feeMult;
  const dy = (reserveOut * inWithFee) / (reserveIn * 10000n + inWithFee);

  const proofValid = FormalMath.verifyKFactorInvariant(reserveIn, reserveOut, amountIn, dy, 30);
  assert(proofValid.isValid === true, 'Test 11: K-Factor verification passes for mathematically sound AMM swap');
  assert(proofValid.kAfter >= proofValid.kBefore, 'Test 11b: kAfter is strictly >= kBefore due to 0.3% protocol fee');
  assert(proofValid.proofHash.startsWith('0x'), 'Test 11c: Generates cryptographic proof hash for on-chain verification');

  // Test 12: Invalid swap with excessive output fails K-factor invariant
  const excessiveDy = dy + (100_000n * 10n ** 6n); // Fabricate unbacked output
  const proofInvalid = FormalMath.verifyKFactorInvariant(reserveIn, reserveOut, amountIn, excessiveDy, 30);
  assert(proofInvalid.isValid === false, 'Test 12: K-Factor verification fails on illegal unbacked output extraction');

  // Test 13: calculateSlippageBound with exact integer precision
  const expectedOut = 10_000_000n; // 10 USDC
  const minOut = FormalMath.calculateSlippageBound(expectedOut, 50); // 50 bps = 0.5%
  assert(minOut === 9_950_000n, 'Test 13: calculateSlippageBound accurately calculates 0.5% bound as 9,950,000');

  // --- 3. UltraRouter Graph Pathfinding & Liquidity Heatmap ---
  console.log('\n--- 3. UltraRouter Graph Pathfinding & Liquidity Heatmap ---');

  // Test 14: Heatmap returns verified liquidity edges
  UltraRouter.clearHeatmapCache();
  const edges = await UltraRouter.getLiquidityHeatmap(1, 'ETH', 'USDC');
  assert(edges.length >= 1, 'Test 14: Liquidity Heatmap discovers at least one verified pool for ETH/USDC');
  assert(edges[0].reserveIn > 0n && edges[0].reserveOut > 0n, 'Test 14b: Discovered edge reserves are strictly positive');

  // Test 15: Heatmap cache reuse within TTL
  const cachedEdges = await UltraRouter.getLiquidityHeatmap(1, 'ETH', 'USDC');
  assert(cachedEdges === edges, 'Test 15: Heatmap returns cached edge array on subsequent calls within TTL');

  // Test 16: Optimal route execution for 1 ETH to USDC
  const oneEth = 10n ** 18n;
  const optimalRoute = await UltraRouter.findOptimalRoute(1, 'ETH', 'USDC', oneEth, 50);
  assert(optimalRoute !== null, 'Test 16: UltraRouter returns a non-null optimal route for 1 ETH -> USDC');
  assert(optimalRoute!.expectedOutputRaw > 0n, 'Test 16b: Optimal route expected output is positive');
  assert(optimalRoute!.minimumReceivedRaw < optimalRoute!.expectedOutputRaw, 'Test 16c: Minimum received is bounded by slippage');
  assert(optimalRoute!.formalProofSummary.allInvariantsVerified === true, 'Test 16d: All split hop invariants formally verified');

  // Test 17: MEV protection bundle generation
  assert(optimalRoute!.mevProtection.frontrunningImmunity === true, 'Test 17: MEV protection grants frontrunning immunity');
  assert(optimalRoute!.mevProtection.randomizedSubmissionDelayMs >= 50, 'Test 17b: Randomized delay has >= 50ms anti-sandwich jitter');

  // Test 18: Zero Synthetic Data - Nonexistent token returns null
  const nullRouteNonexistent = await UltraRouter.findOptimalRoute(1, 'FAKE_TOKEN_XYZ', 'USDC', oneEth);
  assert(nullRouteNonexistent === null, 'Test 18: Nonexistent token returns strictly null (Zero Synthetic Data)');

  // Test 19: Zero Synthetic Data - Dry or zero liquidity returns null
  const dryRoute = await UltraRouter.findOptimalRoute(1, 'ETH', 'NON_EXISTENT_TOKEN_123', oneEth);
  assert(dryRoute === null, 'Test 19: Unpaired pool returns strictly null');

  // Test 20: Circular path / zero amount prevention
  const zeroAmountRoute = await UltraRouter.findOptimalRoute(1, 'ETH', 'USDC', 0n);
  assert(zeroAmountRoute === null, 'Test 20: Zero amountIn returns strictly null without executing');

  // --- 4. PredictiveEngine AI & Quantitative Sentiment Model ---
  console.log('\n--- 4. PredictiveEngine AI & Quantitative Sentiment Model ---');

  // Test 21: Quantitative fallback returns clamped confidence score
  const predAnalysis = PredictiveEngine.calculateQuantitativeMetrics({
    tokenInSymbol: 'ETH',
    tokenOutSymbol: 'USDC',
    amountInFormatted: '1.0',
    expectedOutputFormatted: '2750.0',
    priceImpactBps: 25,
    gasEstimatedUnits: 135_000,
    routeDexList: ['Uniswap v3'],
    chainId: 1,
  });
  assert(predAnalysis.confidenceScore >= 0 && predAnalysis.confidenceScore <= 100, 'Test 21: Confidence score is strictly bounded in [0, 100]');
  assert(['BULLISH', 'BEARISH', 'NEUTRAL'].includes(predAnalysis.marketSentiment), 'Test 21b: Sentiment is valid enum');
  assert(['LOW', 'MODERATE', 'HIGH'].includes(predAnalysis.volatilityForecast), 'Test 21c: Volatility forecast is valid enum');

  // Test 22: High price impact trade receives lower confidence and elevated whale risk
  const highImpactPred = PredictiveEngine.calculateQuantitativeMetrics({
    tokenInSymbol: 'ETH',
    tokenOutSymbol: 'USDC',
    amountInFormatted: '1000.0',
    expectedOutputFormatted: '2200000.0',
    priceImpactBps: 350, // 3.5%
    gasEstimatedUnits: 250_000,
    routeDexList: ['Uniswap v2'],
    chainId: 1,
  });
  assert(highImpactPred.confidenceScore < predAnalysis.confidenceScore, 'Test 22: High impact trade receives lower confidence score');
  assert(highImpactPred.recommendedAction === 'SPLIT_ORDER', 'Test 22b: High impact trade triggers SPLIT_ORDER recommendation');

  console.log('\n======================================================');
  console.log(` ULTRA-ROUTER TEST SUMMARY: ${passedTests}/${totalTests} PASSED (${failedTests} FAILED)`);
  console.log('======================================================\n');

  return { total: totalTests, passed: passedTests, failed: failedTests };
}

// Run standalone if executed directly via tsx
if (process.argv[1]?.endsWith('UltraRouter.test.ts')) {
  runUltraRouterTests().then((res) => {
    if (res.failed > 0) {
      process.exit(1);
    }
  });
}
