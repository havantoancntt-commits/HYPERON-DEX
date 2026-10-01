# HYPERON-DEX — AUDIT REPAIR BASELINE (PHASE 0)
**Protocol:** HYPERON-DEX (Non-Custodial Decentralized Exchange Aggregator)  
**Audit Baseline Date:** 2026-10-01  
**Auditor:** Principal Web3 Engineer + Smart Contract Engineer + Security Auditor + Protocol Architect + DevOps/SRE  
**Toolchain:** Node.js v22.23.2, npm 10.9.8, solc 0.8.28, TypeScript 5.9.3, Vite 6.4.3, Viem 2.56.0  
**Current Test Baseline:** 336/336 tests passing (100% passing across 11 test suites)  
**Contract Bytecode Compilation:** HyperonRouter (19,437 bytes), HyperonOracleAggregator (10,422 bytes)  

---

## 1. System Inventory & Architecture Mapping

| Layer | Primary Files | Role & Operational Characteristics |
| :--- | :--- | :--- |
| **Frontend SPA** | `src/App.tsx`, `src/main.tsx`, `src/views/` | React 19 SPA with Tailwind CSS v4, Lucide icons, Motion v12, PWA support. |
| **Server / Proxy** | `server.ts`, `server/services/`, `server/middleware/` | Express.js proxy with Helmet CSP, CORS security, SSRF defense, rate limiting, and Viem RPC clients. |
| **Smart Contracts** | `contracts/src/HyperonRouter.sol`, `contracts/src/HyperonOracleAggregator.sol` | Solidity 0.8.28 with OpenZeppelin v5, EIP-712 relayer swaps, ERC-7528 multi-oracle aggregator, Ownable2Step. |
| **Routing Engine** | `server/services/router.ts`, `server/services/ammEngine.ts`, `server/services/poolDiscovery.ts` | Multi-DEX graph pathfinding (Uniswap V3, Uniswap V2, Curve, Balancer), volume-weighted split quotes. |
| **Wallet Layer** | `src/context/WalletContext.tsx`, `src/lib/wallet/` | EIP-1193, EIP-6963 multi-provider discovery, WalletConnect v2, SIWE authentication, strict chain validation. |
| **Transaction Execution** | `src/lib/execution/TransactionBuilder.ts`, `src/lib/execution/ReceiptVerifier.ts` | Exact calldata builder, route commitment hashing, on-chain bytecode assertion, receipt log decoding. |
| **Oracle & Pricing** | `server/services/multiOracleAggregator.ts`, `server/services/priceFeed.ts` | Median consensus $\ge 2$ sources, 5% outlier filter, 20% standard / 10% emergency circuit breaker. |
| **Financial Math** | `server/services/financialMath.ts`, `server/services/uniswapV3Math.ts` | Pure `BigInt` arithmetic, 512-bit safe math, directional rounding (ceil fees/input, floor output). |
| **Distributed State** | `server/services/circuitBreakerStore.ts`, `server/services/transactionLifecycle.ts` | Fail-closed distributed state stores (Redis/Postgres/File) preventing replay and uncoordinated resets. |
| **Observability / SRE** | `server.ts` (`/api/health`, `/api/admin/metrics`) | Real node latency telemetry, RPC failover, structured logs, zero fake metrics. |

---

## 2. Baseline Findings Register (P0 / P1 / P2 / P3)

### [FINDING-01] P0 — Hardcoded Fallback Address in Cross-Chain Intent Execution
- **File:** `server.ts` & `server/services/crossChainEngine.ts`
- **Function:** `app.post('/api/crosschain/execute')` & `executeCrossChainIntent()`
- **Root Cause:** If `userAddress` is omitted in the request body, the handler defaults to `'0x71C28B932F99B52EDb3C0257B4393608F79E9E42'` instead of validating and rejecting with HTTP 400.
- **Impact:** Violates the absolute zero-synthetic and no-hardcoded-wallet invariants (Rule 6). Unauthenticated or malformed intent calls could be misattributed to an unowned address.
- **Fix Plan:** Strictly validate `isAddress(userAddress)`. If missing or invalid, return HTTP 400 `MISSING_USER_ADDRESS: Valid userAddress is required`. Remove all hardcoded address fallbacks.
- **Verification Method:** Send POST request with missing `userAddress` to `/api/crosschain/execute`; assert HTTP 400 rejection.
- **Status:** **OPEN**

---

