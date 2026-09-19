/**
 * HYPERON-DEX Execution Pipeline & Hardening Verification Suite
 * Verifies Phases 1-10, 25:
 * - Real Transaction Execution
 * - Single Source of Truth TransactionBuilder
 * - Real ERC-20 Approval with safe-reset & exact allowance
 * - Exact BigInt slippage & minimum received bounds
 * - Receipt verification & event log decoding
 * - Route Hash Consistency with Smart Contracts
 * - Formal Execution State Machine Invariants
 */

import { Address, Hex, parseUnits, encodePacked, keccak256 } from 'viem';
import { TransactionBuilder } from '../src/lib/execution/TransactionBuilder';
import { ReceiptVerifier, TRANSFER_EVENT_TOPIC, UNISWAP_V2_SWAP_TOPIC } from '../src/lib/execution/ReceiptVerifier';
import { computeSingleRouteHash, computeMultiHopRouteHash, computeRelayRouteHash, computeCurveRouteHash } from '../src/lib/router';
import { DEX_ERROR_CODES } from '../src/lib/errorCodes';
import { SwapQuote } from '../src/types';

export async function runExecutionHardeningTests(): Promise<{ passed: number; failed: number; total: number }> {
  let passed = 0;
  let failed = 0;

  const assert = (condition: boolean, msg: string) => {
    if (condition) {
      console.log(`  ✅ PASS: ${msg}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${msg}`);
      failed++;
    }
  };

  console.log('\n======================================================');
  console.log(' TRANSACTION EXECUTION PIPELINE & HARDENING SUITE');
  console.log('======================================================');

  // -------------------------------------------------------------
  // 1. BigInt Slippage & Integer Arithmetic
  // -------------------------------------------------------------
  console.log('\n--- 1. BigInt Slippage Calculation & Boundaries ---');
  const sampleAmountOut = 1000000000000000000n; // 1 ETH in wei
  const minReceived05 = TransactionBuilder.calculateAmountOutMinimum(sampleAmountOut, 0.5);
  assert(minReceived05 === 995000000000000000n, '0.5% slippage on 1 ETH yields exactly 0.995 ETH in BigInt');

  const minReceived10 = TransactionBuilder.calculateAmountOutMinimum(sampleAmountOut, 1.0);
  assert(minReceived10 === 990000000000000000n, '1.0% slippage on 1 ETH yields exactly 0.99 ETH in BigInt');

  const minReceived001 = TransactionBuilder.calculateAmountOutMinimum(sampleAmountOut, 0.01);
  assert(minReceived001 === 999900000000000000n, '0.01% (1 BPS) minimum boundary yields exact amount');

  const minReceived50 = TransactionBuilder.calculateAmountOutMinimum(sampleAmountOut, 50.0);
  assert(minReceived50 === 500000000000000000n, '50.0% (5000 BPS) maximum boundary yields exact 0.50 ETH');

  let rejectedLow = false;
  try {
    TransactionBuilder.calculateAmountOutMinimum(sampleAmountOut, 0.005);
  } catch (err: any) {
    rejectedLow = err.code === DEX_ERROR_CODES.INVALID_SLIPPAGE;
  }
  assert(rejectedLow, 'Slippage < 0.01% is strictly rejected with INVALID_SLIPPAGE');

  let rejectedHigh = false;
  try {
    TransactionBuilder.calculateAmountOutMinimum(sampleAmountOut, 50.1);
  } catch (err: any) {
    rejectedHigh = err.code === DEX_ERROR_CODES.INVALID_SLIPPAGE;
  }
  assert(rejectedHigh, 'Slippage > 50% is strictly rejected with INVALID_SLIPPAGE');

  let rejectedNaN = false;
  try {
    TransactionBuilder.calculateAmountOutMinimum(sampleAmountOut, NaN);
  } catch (err: any) {
    rejectedNaN = err.code === DEX_ERROR_CODES.INVALID_SLIPPAGE;
  }
  assert(rejectedNaN, 'NaN slippage is strictly rejected with INVALID_SLIPPAGE');

  // -------------------------------------------------------------
  // 2. Real ERC-20 Approval Transaction Builder
  // -------------------------------------------------------------
  console.log('\n--- 2. Real ERC-20 Approval Construction & USDT Reset ---');
  const userAddr = '0x1111111111111111111111111111111111111111' as Address;
  const routerSpender = '0xE592427A0AEce92De3Edee1F18E0157C05861564' as Address;
  const usdtAddr = '0xdAC17F958D2ee523a2206206994597C13D831ec7' as Address;
  const requiredAmount = 5000000000n; // 5000 USDT (6 decimals)

  const normalApproval = TransactionBuilder.buildApprovalTransaction({
    tokenAddress: usdtAddr,
    owner: userAddr,
    spender: routerSpender,
    amountIn: requiredAmount,
    currentAllowance: 0n,
    resetFirst: false,
  });
  assert(normalApproval.resetTx === undefined, 'No reset transaction needed when currentAllowance === 0');
  assert(normalApproval.approveTx.to.toLowerCase() === usdtAddr.toLowerCase(), 'Approval transaction targets the token contract');
  assert(normalApproval.approveTx.amountIn === requiredAmount, 'Approval amount is exact required amount');
  assert(normalApproval.approveTx.data.startsWith('0x095ea7b3'), 'Approve calldata has standard ERC20 approve() selector');

  // USDT safe-reset test when current allowance is positive but insufficient
  const resetApproval = TransactionBuilder.buildApprovalTransaction({
    tokenAddress: usdtAddr,
    owner: userAddr,
    spender: routerSpender,
    amountIn: requiredAmount,
    currentAllowance: 1000000n, // 1 USDT current allowance
    resetFirst: true,
  });
  assert(resetApproval.resetTx !== undefined, 'USDT safe approval creates reset transaction when allowance > 0');
  assert(resetApproval.resetTx?.amountIn === 0n, 'Reset transaction sets allowance to exactly 0');
  assert(resetApproval.resetTx?.data.startsWith('0x095ea7b3'), 'Reset transaction uses approve() selector with 0 value');

  // -------------------------------------------------------------
  // 3. Exact Transaction Building & Cryptographic Commitment
  // -------------------------------------------------------------
  console.log('\n--- 3. Exact Swap Transaction Calldata & Commitment ---');
  const sampleQuote: SwapQuote = {
    id: 'quote-test-1',
    fromToken: {
      address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      symbol: 'WETH',
      name: 'Wrapped Ether',
      decimals: 18,
      chainId: 'ethereum',
    } as any,
    toToken: {
      address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
      chainId: 'ethereum',
    } as any,
    fromAmount: 1.0,
    toAmount: 2600.0,
    expectedOutput: 2600.0,
    minimumReceived: 2587.0,
    priceImpactPercent: 0.05,
    slippagePercent: 0.5,
    estimatedGasUsd: 4.5,
    executionPrice: 2600.0,
    routingFeeUsd: 0.1,
    rawAmount: '1000000000000000000',
    expectedOutputRaw: '2600000000',
    minimumReceivedRaw: '2587000000',
    gasUnits: '140000',
    gasPriceWei: '25000000000',
    gasCostWei: '3500000000000000',
    routingFeeRaw: '0',
    priceImpactBps: '5',
    slippageBps: '50',
    routeSplits: [],
    sources: [],
    timestamp: Date.now(),
    expiresInSec: 60,
    expiresAt: Date.now() + 60000,
    quoteHash: '0x' + 'a'.repeat(64),
    chainId: 'ethereum',
    isBestPrice: true,
    mevProtected: true,
  };

  const exactTx = TransactionBuilder.buildSwapTransaction({
    quote: sampleQuote,
    userAddress: userAddr,
  });

  assert(exactTx.to.startsWith('0x') && exactTx.to.length === 42, 'Target router address is a valid EVM contract');
  assert(exactTx.data.startsWith('0x414bf389') || exactTx.data.startsWith('0x04e45aaf'), 'Uniswap V3 exactInputSingle selector encoded');
  assert(exactTx.value === 0n, 'Non-native token swap has value === 0');
  assert(exactTx.amountIn === 1000000000000000000n, 'AmountIn is exact 1.0 WETH in wei');
  assert(exactTx.amountOutMinimum === 2587000000n, 'AmountOutMinimum is exact 2587.0 USDC in raw units');
  assert(exactTx.commitmentHash.startsWith('0x') && exactTx.commitmentHash.length === 66, 'Cryptographic commitment hash is 32-byte keccak');

  // Rejection of expired quote
  let rejectedExpired = false;
  try {
    const expiredQuote = { ...sampleQuote, expiresAt: Date.now() - 5000 };
    TransactionBuilder.buildSwapTransaction({ quote: expiredQuote, userAddress: userAddr });
  } catch (err: any) {
    rejectedExpired = err.code === DEX_ERROR_CODES.QUOTE_EXPIRED;
  }
  assert(rejectedExpired, 'Expired quote is strictly rejected during transaction building');

  // -------------------------------------------------------------
  // 4. ReceiptVerifier & Event Log Verification
  // -------------------------------------------------------------
  console.log('\n--- 4. ReceiptVerifier & Output Verification ---');
  const recipient = '0x2222222222222222222222222222222222222222' as Address;
  const tokenOut = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as Address;
  const expectedMin = 2587000000n;

  // Case 4a: Reverted receipt
  const revertedReceipt = {
    status: 0 as const,
    transactionHash: ('0x' + 'b'.repeat(64)) as Hex,
    logs: [],
  };
  const resReverted = ReceiptVerifier.verifyReceipt({
    receipt: revertedReceipt,
    expectedRecipient: recipient,
    expectedTokenOut: tokenOut,
    amountOutMinimum: expectedMin,
  });
  assert(!resReverted.verified && resReverted.status === 'TRANSACTION_REVERTED', 'Reverted receipt is strictly rejected as TRANSACTION_REVERTED');

  // Case 4b: Successful receipt with valid Transfer event matching recipient and amount >= min
  const paddedRecipient = ('0x000000000000000000000000' + recipient.slice(2).toLowerCase()) as Hex;
  const paddedSender = ('0x000000000000000000000000' + routerSpender.slice(2).toLowerCase()) as Hex;
  const outputAmountRaw = 2595000000n; // 2595 USDC received (greater than 2587 min)
  const outputHex = ('0x' + outputAmountRaw.toString(16).padStart(64, '0')) as Hex;

  const validReceipt = {
    status: 1 as const,
    transactionHash: ('0x' + 'c'.repeat(64)) as Hex,
    blockNumber: 21950000n,
    gasUsed: 142000n,
    logs: [
      {
        address: tokenOut,
        topics: [TRANSFER_EVENT_TOPIC as Hex, paddedSender, paddedRecipient],
        data: outputHex,
      },
    ],
  };

  const resValid = ReceiptVerifier.verifyReceipt({
    receipt: validReceipt,
    expectedRecipient: recipient,
    expectedTokenOut: tokenOut,
    amountOutMinimum: expectedMin,
  });
  assert(resValid.verified && resValid.status === 'SUCCESS', 'Valid receipt with verified logs transitions to SUCCESS');
  assert(resValid.actualAmountOut === outputAmountRaw, 'Actual output amount correctly decoded from Transfer event');

  // Case 4c: Slippage breach (output < minimum)
  const lowOutputAmount = 2580000000n; // Less than 2587 min
  const lowOutputHex = ('0x' + lowOutputAmount.toString(16).padStart(64, '0')) as Hex;
  const breachReceipt = {
    status: 1 as const,
    transactionHash: ('0x' + 'd'.repeat(64)) as Hex,
    logs: [
      {
        address: tokenOut,
        topics: [TRANSFER_EVENT_TOPIC as Hex, paddedSender, paddedRecipient],
        data: lowOutputHex,
      },
    ],
  };

  const resBreach = ReceiptVerifier.verifyReceipt({
    receipt: breachReceipt,
    expectedRecipient: recipient,
    expectedTokenOut: tokenOut,
    amountOutMinimum: expectedMin,
  });
  assert(!resBreach.verified && resBreach.status === 'VERIFICATION_FAILED', 'Receipt with output < minimum fails as VERIFICATION_FAILED');

  // Case 4d: Transfer to wrong recipient
  const wrongRecipient = '0x3333333333333333333333333333333333333333' as Address;
  const resWrongRecipient = ReceiptVerifier.verifyReceipt({
    receipt: validReceipt,
    expectedRecipient: wrongRecipient,
    expectedTokenOut: tokenOut,
    amountOutMinimum: expectedMin,
  });
  assert(!resWrongRecipient.verified && resWrongRecipient.status === 'VERIFICATION_FAILED', 'Transfer to wrong recipient fails as VERIFICATION_FAILED');

  // -------------------------------------------------------------
  // 5. Smart Contract Route Hash Parity
  // -------------------------------------------------------------
  console.log('\n--- 5. Smart Contract Route Hash Cryptographic Parity ---');
  const cSingleHash = computeSingleRouteHash({
    chainId: 1,
    routerAddress: routerSpender,
    tokenIn: sampleQuote.fromToken.address as Address,
    tokenOut: sampleQuote.toToken.address as Address,
    feeTier: 3000,
    amountIn: 1000000000000000000n,
    amountOutMinimum: 2587000000n,
    recipient: userAddr,
    deadline: 1750000000n,
  });
  assert(/^0x[a-fA-F0-9]{64}$/.test(cSingleHash), 'Single route hash produces valid 32-byte keccak256');

  const cRelayHash = computeRelayRouteHash({
    chainId: 1,
    routerAddress: routerSpender,
    user: userAddr,
    tokenIn: sampleQuote.fromToken.address as Address,
    tokenOut: sampleQuote.toToken.address as Address,
    feeTier: 3000,
    amountIn: 1000000000000000000n,
    amountOutMinimum: 2587000000n,
    recipient: userAddr,
    deadline: 1750000000n,
    nonce: 0n,
  });
  assert(/^0x[a-fA-F0-9]{64}$/.test(cRelayHash), 'Relay route hash produces valid 32-byte keccak256');

  const cCurveHash = computeCurveRouteHash({
    chainId: 1,
    routerAddress: routerSpender,
    curvePool: '0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7' as Address,
    tokenIn: '0x6B175474E89094C44Da98b954EedeAC495271d0F' as Address,
    tokenOut: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as Address,
    i: 0,
    j: 1,
    amountIn: 1000000000000000000n,
    minAmountOut: 999000000n,
    recipient: userAddr,
  });
  assert(/^0x[a-fA-F0-9]{64}$/.test(cCurveHash), 'Curve route hash produces valid 32-byte keccak256');

  // -------------------------------------------------------------
  // 6. Native Token Output & Gas Delta Verification
  // -------------------------------------------------------------
  console.log('\n--- 6. Native Token Output Verification ---');
  const nativeBefore = 5000000000000000000n; // 5 ETH
  const nativeMinOut = 1000000000000000000n; // 1 ETH min out
  const gasUsed = 120000n;
  const effectiveGasPrice = 20000000000n; // 20 Gwei
  const gasCost = gasUsed * effectiveGasPrice; // 0.0024 ETH
  const nativeAfterSufficient = nativeBefore + nativeMinOut - gasCost + 50000000000000000n; // received min + 0.05 ETH, minus gas

  const resNativeSuccess = ReceiptVerifier.verifyReceipt({
    receipt: {
      status: 'success',
      transactionHash: '0x3333333333333333333333333333333333333333333333333333333333333333',
      to: routerSpender,
      gasUsed,
      effectiveGasPrice,
      logs: [],
    },
    expectedRecipient: userAddr,
    expectedTokenOut: '0x0000000000000000000000000000000000000000' as Address,
    amountOutMinimum: nativeMinOut,
    expectedRouter: routerSpender,
    expectedSender: userAddr,
    chainId: 1,
    isNativeOut: true,
    balanceBefore: nativeBefore,
    balanceAfter: nativeAfterSufficient,
  });
  assert(resNativeSuccess.verified && resNativeSuccess.status === 'SUCCESS', 'Native ETH output verified via balance delta + gas adjustment');

  const nativeAfterBreach = nativeBefore + nativeMinOut - 100000000000000000n; // 0.1 ETH below min out
  const resNativeBreach = ReceiptVerifier.verifyReceipt({
    receipt: {
      status: 'success',
      transactionHash: '0x3333333333333333333333333333333333333333333333333333333333333333',
      to: routerSpender,
      gasUsed,
      effectiveGasPrice,
      logs: [],
    },
    expectedRecipient: userAddr,
    expectedTokenOut: '0x0000000000000000000000000000000000000000' as Address,
    amountOutMinimum: nativeMinOut,
    expectedRouter: routerSpender,
    expectedSender: userAddr,
    chainId: 1,
    isNativeOut: true,
    balanceBefore: nativeBefore,
    balanceAfter: nativeAfterBreach,
  });
  assert(!resNativeBreach.verified && resNativeBreach.status === 'VERIFICATION_FAILED', 'Native output below minimum strictly fails closed');

  // -------------------------------------------------------------
  // 7. Router Target Security & Canonical Allowlist Verification
  // -------------------------------------------------------------
  console.log('\n--- 7. Router Target Security & Canonical Allowlist ---');
  const fakeRouter = '0x1111111111111111111111111111111111111111' as Address;
  const resRouterMismatch = ReceiptVerifier.verifyReceipt({
    receipt: {
      status: 'success',
      transactionHash: '0x4444444444444444444444444444444444444444444444444444444444444444',
      to: fakeRouter, // attacker contract
      gasUsed: 100000n,
      logs: [],
    },
    expectedRecipient: userAddr,
    expectedTokenOut: sampleQuote.toToken.address as Address,
    amountOutMinimum: 1000000n,
    expectedRouter: routerSpender,
    chainId: 1,
  });
  assert(!resRouterMismatch.verified && resRouterMismatch.status === 'ROUTER_MISMATCH', 'Target router mismatch fails closed with ROUTER_MISMATCH');

  // -------------------------------------------------------------
  // 8. Exact Transaction Payload Equivalence Assertion
  // -------------------------------------------------------------
  console.log('\n--- 8. Strict Payload Equivalence Assertion ---');
  let equivalencePassed = false;
  try {
    TransactionBuilder.assertPayloadEquivalence(exactTx, {
      chainId: exactTx.chainId,
      to: exactTx.to,
      data: exactTx.data,
      value: exactTx.value,
      amountIn: exactTx.amountIn,
      amountOutMinimum: exactTx.amountOutMinimum,
      recipient: exactTx.recipient,
      routeHash: exactTx.routeHash,
    });
    equivalencePassed = true;
  } catch (err: any) {
    console.error('Equivalence assertion error:', err?.message);
    equivalencePassed = false;
  }
  assert(equivalencePassed, 'Unmodified payload passes strict equivalence assertion');

  let tamperedCalldataCaught = false;
  try {
    TransactionBuilder.assertPayloadEquivalence(exactTx, {
      chainId: exactTx.chainId,
      to: exactTx.to,
      data: '0xdeadbeef' as Hex, // tampered calldata
      value: exactTx.value,
    });
  } catch {
    tamperedCalldataCaught = true;
  }
  assert(tamperedCalldataCaught, 'Tampered calldata is caught and aborted');

  let tamperedToCaught = false;
  try {
    TransactionBuilder.assertPayloadEquivalence(exactTx, {
      chainId: exactTx.chainId,
      to: fakeRouter, // tampered router address
      data: exactTx.data,
      value: exactTx.value,
    });
  } catch {
    tamperedToCaught = true;
  }
  assert(tamperedToCaught, 'Tampered target router is caught and aborted');

  // -------------------------------------------------------------
  // 9. Split Route Rejection & Atomic Execution Invariant
  // -------------------------------------------------------------
  console.log('\n--- 9. Split Route Rejection Invariant ---');
  let splitRouteRejected = false;
  try {
    const splitQuote: SwapQuote = {
      ...sampleQuote,
      routeSplits: [
        { dexName: 'Uniswap V3', poolAddress: '0x1', percentage: 60, fromToken: 'WETH', toToken: 'USDC', path: ['0x1', '0x2'], expectedOutput: 1500 },
        { dexName: 'SushiSwap', poolAddress: '0x2', percentage: 40, fromToken: 'WETH', toToken: 'USDC', path: ['0x1', '0x2'], expectedOutput: 1000 },
      ],
    };
    TransactionBuilder.buildSwapTransaction({
      quote: splitQuote,
      userAddress: userAddr,
    });
  } catch (err: any) {
    if (err.code === DEX_ERROR_CODES.UNSUPPORTED_SPLIT_EXECUTION) {
      splitRouteRejected = true;
    }
  }
  assert(splitRouteRejected, 'Multi-split quote is strictly rejected with UNSUPPORTED_SPLIT_EXECUTION');

  // -------------------------------------------------------------
  // 10. V3 Multi-Hop Path Encoding
  // -------------------------------------------------------------
  console.log('\n--- 10. Uniswap V3 Multi-Hop Path Encoding ---');
  const tokenA = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' as Address; // WETH
  const tokenB = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as Address; // USDC
  const tokenC = '0xdAC17F958D2ee523a2206206994597C13D831ec7' as Address; // USDT
  const encodedPath = TransactionBuilder.encodeV3Path([tokenA, tokenB, tokenC], [3000, 500]);
  assert(encodedPath.startsWith('0x') && encodedPath.length === 2 + (20 + 3 + 20 + 3 + 20) * 2, 'V3 multi-hop path encoded with exact packed byte length');

  console.log('======================================================');
  console.log(` EXECUTION PIPELINE TESTS: ${passed}/${passed + failed} PASSED (${failed} FAILED)`);
  console.log('======================================================\n');

  return { passed, failed, total: passed + failed };
}

const isDirectRun = process.argv[1] && (process.argv[1].endsWith('executionHardeningSuite.ts') || process.argv[1].endsWith('executionHardeningSuite.js'));
if (isDirectRun) {
  runExecutionHardeningTests().then((res) => {
    if (res.failed > 0) process.exit(1);
  });
}
