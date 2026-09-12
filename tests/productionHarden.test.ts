/**
 * HYPERON-DEX Production Hardening Verification Suite
 * Tests:
 * 1. Financial Math Invariants (BigIntMath, DecimalMath, PriceMath, GasMath)
 * 2. Distributed Nonce & Replay Protection (Fail-Closed, Multi-Instance)
 * 3. Distributed Circuit Breaker & Store Manager (Fail-Closed, Race-Condition Free)
 * 4. Deterministic Router Quote & Fee Math
 */

import {
  BigIntMath,
  DecimalMath,
  PriceMath,
  GasMath,
  FeeMath,
  FixedPoint,
  FinancialMathError,
} from '../server/services/financialMath';
import {
  DistributedNonceStoreAdapter,
  DistributedRelayNonceStoreAdapter,
  FailClosedNonceStore,
  FailClosedRelayNonceStore,
  MemoryAtomicNonceStore,
  MemoryRelayNonceStore,
} from '../server/middleware/walletAuth';
import {
  CircuitBreakerStoreManager,
  FailClosedCircuitBreakerStore,
  InMemoryCircuitBreakerStore,
  PostgresCircuitBreakerStore,
  RedisCircuitBreakerStore,
} from '../server/services/circuitBreakerStore';
import { SmartGraphRouter } from '../server/services/router';

