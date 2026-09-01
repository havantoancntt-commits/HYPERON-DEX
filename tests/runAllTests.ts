/**
 * HYPERON-DEX Automated Regression & Verification Test Suite
 * Mathematical AMM precision, property-based invariant testing, price feed integrity,
 * routing graph optimization, scanner, simulation engine, and cryptographic VRF tests.
 */

import { UniswapV2Adapter, UniswapV3Adapter, CurveAdapter, BalancerAdapter } from '../server/services/ammEngine';
import { parseUnits, formatUnits } from 'viem';
import { calculateSmartRouteQuote } from '../server/services/router';
import { scanTokenSecurity, scanBytecodeOpcodes } from '../server/services/scanner';
import { getPriceState, getUsdPrice } from '../server/services/priceFeed';
import { decodeRevertReason, SimulationEngine } from '../server/services/simulationEngine';
import { deriveWinningDigitsFromSeed, generateCryptographicTicketNumbers } from '../server/services/lotteryEngine';
import { DEX_ERROR_CODES } from '../src/lib/errorCodes';
import { validateAndCleanCandles } from '../server/services/marketData';
import { poolDiscovery } from '../server/services/poolDiscovery';

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
  // Seed verified pool record so routing calculations are deterministically verifiable offline
  poolDiscovery.seedPoolRecord('ethereum:ETH:USDC:uniswapv3:30', {
    poolAddress: '0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640',
    chainId: 'ethereum',
    dexProtocol: 'Uniswap v3',
    token0Address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    token1Address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    token0Symbol: 'ETH',
    token1Symbol: 'USDC',
    token0Decimals: 18,
    token1Decimals: 6,
    feeBps: 30,
    lastUpdated: Date.now(),
    lastBlockNumber: 21000000n,
    status: 'LIVE',
    v3State: {
      sqrtPriceX96: 4611686018427387904000000000n,
      liquidity: 15000000000000000000n,
      tick: 200000,
      tickSpacing: 60,
      feeTierBps: 30,
      token0Decimals: 18,
      token1Decimals: 6,
      token0Symbol: 'ETH',
      token1Symbol: 'USDC',
    },
  });

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

  // Test strict NO_LIQUIDITY error for unlisted / non-existent token pairs
  let noLiqErrorCaught = false;
  try {
    await calculateSmartRouteQuote({
      fromTokenSymbol: 'NON_EXISTENT_TOKEN_123',
      toTokenSymbol: 'USDC',
      amount: 100,
      slippage: 0.5,
      chainId: 'ethereum',
    });
  } catch (err: any) {
    noLiqErrorCaught = err.message.includes('NO_LIQUIDITY');
  }
  assert(noLiqErrorCaught, 'Router strictly throws NO_LIQUIDITY for unlisted pairs (ZERO SYNTHETIC DATA)');

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
  // Test 9: Opcode Scanner Instruction Disassembly
  // -------------------------------------------------------------
  console.log('\n--- 9. EVM Opcode Disassembly Test ---');
  // Bytecode with 0xff inside PUSH1 data (e.g. 60ff56 - PUSH1 0xff, JUMP)
  const pushDataContainingFF = '0x60ff56';
  const opcodes1 = scanBytecodeOpcodes(pushDataContainingFF);
  assert(opcodes1.hasSelfDestruct === false, 'PUSH1 data 0xff is NOT misclassified as SELFDESTRUCT');

  // Real SELFDESTRUCT opcode (0xff preceded by non-push, e.g. 5b ff - JUMPDEST, SELFDESTRUCT)
  const realSelfDestruct = '0x5bff';
  const opcodes2 = scanBytecodeOpcodes(realSelfDestruct);
  assert(opcodes2.hasSelfDestruct === true, 'Real 0xff outside PUSH correctly identified as SELFDESTRUCT');

  // Real DELEGATECALL (0xf4)
  const realDelegateCall = '0x5bf4';
  const opcodes3 = scanBytecodeOpcodes(realDelegateCall);
  assert(opcodes3.hasDelegateCall === true, 'Real 0xf4 correctly identified as DELEGATECALL');

  // -------------------------------------------------------------
  // Test 10: Market Data Candle Invariant Validation
  // -------------------------------------------------------------
  console.log('\n--- 10. Market Data Candle Invariant Validation ---');
  const validCandles = validateAndCleanCandles([
    { time: 1700000000, open: 100, high: 110, low: 95, close: 105, volume: 1000 },
    { time: 1700000000, open: 100, high: 90, low: 95, close: 105, volume: 1000 }, // Invalid high < open
    { time: 1700000060, open: 105, high: 120, low: 100, close: 115, volume: 1200 },
  ]);
  assert(validCandles.length === 2, 'validateAndCleanCandles removes invalid candle violating invariants');
  assert(validCandles[0].high >= validCandles[0].low, 'Clean candle satisfies high >= low');

  // -------------------------------------------------------------
  // Test 11: Centralized Error Codes
  // -------------------------------------------------------------
  console.log('\n--- 11. Centralized Error Codes Verification ---');
  assert(DEX_ERROR_CODES.INVALID_AMOUNT === 'INVALID_AMOUNT', 'INVALID_AMOUNT error code exists');
  assert(DEX_ERROR_CODES.NO_LIQUIDITY === 'NO_LIQUIDITY', 'NO_LIQUIDITY error code exists');
  assert(DEX_ERROR_CODES.SIMULATION_FAILED === 'SIMULATION_FAILED', 'SIMULATION_FAILED error code exists');
  assert(DEX_ERROR_CODES.USER_ADDRESS_REQUIRED === 'USER_ADDRESS_REQUIRED', 'USER_ADDRESS_REQUIRED error code exists');
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