### [FINDING-02] P0 — Hardcoded Fallback Address in Launchpad Contract Generation
- **File:** `src/views/LaunchpadView.tsx`
- **Function:** `handleDeploy()`
- **Root Cause:** In `getContractAddress({ from: (address && isAddress(address) ? address : '0x71C28B932F99B52EDb3C0257B4393608F79E9E42') })`, a disconnected wallet falls back to a hardcoded address.
- **Impact:** Allows a disconnected user to simulate contract deployment using an unowned address.
- **Fix Plan:** Require connected wallet with valid address before allowing deployment. Throw explicit error `WALLET_NOT_CONNECTED` and abort.
- **Verification Method:** Attempt deployment without connecting wallet; verify UI displays connection prompt and halts execution.
- **Status:** **OPEN**

---

### [FINDING-03] P0 — Production Sandbox / Demo Isolation Gate
- **File:** `src/context/WalletContext.tsx`
- **Function:** Initial session restoration & `connectWallet()`
- **Root Cause:** Sandbox provider restoration from localStorage (`savedType === 'sandbox'`) did not check `import.meta.env.PROD`.
- **Impact:** If a user had previously stored sandbox tokens, a production environment could restore the sandbox provider.
- **Fix Plan:** In production (`import.meta.env.PROD` or `process.env.NODE_ENV === 'production'`), strictly disable sandbox/demo profiles, purge any sandbox localStorage keys, and fail closed if sandbox is requested.
- **Verification Method:** Simulate production environment with sandbox localStorage; assert wallet remains disconnected with warning.
- **Status:** **OPEN**

---

### [FINDING-04] P0 — Truthfulness & On-Chain Deployment Status
- **File:** `AUDIT.md`, `README.md`, `src/lib/contractsConfig.ts`
- **Function:** Contract address configuration & audit documentation
- **Root Cause:** Past audit documentation used terms like "Status: PRODUCTION READY" while `HyperonRouter.sol` bytecode is compiled and tested but has NOT yet been mined on public testnet/mainnet.
- **Impact:** False production readiness claim violating Rule 13 ("Không tuyên bố smart contract đã deploy nếu chưa có transaction hash và on-chain bytecode").
- **Fix Plan:** Standardize protocol status:
  - `HYPERON_ROUTER_DEPLOYMENT_STATUS = UNDEPLOYED` (Code compiled and formally verified in tests, but unmined on-chain).
  - Direct execution pipeline operates on canonical verified DEX routers (Uniswap V3 / Uniswap V2) when HyperonRouter is unconfigured.
  - Fail-closed error `ROUTER_UNAVAILABLE` / `CONTRACT_NOT_DEPLOYED` is enforced when HyperonRouter is explicitly requested without deployed bytecode.
- **Verification Method:** Review `contractsConfig.ts` and audit reports; verify fail-closed tests.
- **Status:** **OPEN**

---

### [FINDING-05] P1 — Multi-Oracle Policy Harmonization & Quorum Enforcement
- **File:** `server/services/multiOracleAggregator.ts` & `contracts/src/HyperonOracleAggregator.sol`
- **Function:** `getConsolidatedPrice()` & `updateConsensusFromFeeds()`
- **Root Cause:** Ensure exact synchronization between off-chain consensus logic and on-chain contract invariants (Quorum $\ge 2$, 5.00% outlier filtering, 20.00% / 15s standard circuit breaker, 10.00% / 5s emergency halt, 300s cooldown, 120s max execution staleness).
- **Impact:** Disagreement between contract and server oracle triggers if parameters drift.
- **Fix Plan:** Assert exact threshold parity and fail-closed return (price = 0, status = `INSUFFICIENT_SOURCES` or `CIRCUIT_BREAKER_ACTIVE`).
- **Verification Method:** Run oracle invariant tests in `tests/runAllTests.ts`.
- **Status:** **OPEN**

---

### [FINDING-06] P1 — Canonical Router Allowlist Enforcement in Transaction Builder
- **File:** `src/lib/execution/TransactionBuilder.ts`
- **Function:** `buildSwapTransaction()`
- **Root Cause:** Ensure `routerTarget` is strictly validated against `isVerifiedRouter(chainNumericId, routerTarget)` for all 6 supported chains (Ethereum, Base, Arbitrum, Optimism, BSC, Polygon).
- **Impact:** Prevents routing execution to arbitrary or unverified addresses.
- **Fix Plan:** Enforce allowlist check before encoding calldata; throw `ROUTER_UNAVAILABLE` on unknown targets.
- **Verification Method:** Run `tests/executionHardeningSuite.ts` targeting unauthorized routers.
- **Status:** **OPEN**

