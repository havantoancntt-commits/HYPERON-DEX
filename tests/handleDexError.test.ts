/**
 * HYPERON-DEX Centralized Error Handler (DRY Refactor) Verification Suite
 * Tests handleDexError with:
 * 1. INVALID_AMOUNT (Status 400 Bad Request)
 * 2. NO_LIQUIDITY (Status 404 Not Found)
 * 3. RPC_UNAVAILABLE (Status 503 Service Unavailable)
 */

import { Response } from 'express';
import { handleDexError } from '../server';
import { DexError, DEX_ERROR_CODES } from '../src/lib/errorCodes';

interface MockResponse {
  statusCode: number;
  jsonData: any;
  status: (code: number) => MockResponse;
  json: (data: any) => MockResponse;
}

function createMockResponse(): { res: Response; mock: MockResponse } {
  const mock: MockResponse = {
    statusCode: 200,
    jsonData: null,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(data: any) {
      this.jsonData = data;
      return this;
    },
  };
  return { res: mock as unknown as Response, mock };
}

export function runHandleDexErrorTests(): { total: number; passed: number; failed: number } {
  console.log('\n======================================================');
  console.log(' CENTRALIZED ERROR HANDLER (DRY) VERIFICATION SUITE');
  console.log('======================================================');

  let total = 0;
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    total++;
    if (condition) {
      passed++;
      console.log(`  ✅ PASS: ${testName}`);
    } else {
      failed++;
      console.error(`  ❌ FAIL: ${testName}`);
    }
  }

  // --- Test Case 1: INVALID_AMOUNT -> HTTP 400 ---
  {
    const { res, mock } = createMockResponse();
    const err = new DexError(DEX_ERROR_CODES.INVALID_AMOUNT, 'Amount must be greater than zero.');
    handleDexError(err, res);

    assert(mock.statusCode === 400, 'INVALID_AMOUNT maps to HTTP 400 Bad Request');
    assert(mock.jsonData?.code === DEX_ERROR_CODES.INVALID_AMOUNT, 'Response body contains INVALID_AMOUNT error code');
    assert(mock.jsonData?.message === 'Amount must be greater than zero.', 'Response body contains correct error message');
  }

  // --- Test Case 2: NO_LIQUIDITY -> HTTP 404 ---
  {
    const { res, mock } = createMockResponse();
    const err = new DexError(DEX_ERROR_CODES.NO_LIQUIDITY, 'No active liquidity pool exists for the selected pair.');
    handleDexError(err, res);

    assert(mock.statusCode === 404, 'NO_LIQUIDITY maps to HTTP 404 Not Found');
    assert(mock.jsonData?.code === DEX_ERROR_CODES.NO_LIQUIDITY, 'Response body contains NO_LIQUIDITY error code');
    assert(mock.jsonData?.message === 'No active liquidity pool exists for the selected pair.', 'Response body preserves message');
  }

  // --- Test Case 3: RPC_UNAVAILABLE -> HTTP 503 ---
  {
    const { res, mock } = createMockResponse();
    const err = new DexError(DEX_ERROR_CODES.RPC_UNAVAILABLE, 'All blockchain RPC endpoints failed to respond.');
    handleDexError(err, res);

    assert(mock.statusCode === 503, 'RPC_UNAVAILABLE maps to HTTP 503 Service Unavailable');
    assert(mock.jsonData?.code === DEX_ERROR_CODES.RPC_UNAVAILABLE, 'Response body contains RPC_UNAVAILABLE error code');
    assert(mock.jsonData?.message === 'All blockchain RPC endpoints failed to respond.', 'Response body preserves message');
  }

  console.log(`\nResults: ${passed}/${total} passed (${failed} failed)`);
  return { total, passed, failed };
}

// Allow direct CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const result = runHandleDexErrorTests();
  process.exit(result.failed > 0 ? 1 : 0);
}
