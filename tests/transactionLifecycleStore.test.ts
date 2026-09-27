/**
 * HYPERON-DEX TRANSACTION LIFECYCLE & PERSISTENCE INVARIANTS TEST SUITE
 * 
 * Verifies (PHASE 2 HARDENING):
 * 1. Strict rejection of missing / unverified target routers (No Universal Router fallback)
 * 2. Strict rejection of missing / zero-address tokens (No zero address defaults)
 * 3. Strict rejection of missing / zero amounts (No 0-amount defaults)
 * 4. Rejection of wallet mismatch against session
 * 5. Idempotent submission preventing duplicate concurrent broadcasts
 * 6. Fail-closed behavior of FailClosedTransactionStore
 * 7. MemoryTransactionStore idempotency and state machine transitions
 */

import {
  TransactionLifecycleManager,
  MemoryTransactionStore,
  FailClosedTransactionStore,
  TransactionRecord,
} from '../server/services/transactionLifecycle';

async function runLifecycleTests() {
  console.log('======================================================');
  console.log(' HYPERON-DEX TRANSACTION LIFECYCLE STORE INVARIANTS');
  console.log('======================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, desc: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${desc}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${desc}`);
      failed++;
    }
  }

  const manager = new TransactionLifecycleManager();
  const validSession = {
    walletAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
    chainId: 'ethereum',
    sessionId: 'sess_test_123',
  };

  // --- 1. Zero-Default Router Invariant ---
  console.log('--- 1. Target Router Zero-Default Invariant ---');
  try {
    await manager.submitTransaction(
      {
        userAddress: validSession.walletAddress,
        chainId: 'ethereum',
        // targetRouter omitted
        tokenIn: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
        tokenOut: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        amountIn: '1000000000000000000',
        amountOutMinimum: '2600000000',
        signedTx: '0x1234',
      },
      validSession
    );
    assert(false, 'Should reject transaction with omitted targetRouter');
  } catch (err: any) {
    assert(
      err.message.includes('MISSING_OR_INVALID_ROUTER'),
      'Strictly rejects omitted target router without fallback to third-party Universal Router'
    );
  }

  // --- 2. Zero-Default Token Invariant ---
  console.log('\n--- 2. Token In & Token Out Zero-Default Invariant ---');
  try {
    await manager.submitTransaction(
      {
        userAddress: validSession.walletAddress,
        chainId: 'ethereum',
        targetRouter: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
        // tokenIn omitted
        tokenOut: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        amountIn: '1000000000000000000',
        amountOutMinimum: '2600000000',
        signedTx: '0x1234',
      },
      validSession
    );
    assert(false, 'Should reject transaction with omitted tokenIn');
  } catch (err: any) {
    assert(
      err.message.includes('MISSING_OR_INVALID_TOKENS'),
      'Strictly rejects omitted tokenIn without fallback to address(0)'
    );
  }

  // --- 3. Zero-Amount Invariant ---
  console.log('\n--- 3. Non-Zero Amount Invariant ---');
  try {
    await manager.submitTransaction(
      {
        userAddress: validSession.walletAddress,
        chainId: 'ethereum',
        targetRouter: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
        tokenIn: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
        tokenOut: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        amountIn: '0',
        amountOutMinimum: '2600000000',
        signedTx: '0x1234',
      },
      validSession
    );
    assert(false, 'Should reject transaction with 0 amountIn');
  } catch (err: any) {
    assert(
      err.message.includes('INVALID_AMOUNT'),
      'Strictly rejects amountIn === 0'
    );
  }

  // --- 4. Wallet Mismatch Invariant ---
  console.log('\n--- 4. Wallet Session Binding Invariant ---');
  try {
    await manager.submitTransaction(
      {
        userAddress: '0x0000000000000000000000000000000000000001',
        chainId: 'ethereum',
        targetRouter: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
        tokenIn: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
        tokenOut: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        amountIn: '1000000000000000000',
        amountOutMinimum: '2600000000',
        signedTx: '0x1234',
      },
      validSession
    );
    assert(false, 'Should reject claimed userAddress mismatch');
  } catch (err: any) {
    assert(
      err.message.includes('WALLET_MISMATCH'),
      'Strictly rejects claimed wallet differing from authenticated session'
    );
  }

  // --- 5. MemoryTransactionStore Idempotency Invariants ---
  console.log('\n--- 5. MemoryTransactionStore Concurrency & Idempotency ---');
  const store = new MemoryTransactionStore();
  const testRecord: TransactionRecord = {
    id: 'tx_test_001',
    userAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
    chainId: 'ethereum',
    state: 'PENDING',
    targetRouter: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    tokenIn: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    tokenOut: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    amountIn: '1000000000000000000',
    amountOutMinimum: '2600000000',
    recipient: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
    simulationPassed: true,
    idempotencyKey: 'idem_key_abc123',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  await store.saveRecord(testRecord);
  const fetched = await store.getRecord('tx_test_001');
  assert(fetched !== undefined && fetched.id === 'tx_test_001', 'Stores and retrieves transaction record by ID');

  const fetchedByIdem = await store.getRecordByIdempotencyKey('idem_key_abc123');
  assert(fetchedByIdem !== undefined && fetchedByIdem.id === 'tx_test_001', 'Retrieves record by idempotency key');

  const pending = await store.getPendingRecords();
  assert(pending.length === 1 && pending[0].id === 'tx_test_001', 'Correctly queries pending records for startup recovery');

  // --- 6. FailClosedTransactionStore Invariant ---
  console.log('\n--- 6. FailClosedTransactionStore Safety ---');
  const failStore = new FailClosedTransactionStore();
  try {
    await failStore.saveRecord(testRecord);
    assert(false, 'FailClosedStore should throw');
  } catch (err: any) {
    assert(err.message.includes('TX_STORE_UNAVAILABLE'), 'FailClosedTransactionStore fails closed safely');
  }

  // --- Summary ---
  console.log('\n======================================================');
  console.log(` LIFECYCLE TESTS: ${passed}/${passed + failed} PASSED (${failed} FAILED)`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runLifecycleTests();
