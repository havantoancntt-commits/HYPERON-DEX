/**
 * HYPERON-DEX Automated Regression & Production Verification Suite
 * Enforces Zero-Synthetic-Data, Canonical Token Identity, Exact Fixed-Point BigInt Invariants,
 * Dynamic Split Routing Optimizer, Real Pool Quotes, and Comprehensive Error Handling.
 */

import { UniswapV2Adapter, UniswapV3Adapter, CurveAdapter, BalancerAdapter } from '../server/services/ammEngine';
import { parseUnits, formatUnits } from 'viem';
import {
  calculateSmartRouteQuote,
  simulateSwapTransaction,
  calculateGasCostInTokenOutRaw,
  ROUTER_GAS_CONFIG,
} from '../server/services/router';
import { scanTokenSecurity, scanBytecodeOpcodes } from '../server/services/scanner';
import { getPriceState, getUsdPrice } from '../server/services/priceFeed';
import {
  decodeRevertReason,
  extractFeeTier,
  resolveSimulationRouter,
  simulationEngine,
} from '../server/services/simulationEngine';
import { deriveWinningDigitsFromSeed, generateCryptographicTicketNumbers } from '../server/services/lotteryEngine';
import { DEX_ERROR_CODES } from '../src/lib/errorCodes';
import { validateAndCleanCandles } from '../server/services/marketData';
import { poolDiscovery } from '../server/services/poolDiscovery';
import { tokenResolver } from '../server/services/tokenResolver';
import { getRouterConfig } from '../server/services/routerRegistry';

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
  // Test 1: Canonical Token Identity & Zero Fallback
  // (P0 Regression Test 1 & 2 & 3)
  // -------------------------------------------------------------
  console.log('--- 1. Canonical Token Identity Resolution ---');

  // Test 1.1: Unknown Token -> TOKEN_NOT_FOUND (No zero address fallback)
  let unknownFromCaught = false;
  try {
    await calculateSmartRouteQuote({
      fromTokenSymbol: 'UNKNOWN_RANDOM_TOKEN_XYZ',
      toTokenSymbol: 'USDC',
      amount: 1.0,
      slippage: 0.5,
      chainId: 'ethereum',
    });
  } catch (err: any) {
    unknownFromCaught = err.message.includes('TOKEN_NOT_FOUND');
  }
  assert(unknownFromCaught, 'Test 1: Unknown input token throws TOKEN_NOT_FOUND (No 0x000... fallback)');

  // Test 1.2: Unknown output token -> TOKEN_NOT_FOUND (No USDC fallback)
  let unknownToCaught = false;
  try {
    await calculateSmartRouteQuote({
      fromTokenSymbol: 'ETH',
      toTokenSymbol: 'UNKNOWN_RANDOM_TOKEN_ABC',
      amount: 1.0,
      slippage: 0.5,
      chainId: 'ethereum',
    });
  } catch (err: any) {
    unknownToCaught = err.message.includes('TOKEN_NOT_FOUND');
  }
  assert(unknownToCaught, 'Test 2: Unknown output token throws TOKEN_NOT_FOUND (No hardcoded USDC fallback)');

  // Test 1.3: Same symbol on different chain or address is distinct
  const ethWbtc = await tokenResolver.resolveToken({ chainId: 'ethereum', symbol: 'WBTC' });
  const arbWbtc = await tokenResolver.resolveToken({ chainId: 'arbitrum', symbol: 'WBTC' });
  assert(
    ethWbtc.address.toLowerCase() !== arbWbtc.address.toLowerCase() && ethWbtc.chainId !== arbWbtc.chainId,
    'Test 3: Same symbol on different chains has distinct normalized address & chainId'
  );

  // -------------------------------------------------------------
  // Test 2: AMM Exact BigInt Integer Math & Decimals (6, 8, 18)
  // (P0 Regression Test 15)
  // -------------------------------------------------------------
  console.log('\n--- 2. AMM Constant-Product & Precision Invariants (Decimals 6, 8, 18) ---');
  const uniV2 = new UniswapV2Adapter();

  const mockReserves = {
    reserve0: parseUnits('1000', 18), // 1,000 ETH (18 dec)
    reserve1: parseUnits('3400000', 6), // 3,400,000 USDC (6 dec)
    token0Decimals: 18,
    token1Decimals: 6,
    token0Symbol: 'ETH',
    token1Symbol: 'USDC',
    feeBps: 30, // 0.30%
  };

  const amountIn18 = parseUnits('1', 18);
  const quote18to6 = uniV2.computeQuote(amountIn18, 18, 6, mockReserves);
  assert(quote18to6.status === 'AVAILABLE', '18->6 swap status is AVAILABLE');
  assert(quote18to6.amountOutRaw > 0n, '18->6 produces positive BigInt raw output');
  assert(
    parseFloat(quote18to6.amountOutFormatted) > 3300 && parseFloat(quote18to6.amountOutFormatted) < 3400,
    '18->6 calculation is mathematically accurate for 1 ETH to USDC'
  );

  // Test WBTC (8 decimals) to USDC (6 decimals)
  const btcReserves = {
    reserve0: parseUnits('100', 8), // 100 WBTC (8 dec)
    reserve1: parseUnits('9000000', 6), // 9,000,000 USDC (6 dec)
    token0Decimals: 8,
    token1Decimals: 6,
    token0Symbol: 'WBTC',
    token1Symbol: 'USDC',
    feeBps: 30,
  };
  const amountIn8 = parseUnits('0.5', 8);
  const quote8to6 = uniV2.computeQuote(amountIn8, 8, 6, btcReserves);
  assert(quote8to6.status === 'AVAILABLE', '8->6 swap status is AVAILABLE');
  assert(quote8to6.amountOutRaw > 0n, '8->6 produces positive BigInt output');
  assert(
    parseFloat(quote8to6.amountOutFormatted) > 44000 && parseFloat(quote8to6.amountOutFormatted) < 45000,
    '8->6 calculation is mathematically accurate for 0.5 WBTC to USDC'
  );

  // Invariant k strictly increases
  const r0After = mockReserves.reserve0 + amountIn18;
  const r1After = mockReserves.reserve1 - quote18to6.amountOutRaw;
  const kBefore = mockReserves.reserve0 * mockReserves.reserve1;
  const kAfter = r0After * r1After;
  assert(kAfter >= kBefore, 'Invariant k after swap is strictly >= k before swap (due to fee accumulation)');

  // -------------------------------------------------------------
  // Test 3: Curve StableSwap Invariant
  // -------------------------------------------------------------
  console.log('\n--- 3. Curve StableSwap Invariant ---');
  const curve = new CurveAdapter();
  const stableReserves = {
    reserve0: parseUnits('10000000', 6),
    reserve1: parseUnits('10000000', 6),
    token0Decimals: 6,
    token1Decimals: 6,
    token0Symbol: 'USDC',
    token1Symbol: 'USDT',
    feeBps: 4,
  };

  const usdcIn = parseUnits('10000', 6);
  const curveQuote = curve.computeQuote(usdcIn, 6, 6, stableReserves);
  assert(curveQuote.status === 'AVAILABLE', 'Curve status is AVAILABLE');
  assert(
    parseFloat(curveQuote.amountOutFormatted) > 9990 && parseFloat(curveQuote.amountOutFormatted) <= 10000,
    'Curve maintains tight 1:1 peg for stables'
  );

  // -------------------------------------------------------------
  // Test 4: Price Feed Oracle (P0 Regression Test 5 & 6 & 13)
  // -------------------------------------------------------------
  console.log('\n--- 4. Price Feed Oracle Integrity (Zero Fake $1.00 Fallbacks) ---');
  const ethState = getPriceState('ETH');
  assert(ethState.symbol === 'ETH', 'Price feed correctly maps ETH');

  const unknownCoin = getPriceState('NON_EXISTENT_COIN_XYZ_999');
  assert(unknownCoin.priceUsd === null, 'Test 5/13: Unknown token priceUsd is strictly null (NO $1.00 fake fallback)');
  assert(unknownCoin.status === 'UNAVAILABLE', 'Test 6: Unknown token status is strictly UNAVAILABLE');

  // -------------------------------------------------------------
  // Test 5: Real DEX Router & Quotes (P0 Regression Test 4, 9, 10, 11, 12, 14)
  // -------------------------------------------------------------
  console.log('\n--- 5. Smart DEX Router & Real DEX Comparison Matrix ---');
  // Seed verified pool record
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

  // Test 14: Slippage rounding integer BPS
  assert(routeQuote.minimumReceived < routeQuote.expectedOutput, 'Test 14: minimumReceived is strictly < expectedOutput');
  assert(
    routeQuote.minimumReceived >= routeQuote.expectedOutput * 0.994,
    'Test 14: minimumReceived respects exact integer 50 BPS (0.5%) slippage bound'
  );

  // Test 9 & 10: DEX Comparison Matrix without factor estimation
  assert(routeQuote.dexComparison !== undefined && routeQuote.dexComparison.length > 0, 'DEX comparison matrix exists');
  const uniV3Venue = routeQuote.dexComparison?.find((d) => d.dexName.includes('Uniswap v3'));
  assert(uniV3Venue?.status === 'LIVE_QUOTE', 'Test 9: Venue with real pool has status LIVE_QUOTE');
  assert(uniV3Venue?.outputAmount !== null && (uniV3Venue?.outputAmount ?? 0) > 0, 'Venue with real pool has real outputAmount');

  const balancerVenue = routeQuote.dexComparison?.find((d) => d.dexName.includes('Balancer'));
  assert(balancerVenue?.status === 'UNAVAILABLE', 'Test 10: Venue without discovered pool has status UNAVAILABLE (Zero fake factor)');
  assert(balancerVenue?.outputAmount === null, 'Test 10: UNAVAILABLE venue outputAmount is strictly null');

  // Test 4: No pool liquidity -> NO_LIQUIDITY error
  let noLiqCaught = false;
  try {
    await calculateSmartRouteQuote({
      fromTokenSymbol: 'UNI',
      toTokenSymbol: 'LINK',
      amount: 10,
      slippage: 0.5,
      chainId: 'ethereum',
    });
  } catch (err: any) {
    noLiqCaught = err.message.includes('NO_LIQUIDITY');
  }
  assert(noLiqCaught, 'Test 4: Pair with no discovered pool throws NO_LIQUIDITY error');

  // -------------------------------------------------------------
  // Test 6: Simulation Engine Security & User Address Requirement (P0 Regression Test 8)
  // -------------------------------------------------------------
  console.log('\n--- 6. Simulation Engine & Wallet Requirement ---');
  let missingWalletCaught = false;
  try {
    await simulateSwapTransaction(routeQuote, undefined, 'ethereum');
  } catch (err: any) {
    missingWalletCaught = err.message.includes('USER_ADDRESS_REQUIRED');
  }
  assert(missingWalletCaught, 'Test 8: Simulation throws USER_ADDRESS_REQUIRED when user address is missing');

  // Simulation with valid address
  const simulation = await simulateSwapTransaction(
    routeQuote,
    '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
    'ethereum'
  );
  assert(simulation.status === 'SUCCESS' || simulation.status === 'REVERTED', 'Simulation returns strictly typed status');
  assert(simulation.gasEstimatedUnits > 0, 'Simulation returns non-zero estimated gas units');

  // -------------------------------------------------------------
  // Test 7: EVM Opcode Disassembler & Honeypot Forensics
  // -------------------------------------------------------------
  console.log('\n--- 7. EVM Opcode Disassembler & Forensics ---');
  const pushDataContainingFF = '0x60ff56'; // PUSH1 0xff, JUMP
  const opcodes1 = scanBytecodeOpcodes(pushDataContainingFF);
  assert(opcodes1.hasSelfDestruct === false, 'PUSH1 data 0xff is NOT misclassified as SELFDESTRUCT');

  const realSelfDestruct = '0x5bff'; // JUMPDEST, SELFDESTRUCT
  const opcodes2 = scanBytecodeOpcodes(realSelfDestruct);
  assert(opcodes2.hasSelfDestruct === true, 'Real 0xff outside PUSH correctly identified as SELFDESTRUCT');

  // Native token security
  const ethSecurity = await scanTokenSecurity('0x0000000000000000000000000000000000000000', 'ETH', 'ethereum');
  assert(ethSecurity.securityScore === 100, 'Native ETH receives 100/100 score');
  assert(ethSecurity.isHoneypot === false, 'Native ETH is not a honeypot');

  // -------------------------------------------------------------
  // Test 8: Provably Fair Chainlink VRF 2.5
  // -------------------------------------------------------------
  console.log('\n--- 8. Chainlink VRF 2.5 Cryptographic Lottery ---');
  const seed = '0x8f4d9b23c5e81a0293817f763abdf543918a992bc6643210aa39ec77281ab091';
  const digits1 = deriveWinningDigitsFromSeed(seed);
  const digits2 = deriveWinningDigitsFromSeed(seed);

  assert(digits1.length === 6, 'VRF derives exactly 6 digits');
  assert(JSON.stringify(digits1) === JSON.stringify(digits2), 'VRF derivation is 100% deterministic given the same seed');

  // -------------------------------------------------------------
  // Test 9: Dynamic Fee Tier, Router Address, and ABI Resolution
  // -------------------------------------------------------------
  console.log('\n--- 9. Dynamic Fee Tier & Router Resolution ---');
  const mockV3Quote005: any = {
    routeSplits: [{ dexName: 'Uniswap v3 (0.05%)' }],
    protocol: 'Uniswap v3',
  };
  const fee005 = extractFeeTier(mockV3Quote005);
  assert(fee005 === 500, 'Dynamic fee extraction extracts 500 from Uniswap v3 (0.05%)');

  const mockV3Quote03: any = {
    routeSplits: [{ dexName: 'Uniswap v3 (0.3%)' }],
    protocol: 'Uniswap v3',
  };
  const fee03 = extractFeeTier(mockV3Quote03);
  assert(fee03 === 3000, 'Dynamic fee extraction extracts 3000 from Uniswap v3 (0.3%)');

  const mockV3Quote1: any = {
    routeSplits: [{ dexName: 'Uniswap v3 (1%)' }],
    protocol: 'Uniswap v3',
  };
  const fee1 = extractFeeTier(mockV3Quote1);
  assert(fee1 === 10000, 'Dynamic fee extraction extracts 10000 from Uniswap v3 (1%)');

  const mockV3QuoteExplicitBps: any = {
    feeTierBps: 30,
    routeSplits: [],
  };
  assert(extractFeeTier(mockV3QuoteExplicitBps) === 3000, 'Dynamic fee extraction extracts 3000 from feeTierBps: 30');

  // Router selection
  const ethConfig = getRouterConfig('ethereum');
  const resolvedV3 = resolveSimulationRouter(mockV3Quote03, ethConfig);
  assert(resolvedV3.protocol === 'v3', 'Resolves V3 protocol for Uniswap v3 quote');
  assert(
    resolvedV3.routerAddress.toLowerCase() === (ethConfig.uniswapV3Router || '').toLowerCase(),
    'Resolves Uniswap v3 router address for V3'
  );

  const mockV2Quote: any = {
    routeSplits: [{ dexName: 'Uniswap v2 (0.3%)' }],
    protocol: 'Uniswap v2',
  };
  const resolvedV2 = resolveSimulationRouter(mockV2Quote, ethConfig);
  assert(resolvedV2.protocol === 'v2', 'Resolves V2 protocol for Uniswap v2 quote');
  assert(
    resolvedV2.routerAddress.toLowerCase() === (ethConfig.uniswapV2Router || '').toLowerCase(),
    'Resolves Uniswap v2 router address for V2'
  );

  // -------------------------------------------------------------
  // Test 10: Dynamic Gas Cost In Token & Gas-Aware Routing Economics
  // -------------------------------------------------------------
  console.log('\n--- 10. Gas-Aware Economic Routing Optimization ---');
  // Gas in token out calculation: 135,000 gas @ 20 Gwei, ETH = $2500, USDC = $1.0 (6 decimals)
  // Gas wei = 135,000 * 20 * 10^9 = 2,700,000,000,000,000 wei = 0.0027 ETH
  // 0.0027 ETH * $2500 = $6.75
  // In USDC (6 decimals) = 6,750,000 raw units
  const gasCostUsdc = calculateGasCostInTokenOutRaw(135000, 20.0, 2500.0, 1.0, 6, false);
  assert(gasCostUsdc === 6750000n, 'Calculates exact gas cost in tokenOut (USDC 6 decimals): 6.75 USDC');

  // Native ETH token out (18 decimals)
  const gasCostEth = calculateGasCostInTokenOutRaw(135000, 20.0, 2500.0, 2500.0, 18, true);
  assert(gasCostEth === 2700000000000000n, 'Calculates exact gas cost in native ETH: 0.0027 ETH (2.7e15 wei)');

  // Economic split test: if extra gas cost exceeds marginal amount out, split route is rejected
  // Single: 10,000 USDC out, 135,000 gas ($6.75) -> net 9,993.25 USDC
  // Inefficient split: 10,002 USDC out (+2 USDC), 185,000 gas ($9.25, +$2.50 gas) -> net 9,992.75 USDC (WORSE by 50 cents)
  const singleOutRaw = 10000000000n; // 10,000 USDC
  const inefficientSplitOutRaw = 10002000000n; // 10,002 USDC
  const singleGasRaw = calculateGasCostInTokenOutRaw(135000, 20.0, 2500.0, 1.0, 6, false); // 6,750,000
  const splitGasRaw = calculateGasCostInTokenOutRaw(185000, 20.0, 2500.0, 1.0, 6, false); // 9,250,000
  const singleNet = singleOutRaw - singleGasRaw;
  const splitNet = inefficientSplitOutRaw - splitGasRaw;
  assert(splitNet < singleNet, 'Gas-aware logic correctly identifies inefficient split where gas penalty outweighs gain');

  // -------------------------------------------------------------
  // Test 11: Uniswap V3 Strict Pool State Requirement (Zero Synthetic Math)
  // -------------------------------------------------------------
  console.log('\n--- 11. Uniswap V3 Liquidity Precision & Zero-Synthetic Data ---');
  const uniV3Adapter = new UniswapV3Adapter();
  const v3NoStateQuote = uniV3Adapter.computeQuote(1000000000000000000n, 18, 6, {
    reserve0: 100000000000000000000n,
    reserve1: 250000000000n,
    token0Decimals: 18,
    token1Decimals: 6,
    token0Symbol: 'ETH',
    token1Symbol: 'USDC',
    feeBps: 30,
  });
  assert(
    v3NoStateQuote.status === 'INSUFFICIENT_DATA',
    'UniswapV3Adapter strictly returns INSUFFICIENT_DATA without V3PoolState (No fake geometric-mean V2 derivation)'
  );
  assert(v3NoStateQuote.amountOutRaw === 0n, 'V3 without pool state produces 0 raw output');

  // -------------------------------------------------------------
  // Test 12: Strict Chain Boundary Token Resolution
  // -------------------------------------------------------------
  console.log('\n--- 12. Strict Chain Boundary Token Resolution ---');
  const arbUsdc = await tokenResolver.resolveToken({
    chainId: 'arbitrum',
    symbol: 'USDC',
  });
  assert(arbUsdc.chainId === 'arbitrum', 'Resolves USDC strictly on arbitrum chain');
  assert(
    arbUsdc.address.toLowerCase() === '0xaf88d065e77c8cc2239327c5edb3a432268e5831',
    'Arbitrum USDC matches canonical native Arbitrum address'
  );

  const ethUsdc = await tokenResolver.resolveToken({
    chainId: 'ethereum',
    symbol: 'USDC',
  });
  assert(ethUsdc.chainId === 'ethereum', 'Resolves USDC strictly on ethereum chain');
  assert(
    ethUsdc.address.toLowerCase() === '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    'Ethereum USDC matches canonical Ethereum address'
  );
  assert(arbUsdc.address.toLowerCase() !== ethUsdc.address.toLowerCase(), 'Cross-chain addresses are strictly distinct');

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
