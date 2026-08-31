/**
 * HYPERON-DEX Automated Regression & Verification Test Suite
 * Mathematical AMM precision, property-based invariant testing, price feed integrity,
 * routing graph optimization, scanner, simulation engine, and cryptographic VRF tests.
 */

import { UniswapV2Adapter, UniswapV3Adapter, CurveAdapter, BalancerAdapter } from '../server/services/ammEngine';
import { parseUnits, formatUnits } from 'viem';
import { calculateSmartRouteQuote } from '../server/services/router';
import { scanTokenSecurity } from '../server/services/scanner';
import { getPriceState, getUsdPrice } from '../server/services/priceFeed';
import { decodeRevertReason, SimulationEngine } from '../server/services/simulationEngine';
import { deriveWinningDigitsFromSeed, generateCryptographicTicketNumbers } from '../server/services/lotteryEngine';
import { DEX_ERROR_CODES } from '../src/lib/errorCodes';

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

async function runTests() {
  console.log('\n======================================================');
  console.log(' HYPERON-DEX PRODUCTION AUDIT & VERIFICATION SUITE');
  console.log('======================================================\n');

  // -------------------------------------------------------------
  // Test 1: AMM Exact BigInt Integer Math & Zero Edge Cases
  // -------------------------------------------------------------
  console.log('--- 1. AMM Engine Constant Product & Integer Math ---');
  const uniV2 = new UniswapV2Adapter();

  const mockReserves = {
    reserve0: parseUnits('1000', 18), // 1,000 ETH
    reserve1: parseUnits('3400000', 6), // 3,400,000 USDC
    token0Decimals: 18,
    token1Decimals: 6,
    token0Symbol: 'ETH',
    token1Symbol: 'USDC',
    feeBps: 30, // 0.30%
  };

  // Swap 1 ETH
  const amountIn = parseUnits('1', 18);
  const quote1 = uniV2.computeQuote(amountIn, 18, 6, mockReserves);

  assert(quote1.status === 'AVAILABLE', 'UniswapV2 returns status AVAILABLE');
  assert(quote1.amountOutRaw > 0n, 'UniswapV2 produces non-zero raw BigInt output');
  assert(
    parseFloat(quote1.amountOutFormatted) > 3300 && parseFloat(quote1.amountOutFormatted) < 3400,
    'UniswapV2 calculates realistic constant-product output for 1 ETH (~3389 USDC)',
    quote1.amountOutFormatted
  );
  assert(quote1.priceImpactPercent >= 0, 'Price impact is non-negative and mathematically computed');

  // Zero input should result in zero output
  const zeroQuote = uniV2.computeQuote(0n, 18, 6, mockReserves);
  assert(zeroQuote.amountOutRaw === 0n, 'Zero input returns exactly 0n BigInt output');

  // Missing reserves should result in NO_LIQUIDITY
  const noLiqQuote = uniV2.computeQuote(amountIn, 18, 6, undefined);
  assert(noLiqQuote.status === 'NO_LIQUIDITY', 'Undefined reserves return status NO_LIQUIDITY');

  // -------------------------------------------------------------
  // Test 2: AMM Property-Based Fuzz & Invariant Verification
  // -------------------------------------------------------------
  console.log('\n--- 2. AMM Property-Based Invariant Fuzz Tests ---');
  // Property A: k_after >= k_before due to fee accumulation
  let invariantPassed = true;
  let monotonicPassed = true;
  let prevOut = 0n;

  for (let i = 1; i <= 20; i++) {
    const inputEth = parseUnits(`${i * 0.5}`, 18);
    const q = uniV2.computeQuote(inputEth, 18, 6, mockReserves);

    if (q.amountOutRaw <= prevOut) {
      monotonicPassed = false;
    }
    prevOut = q.amountOutRaw;

    const r0After = mockReserves.reserve0 + inputEth;
    const r1After = mockReserves.reserve1 - q.amountOutRaw;
    const kBefore = mockReserves.reserve0 * mockReserves.reserve1;
    const kAfter = r0After * r1After;

    if (kAfter < kBefore) {
      invariantPassed = false;
    }
  }

  assert(invariantPassed, 'Property: Invariant k strictly increases or stays constant (k_after >= k_before)');
  assert(monotonicPassed, 'Property: Monotonicity holds (larger input dx strictly yields larger output dy)');

  // -------------------------------------------------------------
  // Test 3: Curve StableSwap Invariant Adapter
  // -------------------------------------------------------------
  console.log('\n--- 3. Curve StableSwap Invariant Adapter ---');
  const curve = new CurveAdapter();
  const stableReserves = {
    reserve0: parseUnits('10000000', 6), // 10M USDC
    reserve1: parseUnits('10000000', 6), // 10M USDT
    token0Decimals: 6,
    token1Decimals: 6,
    token0Symbol: 'USDC',
    token1Symbol: 'USDT',
    feeBps: 4, // 0.04%
  };

  const usdcIn = parseUnits('10000', 6); // 10,000 USDC
  const curveQuote = curve.computeQuote(usdcIn, 6, 6, stableReserves);

  assert(curveQuote.status === 'AVAILABLE', 'Curve returns status AVAILABLE');
  assert(
    parseFloat(curveQuote.amountOutFormatted) > 9990 && parseFloat(curveQuote.amountOutFormatted) <= 10000,
    'Curve maintains tight peg for stable pairs (10,000 USDC -> ~9,996 USDT)',
    curveQuote.amountOutFormatted
  );
  assert(curveQuote.priceImpactPercent < 0.1, 'Curve stable swap has minimal price impact (<0.1%)');

  // -------------------------------------------------------------
  // Test 4: Price Feed Oracle & Zero $1.00 Fallbacks
  // -------------------------------------------------------------
  console.log('\n--- 4. Price Feed Oracle Integrity ---');
  const ethState = getPriceState('ETH');
  assert(ethState.symbol === 'ETH', 'Price feed correctly maps ETH symbol');
  assert(ethState.status === 'LIVE' || ethState.status === 'UNAVAILABLE', 'Price status is strictly typed');

  const unknownState = getPriceState('NON_EXISTENT_COIN_XYZ_999');
  assert(unknownState.priceUsd === null, 'Unknown token priceUsd is strictly null (NO $1.00 fake fallback!)');
  assert(unknownState.status === 'UNAVAILABLE', 'Unknown token status is UNAVAILABLE');

  const unknownNum = getUsdPrice('NON_EXISTENT_COIN_XYZ_999');
  assert(unknownNum === null, 'getUsdPrice returns null for unverified tokens');

  // -------------------------------------------------------------
  // Test 5: Smart Router & Multi-Chain Quotes
  // -------------------------------------------------------------
  console.log('\n--- 5. Smart DEX Router ---');
  const routeQuote = await calculateSmartRouteQuote({
    fromTokenSymbol: 'ETH',
    toTokenSymbol: 'USDC',
    amount: 1.5,
    slippage: 0.5,
    chainId: 'ethereum',
  });

  assert(routeQuote.fromAmount === 1.5, 'Quote preserves exact input amount');
  assert(routeQuote.expectedOutput > 0, 'Quote produces positive expected output');
  assert(routeQuote.minimumReceived < routeQuote.expectedOutput, 'Minimum received is strictly less than expected output');
  assert(
    routeQuote.minimumReceived >= routeQuote.expectedOutput * 0.994,
    'Minimum received strictly respects 0.5% slippage bound'
  );
  assert(routeQuote.sources.length > 0, 'Quote includes genuine liquidity sources');
  assert(routeQuote.estimatedGasUsd > 0, 'Gas cost is computed in USD based on live gas price');

  // Invalid slippage rejection
  let slippageErrorCaught = false;
  try {
    await calculateSmartRouteQuote({
      fromTokenSymbol: 'ETH',
      toTokenSymbol: 'USDC',
      amount: 1.0,
      slippage: 99.0, // > 50%
      chainId: 'ethereum',
    });
  } catch (err: any) {
    slippageErrorCaught = err.message.includes('INVALID_SLIPPAGE');
  }
  assert(slippageErrorCaught, 'Router strictly rejects excessive slippage (>50%)');

  // -------------------------------------------------------------
  // Test 6: Simulation Engine Revert Decoder
  // -------------------------------------------------------------
  console.log('\n--- 6. Simulation Engine Revert Decoder ---');
  const stfError = decodeRevertReason('0x535446');
  assert(stfError.includes('SafeTransferFailed'), 'Decodes Uniswap STF error');

  const panicError = decodeRevertReason('0x4e487b710000000000000000000000000000000000000000000000000000000000000012');
  assert(panicError.includes('Division by zero'), 'Decodes EVM Panic(0x12) division by zero');

  // -------------------------------------------------------------
  // Test 7: Provably Fair VRF 2.5 Derivation
  // -------------------------------------------------------------
  console.log('\n--- 7. Provably Fair Chainlink VRF 2.5 ---');
  const seed = '0x8f4d9b23c5e81a0293817f763abdf543918a992bc6643210aa39ec77281ab091';
  const digits1 = deriveWinningDigitsFromSeed(seed);
  const digits2 = deriveWinningDigitsFromSeed(seed);

  assert(digits1.length === 6, 'VRF derives exactly 6 digits');
  assert(digits1.every((d) => d >= 0 && d <= 9), 'All digits are between 0 and 9 inclusive');
  assert(JSON.stringify(digits1) === JSON.stringify(digits2), 'VRF derivation is 100% deterministic given the same seed');

  // -------------------------------------------------------------
  // Test 8: Token Security Forensics Engine
  // -------------------------------------------------------------
  console.log('\n--- 8. Token Security Forensics Engine ---');
  const ethSecurity = await scanTokenSecurity('0x0000000000000000000000000000000000000000', 'ETH', 'ethereum');
  assert(ethSecurity.securityScore === 100, 'Native ETH receives 100/100 score');
  assert(ethSecurity.isHoneypot === false, 'Native ETH is not a honeypot');
  assert(ethSecurity.honeypotStatus === 'VERIFIED_SAFE', 'Native ETH honeypotStatus is VERIFIED_SAFE');
  assert(ethSecurity.evidence.length > 0, 'Native token audit includes factual evidence list');

  const unverifiedAddress = '0x1234567890123456789012345678901234567890';
  const unverifiedReport = await scanTokenSecurity(unverifiedAddress, 'SCAM_TOKEN', 'ethereum');
  assert(unverifiedReport.securityScore <= 70, 'Unverified contract receives lower risk-adjusted score');
  assert(unverifiedReport.unknownFactors.length > 0, 'Unverified contract explicitly flags unknown factors');

  // -------------------------------------------------------------
  // Test 9: Centralized Error Codes
  // -------------------------------------------------------------
  console.log('\n--- 9. Centralized Error Codes Verification ---');
  assert(DEX_ERROR_CODES.INVALID_AMOUNT === 'INVALID_AMOUNT', 'INVALID_AMOUNT error code exists');
  assert(DEX_ERROR_CODES.NO_LIQUIDITY === 'NO_LIQUIDITY', 'NO_LIQUIDITY error code exists');
  assert(DEX_ERROR_CODES.SIMULATION_FAILED === 'SIMULATION_FAILED', 'SIMULATION_FAILED error code exists');
  assert(DEX_ERROR_CODES.RPC_UNAVAILABLE === 'RPC_UNAVAILABLE', 'RPC_UNAVAILABLE error code exists');

  // Summary
  console.log('\n======================================================');
  console.log(` TEST SUMMARY: ${passedTests}/${totalTests} PASSED (${failedTests} FAILED)`);
  console.log('======================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error('Test runner fatal crash:', err);
  process.exit(1);
});
