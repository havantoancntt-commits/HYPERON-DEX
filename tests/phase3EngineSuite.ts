import assert from 'node:assert';
import { getChainConfig, validateChainId, isSupportedChain, DexChainError } from '../src/lib/chainConfig';
import { BalanceEngine } from '../src/lib/balanceEngine';
import { ApprovalEngine } from '../src/lib/approvalEngine';
import { TransactionSyncEngine } from '../src/lib/transactionSync';
import { parseUnits, formatUnits } from 'viem';

console.log('======================================================');
console.log(' PHASE 3 & PRODUCTION REFACTOR VERIFICATION SUITE');
console.log('======================================================\n');

let passed = 0;
let failed = 0;

async function it(description: string, fn: () => void | Promise<void>) {
  try {
    await fn();
    console.log(`  ✅ PASS: ${description}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${description}`, err);
    failed++;
  }
}

async function runTests() {
  console.log('--- 1. Unified Chain Configuration & Fail-Closed Strictness ---');

  await it('validateChainId accepts supported chain names', () => {
    assert.strictEqual(validateChainId('ethereum'), 'ethereum');
    assert.strictEqual(validateChainId('base'), 'base');
    assert.strictEqual(validateChainId('arbitrum'), 'arbitrum');
    assert.strictEqual(validateChainId('optimism'), 'optimism');
    assert.strictEqual(validateChainId('bsc'), 'bsc');
    assert.strictEqual(validateChainId('polygon'), 'polygon');
  });

  await it('validateChainId accepts numeric chain IDs in string or number format', () => {
    assert.strictEqual(validateChainId('1'), 'ethereum');
    assert.strictEqual(validateChainId(8453), 'base');
    assert.strictEqual(validateChainId('42161'), 'arbitrum');
    assert.strictEqual(validateChainId('0x1'), 'ethereum');
    assert.strictEqual(validateChainId('0x2105'), 'base');
  });

  await it('validateChainId strictly rejects unsupported chain with DexChainError', () => {
    let thrown = false;
    try {
      validateChainId('solana');
    } catch (err) {
      thrown = true;
      assert.strictEqual(err instanceof DexChainError, true);
      assert.strictEqual((err as DexChainError).code, 'INVALID_CHAIN');
    }
    assert.strictEqual(thrown, true);
  });

  await it('isSupportedChain returns false for empty or unknown chain ID without throwing', () => {
    assert.strictEqual(isSupportedChain('unknown_net'), false);
    assert.strictEqual(isSupportedChain(999999), false);
    assert.strictEqual(isSupportedChain('ethereum'), true);
  });

  await it('getChainConfig returns canonical explorer and RPC configurations', () => {
    const ethConfig = getChainConfig('ethereum');
    assert.strictEqual(ethConfig.numericChainId, 1);
    assert.strictEqual(ethConfig.hexChainId, '0x1');
    assert.strictEqual(ethConfig.nativeCurrency.symbol, 'ETH');
    assert.strictEqual(ethConfig.name, 'Ethereum Mainnet');

    const baseConfig = getChainConfig('base');
    assert.strictEqual(baseConfig.numericChainId, 8453);
    assert.strictEqual(baseConfig.hexChainId, '0x2105');
  });

  console.log('\n--- 2. Precision BalanceEngine Safe Calculations ---');

  await it('BalanceEngine accurately converts wei to formatted string without float loss', () => {
    const rawWei = 1500000000000000000n; // 1.5 ETH
    const formatted = BalanceEngine.rawToFormatted(rawWei, 18);
    assert.strictEqual(formatted, '1.5');
  });

  await it('BalanceEngine safely handles 6-decimal tokens (USDC/USDT)', () => {
    const rawUnits = 2500500000n; // 2500.5 USDC
    const formatted = BalanceEngine.rawToFormatted(rawUnits, 6);
    assert.strictEqual(formatted, '2500.5');
    assert.strictEqual(BalanceEngine.formattedToRaw('2500.5', 6), rawUnits);
  });

  await it('BalanceEngine returns 0n on invalid input without crashing', () => {
    assert.strictEqual(BalanceEngine.formattedToRaw('', 18), 0n);
    assert.strictEqual(BalanceEngine.formattedToRaw('invalid_num', 18), 0n);
  });

  console.log('\n--- 3. On-Chain ApprovalEngine Rules & Invariants ---');

  await it('ApprovalEngine correctly flags sufficient allowance', async () => {
    // Mock public client
    const mockClient = {
      readContract: async () => 1000000000n,
    } as any;

    const res = await ApprovalEngine.checkApproval(
      mockClient,
      '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      '0x1111111111111111111111111111111111111111',
      '0x2222222222222222222222222222222222222222',
      500000000n,
      'ethereum'
    );

    assert.strictEqual(res.isApproved, true);
    assert.strictEqual(res.currentAllowance, 1000000000n);
    assert.strictEqual(res.needsReset, false);
  });

  await it('ApprovalEngine detects USDT on Ethereum requiring reset if allowance > 0 and < required', async () => {
    const usdtAddress = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
    const mockClient = {
      readContract: async () => 500n, // Non-zero current allowance
    } as any;

    const res = await ApprovalEngine.checkApproval(
      mockClient,
      usdtAddress,
      '0x1111111111111111111111111111111111111111',
      '0x2222222222222222222222222222222222222222',
      1000000n,
      'ethereum'
    );

    assert.strictEqual(res.isApproved, false);
    assert.strictEqual(res.needsReset, true);
  });

  console.log('\n--- 4. TransactionSyncEngine & Reorg Reconciliation ---');

  await it('TransactionSyncEngine records and updates transaction states', () => {
    const tx = {
      id: 'tx-sync-1',
      txHash: '0xabc123',
      chainId: 'ethereum' as const,
      type: 'SWAP' as const,
      fromToken: 'ETH',
      toToken: 'USDC',
      fromAmount: 1,
      toAmount: 2600,
      timestamp: Date.now(),
      status: 'pending' as const,
      blockNumber: 19500000,
      correlationId: 'corr-1',
    };

    TransactionSyncEngine.recordTransaction(tx);
    const retrieved = TransactionSyncEngine.getTransaction('0xabc123');
    assert.ok(retrieved);
    assert.strictEqual(retrieved?.status, 'pending');

    const confirmed = { ...tx, status: 'confirmed' as const, blockNumber: 19500005 };
    TransactionSyncEngine.recordTransaction(confirmed);
    const updated = TransactionSyncEngine.getTransaction('0xabc123');
    assert.strictEqual(updated?.status, 'confirmed');
    assert.strictEqual(updated?.blockNumber, 19500005);
  });

  console.log('\n======================================================');
  console.log(` SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