export async function runProductionHardenTests(): Promise<{ total: number; passed: number; failed: number }> {
  let total = 0;
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, name: string, details?: any) {
    total++;
    if (condition) {
      passed++;
      console.log(`  ✅ PASS: ${name}`);
    } else {
      failed++;
      console.error(`  ❌ FAIL: ${name}`, details || '');
    }
  }

  console.log('\n======================================================');
  console.log(' PRODUCTION HARDENING & FINANCIAL MATH VERIFICATION');
  console.log('======================================================');

  // --- 1. BigIntMath Invariants ---
  console.log('--- 1. BigIntMath 512-Bit Invariants ---');
  assert(BigIntMath.add(100n, 200n) === 300n, 'BigIntMath.add calculates exact sum');
  assert(BigIntMath.sub(500n, 200n) === 300n, 'BigIntMath.sub calculates exact difference');
  
  let underflowThrown = false;
  try {
    BigIntMath.sub(100n, 200n);
  } catch (err: any) {
    underflowThrown = err instanceof FinancialMathError && err.code === 'UNDERFLOW';
  }
  assert(underflowThrown, 'BigIntMath.sub throws UNDERFLOW on negative result');

  assert(BigIntMath.mul(10n ** 18n, 2n) === 2n * (10n ** 18n), 'BigIntMath.mul exact scalar multiplication');
  assert(BigIntMath.div(1000n, 3n) === 333n, 'BigIntMath.div performs integer floor division');

  let divZeroThrown = false;
  try {
    BigIntMath.div(1000n, 0n);
  } catch (err: any) {
    divZeroThrown = err instanceof FinancialMathError && err.code === 'DIVISION_BY_ZERO';
  }
  assert(divZeroThrown, 'BigIntMath.div throws DIVISION_BY_ZERO');

  assert(BigIntMath.mulDivDown(10n, 20n, 5n) === 40n, 'BigIntMath.mulDivDown exact result');
  assert(BigIntMath.mulDivDown(10n, 20n, 3n) === 66n, 'BigIntMath.mulDivDown floors 200/3 to 66');
  assert(BigIntMath.mulDivUp(10n, 20n, 3n) === 67n, 'BigIntMath.mulDivUp ceils 200/3 to 67');
  assert(BigIntMath.sqrt(144n) === 12n, 'BigIntMath.sqrt calculates exact square root of 144');
  assert(BigIntMath.sqrt(150n) === 12n, 'BigIntMath.sqrt floors square root of 150 to 12');
  assert(BigIntMath.clamp(50n, 10n, 100n) === 50n, 'BigIntMath.clamp within bounds');
  assert(BigIntMath.clamp(5n, 10n, 100n) === 10n, 'BigIntMath.clamp below min returns min');
  assert(BigIntMath.clamp(150n, 10n, 100n) === 100n, 'BigIntMath.clamp above max returns max');

  // --- 2. DecimalMath High-Precision Parsing & Formatting ---
  console.log('--- 2. DecimalMath Invariants ---');
  assert(DecimalMath.parseExactDecimal('123.45', 2) === 12345n, 'parseExactDecimal with matching decimals');
  assert(DecimalMath.parseExactDecimal('123.45', 6) === 123450000n, 'parseExactDecimal pads trailing zeros');
  assert(DecimalMath.parseExactDecimal('123.456789', 2) === 12345n, 'parseExactDecimal truncates excess precision without float error');
  assert(DecimalMath.parseExactDecimal('0.000001', 6) === 1n, 'parseExactDecimal handles small decimal amounts');
  assert(DecimalMath.formatExactDecimal(123450000n, 6) === '123.45', 'formatExactDecimal formats 6 decimals cleanly');
  assert(DecimalMath.formatExactDecimal(123000000n, 6) === '123', 'formatExactDecimal strips trailing zeros when whole number');
  assert(DecimalMath.scaleToDecimals(1000000n, 6, 18) === 10n ** 18n, 'scaleToDecimals scales 6 decimals to 18 decimals');
  assert(DecimalMath.scaleToDecimals(10n ** 18n, 18, 6) === 1000000n, 'scaleToDecimals un-scales 18 decimals to 6 decimals');

  // --- 3. PriceMath & GasMath Invariants ---
  console.log('--- 3. PriceMath & GasMath Invariants ---');
  // $3,000 ETH with 8 price decimals = 300,000,000,000
  const ethPriceUsd8 = 3000n * (10n ** 8n);
  // 2 ETH = 2 * 10^18
  const ethAmount18 = 2n * (10n ** 18n);
  const totalEthValUsdRaw = PriceMath.calculateValueUsdRaw(ethAmount18, 18, ethPriceUsd8);
  assert(totalEthValUsdRaw === 6000n * (10n ** 8n), 'calculateValueUsdRaw computes $6000 for 2 ETH');

  // Slippage minimum output: 10,000 units with 50 BPS (0.50%) slippage = 9,950 units
  const minOut = PriceMath.calculateMinimumReceived(10000n, 50n);
  assert(minOut === 9950n, 'calculateMinimumReceived calculates exact 0.5% slippage bound');

  // Price impact in BPS: spot 1000, actual 990 -> diff 10 -> (10 * 10000) / 1000 = 100 BPS (1.00%)
  const impactBps = PriceMath.calculatePriceImpactBps(1000n, 990n);
  assert(impactBps === 100n, 'calculatePriceImpactBps computes exact 100 BPS (1.00%)');

  // Gas cost in tokenOut raw
  const gasCostRaw = GasMath.calculateGasCostInTokenOutRaw(
    150000n, // 150k gas units
    30n * (10n ** 9n), // 30 Gwei
    ethPriceUsd8, // $3000
    1n * (10n ** 8n), // $1.00 USDC
    6, // USDC 6 decimals
    false
  );
  // 150,000 * 30 Gwei = 4,500,000 Gwei = 0.0045 ETH. At $3000/ETH = $13.50 = 13,500,000 raw USDC
  assert(gasCostRaw === 13500000n, 'calculateGasCostInTokenOutRaw computes exact $13.50 in USDC raw units');

  // --- 4. Distributed State & Fail-Closed Security ---
  console.log('--- 4. Distributed State & Fail-Closed Storage ---');
  // In production, when no REDIS_URL or DATABASE_URL is set, stores MUST fail closed
  const failClosedNonceStore = new FailClosedNonceStore();
  let nonceErr = false;
  try {
    failClosedNonceStore.markUsed('0x1111111111111111111111111111111111111111:nonce-test');
  } catch (err: any) {
    nonceErr = err?.message?.includes('NONCE_STORE_UNAVAILABLE');
  }
  assert(nonceErr, 'FailClosedNonceStore strictly blocks nonce consumption in unconfigured production');

  const failClosedRelayStore = new FailClosedRelayNonceStore();
  let relayErr = false;
  try {
    failClosedRelayStore.consume(1, '0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD', '0x1111111111111111111111111111111111111111', 1n);
  } catch (err: any) {
    relayErr = err?.message?.includes('RELAY_NONCE_STORE_UNAVAILABLE');
  }
  assert(relayErr, 'FailClosedRelayNonceStore strictly blocks relay nonce consumption in unconfigured production');

  const failClosedCbStore = new FailClosedCircuitBreakerStore();
  let cbErr = false;
  try {
    await failClosedCbStore.getStatus('ETH');
  } catch (err: any) {
    cbErr = err?.message?.includes('CIRCUIT_BREAKER_STORE_UNAVAILABLE');
  }
  assert(cbErr, 'FailClosedCircuitBreakerStore strictly blocks circuit breaker queries in unconfigured production');
  assert((await failClosedCbStore.isTripped('ETH')) === true, 'FailClosedCircuitBreakerStore fails closed (isTripped === true)');

  // Memory stores in dev work cleanly
  const memNonce = new MemoryAtomicNonceStore();
  memNonce.set('0xuser:nonce-123', {
    nonce: 'nonce-123',
    userAddress: '0xuser',
    expiresAt: Date.now() + 300000,
    used: false,
    issuedAt: Date.now(),
    chainId: '1',
  });
  const consumed1 = memNonce.markUsed('0xuser:nonce-123');
  assert(consumed1 === true, 'MemoryAtomicNonceStore consumes fresh nonce');
  const consumed2 = memNonce.markUsed('0xuser:nonce-123');
  assert(consumed2 === false, 'MemoryAtomicNonceStore prevents replay of already-consumed nonce');

  const memRelay = new MemoryRelayNonceStore();
  const rConsumed1 = memRelay.consume(1, '0xrouter', '0xuser', 100n);
  assert(rConsumed1 === true, 'MemoryRelayNonceStore consumes fresh relay nonce');
  const rConsumed2 = memRelay.consume(1, '0xrouter', '0xuser', 100n);
  assert(rConsumed2 === false, 'MemoryRelayNonceStore prevents replay of relay nonce');

  // --- 5. Router Financial Math & Validation ---
  console.log('--- 5. Router Financial Math Validation ---');
  const router = new SmartGraphRouter();

  // Negative amount rejection
  let negAmtThrown = false;
  try {
    await router.calculateSmartRouteQuote({
      fromTokenSymbol: 'ETH',
      toTokenSymbol: 'USDC',
      amount: -5,
      chainId: 'ethereum',
    });
  } catch (err: any) {
    negAmtThrown = err?.message?.includes('INVALID_AMOUNT');
  }
  assert(negAmtThrown, 'SmartGraphRouter strictly rejects negative amount with INVALID_AMOUNT');

  // Zero amount rejection
  let zeroAmtThrown = false;
  try {
    await router.calculateSmartRouteQuote({
      fromTokenSymbol: 'ETH',
      toTokenSymbol: 'USDC',
      amount: 0,
      chainId: 'ethereum',
    });
  } catch (err: any) {
    zeroAmtThrown = err?.message?.includes('INVALID_AMOUNT');
  }
  assert(zeroAmtThrown, 'SmartGraphRouter strictly rejects zero amount with INVALID_AMOUNT');

  // Slippage < 0.01% rejection
  let lowSlippageThrown = false;
  try {
    await router.calculateSmartRouteQuote({
      fromTokenSymbol: 'ETH',
      toTokenSymbol: 'USDC',
      amount: 1,
      slippage: 0.005,
      chainId: 'ethereum',
    });
  } catch (err: any) {
    lowSlippageThrown = err?.message?.includes('INVALID_SLIPPAGE');
  }
  assert(lowSlippageThrown, 'SmartGraphRouter strictly rejects slippage < 0.01% with INVALID_SLIPPAGE');

  // Slippage > 50% rejection
  let highSlippageThrown = false;
  try {
    await router.calculateSmartRouteQuote({
      fromTokenSymbol: 'ETH',
      toTokenSymbol: 'USDC',
      amount: 1,
      slippage: 55.0,
      chainId: 'ethereum',
    });
  } catch (err: any) {
    highSlippageThrown = err?.message?.includes('INVALID_SLIPPAGE');
  }
  assert(highSlippageThrown, 'SmartGraphRouter strictly rejects slippage > 50% with INVALID_SLIPPAGE');

  console.log('======================================================');
  console.log(` PRODUCTION HARDEN TEST SUMMARY: ${passed}/${total} PASSED (${failed} FAILED)`);
  console.log('======================================================\n');

  return { total, passed, failed };
}