---

### [FINDING-07] P1 — Output Verification & Slippage Enforcement in ReceiptVerifier
- **File:** `src/lib/execution/ReceiptVerifier.ts`
- **Function:** `verifyReceipt()`
- **Root Cause:** Must ensure `actualAmountOut >= amountOutMinimum` and `receipt.status === 1` with exact ERC-20 `Transfer` and V3 `Swap` event decoding.
- **Impact:** Slippage breaches or reverted transactions must never be confirmed as successful.
- **Fix Plan:** Enforce strict log decoding; transition to `OUTPUT_VERIFICATION_FAILED` if received < expected.
- **Verification Method:** Execute receipt verification tests in `tests/runAllTests.ts`.
- **Status:** **OPEN**

---

### [FINDING-08] P1 — SSRF & Webhook Destination Validation in Production
- **File:** `server/services/webhookSecurity.ts`
- **Function:** `validateWebhookUrl()` & `dispatchWebhook()`
- **Root Cause:** Must guarantee that in production mode, `WEBHOOK_SECRET` is mandatory, and private IP ranges (127.0.0.1, RFC 1918, 169.254.169.254) are strictly blocked on DNS resolution.
- **Impact:** Protects against internal network scanning and cloud metadata exfiltration.
- **Fix Plan:** Maintain strict domain whitelist and fail-closed IP checks.
- **Verification Method:** Run webhook SSRF tests in `tests/runAllTests.ts`.
- **Status:** **OPEN**

---

### [FINDING-09] P2 — React Context Memoization & Infinite Re-render Prevention
- **File:** `src/context/ExchangeContext.tsx`, `src/context/WalletContext.tsx`, `src/App.tsx`
- **Function:** Provider value memoization and effect dependencies
- **Root Cause:** Un-memoized derived state or unstable callbacks in context can trigger re-render cascades in consumers like `SwapView`.
- **Impact:** Performance degradation, UI freeze, or `Maximum update depth exceeded`.
- **Fix Plan:** Wrap all derived arrays (`liveTokens`), callbacks, and context value objects in `useMemo` / `useCallback`. Use functional state updaters (`prev !== null ? null : prev`).
- **Verification Method:** Compile with `tsc --noEmit`, test in browser, verify zero infinite loops.
- **Status:** **OPEN**

---

### [FINDING-10] P2 — Structured SRE Metrics & Observability Telemetry
- **File:** `server.ts`
- **Function:** `/api/admin/metrics`, `/api/health`
- **Root Cause:** Metrics must reflect actual RPC latencies and real block heights without synthetic floors.
- **Impact:** SREs need authentic insight into node degraded status.
- **Fix Plan:** Ensure `/api/admin/metrics` computes health strictly from live node responses.
- **Verification Method:** Query `/api/health` and `/api/admin/metrics`.
- **Status:** **OPEN**

---

### [FINDING-11] P3 — Elimination of Example Wallet Placeholders
- **File:** `src/components/WalletConnectionModal.tsx`
- **Function:** Custom account input placeholder
- **Root Cause:** Placeholder used `0x71C8A66D268eCBE77E136125027581a94fa4F67a`.
- **Impact:** Cosmetic confusion.
- **Fix Plan:** Change placeholder to generic `0x...`.
- **Verification Method:** Inspect component rendering.
- **Status:** **OPEN**

---

## 3. Repair Roadmap & Sequencing
- **Phase 0:** Baseline Audit Checkpoint (This Document) & `REPAIR_CHECKPOINTS.md`.
- **Phase 1 (P0):** Fix hardcoded address fallbacks, enforce production sandbox isolation, correct deployment assertions.
- **Phase 2–4 (P1):** Wallet security, token identity checksumming, multi-oracle consensus harmonization.
- **Phase 5–9 (P1):** Routing net output verification, financial math invariants, Uniswap V3 differential math, quote-to-transaction pipeline.
- **Phase 10–13 (P1/P2):** Smart contract formal review, backend authorization, SSRF defenses.
- **Phase 14–20:** Performance, error taxonomy, final verification, `PRODUCTION_READINESS.md`, and `FINAL ENGINEERING REPORT`.
