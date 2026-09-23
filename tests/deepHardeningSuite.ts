/**
 * Deep Hardening Verification Suite
 * Tests the hardened invariants:
 * - Blockchain Reorganization Detection
 * - Strict Nonce Reconciliation Logic
 * - Uniswap V3 & Hyperon SwapExecuted Event Decoding in ReceiptVerifier
 * - RouteHash Parity & Sender Mismatch Detection
 * - Fail-Closed Treasury Address Integrity
 */

import { TransactionSyncEngine } from '../src/lib/transactionSync';
import { ReceiptVerifier } from '../src/lib/execution/ReceiptVerifier';
import { getFeeRecipientForChain, verifyTreasuryAddress } from '../src/lib/treasuryConfig';
import { TransactionHistoryItem } from '../src/types';
import { Address } from 'viem';

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${msg}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${msg}`);
    failed++;
  }
}

async function runTests() {
  console.log('======================================================');
  console.log(' DEEP REORGANIZATION, NONCE & SECURITY HARDENING SUITE');
  console.log('======================================================\n');

  // --- 1. Reorganization Protection ---
  console.log('--- 1. Blockchain Reorganization Protection ---');
  {
    const tx: TransactionHistoryItem = {
      id: 'tx-1',
      txHash: '0x1111111111111111111111111111111111111111111111111111111111111111',
      chainId: 'ethereum',
      type: 'SWAP',
      status: 'confirmed',
      blockNumber: 19000000,
      blockHash: '0xaaaabbbbccccddddeeeeffff0000111122223333444455556666777788889999',
      gasSpentGwei: 20,
      gasSpentUsd: 1.5,
      timestamp: Date.now() - 60000,
      correlationId: 'c-1',
    };

    // Mock provider where canonical block hash has changed (Reorg!)
    const reorgProvider = {
      request: async ({ method, params }: { method: string; params?: any[] }) => {
        if (method === 'eth_blockNumber') return '0x121eac0'; // block 19000000
        if (method === 'eth_getBlockByNumber') {
          return { hash: '0x9999888877776666555544443333222211110000ffffeeeeddddccccbbbbaaaa' };
        }
        if (method === 'eth_getTransactionReceipt') return null; // Missing on new fork
        return null;
      },
    };

    const result = await TransactionSyncEngine.reconcileTransaction(reorgProvider, tx);
    assert(result.status === 'reorged', 'Transaction status is set to reorged upon block hash divergence');
    assert(result.reorgDetected === true, 'reorgDetected flag is set to true');
  }

  // --- 2. Strict Nonce Reconciliation Logic ---
  console.log('\n--- 2. Strict Nonce Reconciliation Logic ---');
  {
    // Case A: Missing from mempool, no receipt, submittedNonce is UNDEFINED -> Must remain PENDING (No guessing!)
    const txNoNonce: TransactionHistoryItem = {
      id: 'tx-no-nonce',
      txHash: '0x2222222222222222222222222222222222222222222222222222222222222222',
      chainId: 'ethereum',
      type: 'SWAP',
      status: 'pending',
      blockNumber: 0,
      gasSpentGwei: 20,
      gasSpentUsd: 1.5,
      timestamp: Date.now() - 100000,
      correlationId: 'c-2',
      walletAddress: '0x1111111111111111111111111111111111111111',
    };

    const emptyProvider = {
      request: async ({ method }: { method: string }) => {
        if (method === 'eth_blockNumber') return '0x1000';
        if (method === 'eth_getTransactionReceipt') return null;
        if (method === 'eth_getTransactionByHash') return null;
        if (method === 'eth_getTransactionCount') return '0x50'; // Nonce 80
        return null;
      },
    };

    const resNoNonce = await TransactionSyncEngine.reconcileTransaction(emptyProvider, txNoNonce);
    assert(resNoNonce.status === 'pending', 'Missing tx with unknown submittedNonce remains pending (Fail Closed: No guessing)');

    // Case B: Known submittedNonce (5), current latest nonce is 4 -> Still pending
    const txWithNonce5: TransactionHistoryItem = {
      ...txNoNonce,
      submittedNonce: 5,
    };
    const pendingNonceProvider = {
      request: async ({ method }: { method: string }) => {
        if (method === 'eth_blockNumber') return '0x1000';
        if (method === 'eth_getTransactionReceipt') return null;
        if (method === 'eth_getTransactionByHash') return null;
        if (method === 'eth_getTransactionCount') return '0x5'; // latest nonce = 5 (tx 5 not yet mined)
        return null;
      },
    };
    const resNonce5 = await TransactionSyncEngine.reconcileTransaction(pendingNonceProvider, txWithNonce5);
    assert(resNonce5.status === 'pending', 'Transaction with nonce >= on-chain latest nonce remains pending');

    // Case C: Known submittedNonce (5), current latest nonce is 10 -> Dropped/replaced
    const droppedNonceProvider = {
      request: async ({ method }: { method: string }) => {
        if (method === 'eth_blockNumber') return '0x1000';
        if (method === 'eth_getTransactionReceipt') return null;
        if (method === 'eth_getTransactionByHash') return null;
        if (method === 'eth_getTransactionCount') return '0xa'; // latest nonce = 10 (> 5)
        return null;
      },
    };
    const resDropped = await TransactionSyncEngine.reconcileTransaction(droppedNonceProvider, txWithNonce5);
    assert(resDropped.status === 'dropped', 'Transaction with nonce < on-chain nonce and missing receipt is correctly marked dropped');
  }

  // --- 3. Uniswap V3 & SwapExecuted Event Verification ---
  console.log('\n--- 3. Uniswap V3 & SwapExecuted Event Verification ---');
  {
    const userAddr: Address = '0x1234567890123456789012345678901234567890';
    const routerAddr: Address = '0xe592427a0aece92de3edee1f18e0157c05861564'; // Canonical Uniswap V3 Router
    const poolAddr: Address = '0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640';

    // V3 Swap Topic: 0xc42079f94a6350d7e6235f29174924f9d5fb2017966560bc040d99955b76e6f8
    // recipient in topic 2: userAddr
    const userTopic = '0x000000000000000000000000' + userAddr.slice(2).toLowerCase();
    const routerTopic = '0x000000000000000000000000' + routerAddr.slice(2).toLowerCase();

    // Data: amount0: positive (in), amount1: negative 500,000,000 (out) (USDC 6 decimals)
    // 500 USDC = 500 * 10^6 = 500000000 = 0x1dcd6500
    // Two's complement for -500000000:
    const neg500M = (2n ** 256n - 500000000n).toString(16).padStart(64, '0');
    const posAmount0 = '0000000000000000000000000000000000000000000000000100000000000000'; // 1 ETH in

    const v3Receipt = {
      transactionHash: '0x3333333333333333333333333333333333333333333333333333333333333333' as `0x${string}`,
      status: '0x1' as const,
      blockNumber: '0x100',
      blockHash: '0xabcdef',
      from: userAddr,
      to: routerAddr,
      gasUsed: 150000n,
      logs: [
        {
          address: poolAddr,
          topics: [
            '0xc42079f94a6350d7e6235f29174924f9d5fb2017966560bc040d99955b76e6f8',
            routerTopic,
            userTopic,
          ],
          data: '0x' + posAmount0 + neg500M,
        },
      ],
    };

    const v3Verification = ReceiptVerifier.verifyReceipt({
      receipt: v3Receipt as any,
      expectedRecipient: userAddr,
      expectedTokenOut: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // USDC
      amountOutMinimum: 490000000n, // Minimum 490 USDC
      expectedRouter: routerAddr,
      expectedSender: userAddr,
      chainId: 'ethereum',
    });

    assert(v3Verification.verified === true, 'Uniswap V3 Swap receipt verified and output extracted from log');
    assert(v3Verification.actualAmountOut === 500000000n, 'Actual output decoded matches 500,000,000 raw units');

    // RouteHash Mismatch Test:
    const hyperonTopic = '0x159d29c4dd7daebc22d119abebda0b001d8f8ef6134ae1fcb003a566f103de35';
    const expectedRouteHash = '0x1111111111111111111111111111111111111111111111111111111111111111';
    const executedRouteHash = '0x2222222222222222222222222222222222222222222222222222222222222222';

    const hyperonReceipt = {
      transactionHash: '0x4444444444444444444444444444444444444444444444444444444444444444' as `0x${string}`,
      status: '0x1' as const,
      blockNumber: '0x101',
      from: userAddr,
      to: routerAddr,
      logs: [
        {
          address: routerAddr,
          topics: [
            hyperonTopic,
            userTopic,
            routerTopic,
            userTopic,
          ],
          // amountIn (64 hex), amountOut (64 hex), routeHash (64 hex)
          data: '0x' +
            '0000000000000000000000000000000000000000000000000de0b6b3a7640000' +
            '000000000000000000000000000000000000000000000000000000001dcd6500' +
            executedRouteHash.slice(2),
        },
      ],
    };

    const mismatchCheck = ReceiptVerifier.verifyReceipt({
      receipt: hyperonReceipt as any,
      expectedRecipient: userAddr,
      expectedTokenOut: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      amountOutMinimum: 400000000n,
      expectedRouter: routerAddr,
      expectedSender: userAddr,
      chainId: 'ethereum',
      routeHash: expectedRouteHash,
    });

    assert(mismatchCheck.verified === false, 'RouteHash mismatch strictly fails closed as VERIFICATION_FAILED');
  }

  // --- 4. Sender Mismatch Check ---
  console.log('\n--- 4. Sender Mismatch & Target Verification ---');
  {
    const userA: Address = '0x1111111111111111111111111111111111111111';
    const userB: Address = '0x2222222222222222222222222222222222222222';
    const routerAddr: Address = '0xe592427a0aece92de3edee1f18e0157c05861564';

    const spoofedReceipt = {
      transactionHash: '0x5555555555555555555555555555555555555555555555555555555555555555' as `0x${string}`,
      status: '0x1' as const,
      from: userB, // Sender is userB instead of expected userA
      to: routerAddr,
      logs: [],
    };

    const senderCheck = ReceiptVerifier.verifyReceipt({
      receipt: spoofedReceipt as any,
      expectedRecipient: userA,
      expectedTokenOut: '0x0000000000000000000000000000000000000000',
      amountOutMinimum: 1n,
      expectedRouter: routerAddr,
      expectedSender: userA,
      chainId: 'ethereum',
    });

    assert(senderCheck.verified === false, 'Sender mismatch between receipt.from and expectedSender fails closed');
  }

  // --- 5. Treasury Security & Canonical Routing ---
  console.log('\n--- 5. Treasury Security & Fail-Closed Routing ---');
  {
    const ethTreasury = getFeeRecipientForChain('ethereum');
    assert(ethTreasury.startsWith('0x') && ethTreasury.length === 42, 'Ethereum treasury returns valid EVM address');

    const solTreasury = getFeeRecipientForChain('solana');
    assert(solTreasury.length >= 32, 'Solana treasury returns valid base58 address');

    let threwOnUnknown = false;
    try {
      getFeeRecipientForChain('fake-chain-xyz');
    } catch {
      threwOnUnknown = true;
    }
    assert(threwOnUnknown, 'getFeeRecipientForChain strictly throws on unknown chain without defaulting');

    assert(verifyTreasuryAddress('ethereum', ethTreasury) === true, 'verifyTreasuryAddress returns true for valid address');
    assert(verifyTreasuryAddress('ethereum', '0x0000000000000000000000000000000000000000') === false, 'verifyTreasuryAddress returns false for tampered address');
  }

  console.log('\n======================================================');
  console.log(` DEEP HARDENING TESTS: ${passed}/${passed + failed} PASSED (${failed} FAILED)`);
  console.log('======================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
