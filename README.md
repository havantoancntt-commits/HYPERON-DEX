# HYPERON-DEX — Next-Generation Institutional Web3 Super Exchange

HYPERON-DEX is an institutional-grade, AI-native decentralized exchange (DEX) aggregator and Web3 trading terminal built with **TypeScript**, **Express**, **Vite**, **React 19**, **viem**, and **Tailwind CSS**.

The platform provides mathematically verified on-chain routing, dynamic split optimization, real-time pre-flight transaction simulations (`eth_call`), bytecode-level honeypot & vulnerability scanning, and provably fair Chainlink VRF 2.5 lottery games—with **zero synthetic data** and **strict BigInt precision**.

---

## 1. Core Architecture & System Overview

```
                          ┌──────────────────────────┐
                          │   HYPERON React Client   │
                          │   (Tailwind, Motion)     │
                          └─────────────┬────────────┘
                                        │ REST / RPC
                          ┌─────────────▼────────────┐
                          │ Express Application API   │
                          └─────────────┬────────────┘
         ┌──────────────────────────────┼──────────────────────────────┐
         ▼                              ▼                              ▼
┌───────────────────┐        ┌─────────────────────┐        ┌───────────────────┐
│ SmartGraphRouter  │        │  SimulationEngine   │        │   SecurityScanner │
│ - Gas-aware split │        │ - Dynamic Fee Tier  │        │ - EVM Disassembly │
│ - Real DEX quotes │        │ - Dynamic Router/ABI│        │ - Honeypot checks │
│ - BigInt slippage │        │ - Custom Deadline   │        │ - Ownership audit │
└────────┬──────────┘        └──────────┬──────────┘        └───────────────────┘
         │                              │
         ▼                              ▼
┌───────────────────┐        ┌─────────────────────┐
│    ammEngine      │        │    TokenResolver    │
│ - Uniswap V2 (x*y)│        │ - Canonical Addr    │
│ - Uniswap V3 (L)  │        │ - Multi-Chain Map   │
│ - Curve Invariant │        │ - Zero Fallbacks    │
│ - Balancer Weights│        │                     │
└───────────────────┘        └─────────────────────┘
```

### Key Modules & Components:

1. **Smart Graph Router (`server/services/router.ts`)**:
   - Discovers live on-chain liquidity across Uniswap v3, Uniswap v2, Curve, and Balancer.
   - Evaluates multi-venue split allocations (90/10, 80/20, 70/30, 60/40, 50/50).
   - **Gas-Aware Economic Routing**: Quantifies estimated gas consumption (`gasEstimatedUnits`) into output token units (`calculateGasCostInTokenOutRaw`). Compares `netProfit = amountOutRaw - gasCostInToken` so split routes are only selected when net profit strictly exceeds single-pool routes.
   - Generates an honest DEX comparison matrix (`LIVE_QUOTE` for verified pools, `UNAVAILABLE` when no pool exists, strictly avoiding fake percentage multipliers).

2. **Pre-Flight Simulation Engine (`server/services/simulationEngine.ts`)**:
   - Executes real on-chain simulations via `viem` `client.call()`.
   - Dynamically resolves the pool fee tier (`extractFeeTier`: e.g., 500, 3000, 10000) and router contract (`resolveSimulationRouter`: Uniswap V3 vs. Uniswap V2 Router ABI).
   - Supports client-specified `deadline` timestamps with relative fallback.
   - Returns typed simulation outcomes: `SUCCESS`, `REVERTED`, `FAILED`, and non-zero `gasEstimatedUnits`.

3. **AMM Invariant Math Engine (`server/services/ammEngine.ts`)**:
   - **Uniswap V2**: Constant-product $x \cdot y = k$ with exact integer fees (30 bps) across any decimal combination (6, 8, 18).
   - **Uniswap V3**: Concentrated liquidity arithmetic requiring verified `V3PoolState` (sqrtPriceX96, active liquidity, tick); strictly returns `INSUFFICIENT_DATA` if state is unavailable (no synthetic geometric-mean approximations).
   - **Curve StableSwap**: Multi-asset Newton-Raphson invariant $A \cdot D \cdot \sum x_i + D^{n+1} / (n^n \prod x_i)$ with integer fee deduction.
   - **Balancer Weighted**: Multi-token generalized constant product invariant.
   - Centralized gas profiling via `AMM_GAS_CONFIG`.

4. **Canonical Token Resolver (`server/services/tokenResolver.ts`)**:
   - Enforces chain-bound canonical address resolution.
   - Eliminates ambiguous fallbacks (no zero-address `0x000...` or default USDC fallbacks for unknown tokens).

5. **Bytecode Security Scanner (`server/services/scanner.ts`)**:
   - Sequential EVM opcode disassembler tracking `PUSH1`–`PUSH32` byte lengths to prevent misidentifying operand data (e.g. `0xff`) as `SELFDESTRUCT` opcodes.
   - Scans contract bytecode for hidden fee mechanisms, blacklist functions, and honeypot traps.

---

## 2. Environment Variables Configuration

Create a `.env` file in the project root based on `.env.example`:

```env
# Gemini API Key for AI Market Insights & Portfolio Copilot
GEMINI_API_KEY=your_gemini_api_key_here

# App URL for hosted endpoints
APP_URL=http://localhost:3000

# Server Port (Defaults to 3000)
PORT=3000
```

> **Note on Security**: Server-side API endpoints (`/api/*`) proxy sensitive operations. Never expose private keys or service tokens in frontend client bundles.

---

## 3. Installation & Getting Started

### Prerequisites:
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher

### 1. Install Dependencies
```bash
npm install
```

### 2. Run the Development Server
Starts the Express backend and mounts the Vite middleware on port 3000:
```bash
npm run dev
```
Open your browser at `http://localhost:3000`.

### 3. Run the Automated Verification Suite
Runs the 50-point regression and math invariant test suite:
```bash
npm test
```

### 4. Type Checking & Linting
```bash
npm run lint
```

### 5. Production Build & Start
```bash
npm run build
npm start
```

---

## 4. Verification & Testing Standards

The regression suite (`tests/runAllTests.ts`) rigorously verifies:
1. **Canonical Token Identity**: Unknown tokens throw `TOKEN_NOT_FOUND` rather than falling back to zero addresses.
2. **AMM Precision Invariants**: 18 $\to$ 6, 8 $\to$ 6, and 18 $\to$ 18 swaps preserve $k$ and enforce mathematical monotonicity.
3. **Curve StableSwap**: Tight stablecoin peg preservation across decimal scales.
4. **Oracle Integrity**: Price feeds return explicit `null` and `UNAVAILABLE` when unverified (no synthetic $1.00 fallbacks).
5. **DEX Comparison Matrix**: Verified pools produce `LIVE_QUOTE`; venues without pools produce `UNAVAILABLE`.
6. **Simulation Security**: Enforces `USER_ADDRESS_REQUIRED`, dynamic fee tier extraction, and router ABI selection.
7. **Gas-Aware Routing**: Verifies `calculateGasCostInTokenOutRaw` and rejects inefficient split routes where gas overhead exceeds output gains.
8. **EVM Disassembler**: Verifies `PUSH` data is isolated from executable opcodes.
9. **Chainlink VRF 2.5**: Verifies cryptographic determinism and entropy uniformity.

---

## 5. Security Architecture, Formal Audits & Bug Bounty

HYPERON-DEX is designed to institutional security standards:

- **Formal Security Audit Report**: Refer to [`AUDIT.md`](./AUDIT.md) for full audit scopes, threat models, invariant proofs, and automated scanner integrations.
- **Changelog & Version History**: Refer to [`CHANGELOG.md`](./CHANGELOG.md) for detailed security release notes.
- **SSRF Mitigation (CVE-2026-63730)**: Strict domain whitelist, RFC 1918 private IP rejection, sensitive port filtering (443 only), and static path enforcement in `server/services/webhookSecurity.ts`.
- **Multi-Oracle Consensus & Flashloan Circuit Breaker**: Consolidated weighted median across minimum 3 independent sources with 15% outlier filtering and automatic routing halt on >20% price shifts within 60 seconds (`server/services/multiOracleAggregator.ts`).
- **Web Security Headers**: Enforced via `helmet` with strict CSP, HSTS (`max-age=31536000`), and `X-Content-Type-Options: nosniff`.
- **Automated Security Pipeline**: Compatible with Slither and Mythril smart contract static analyzers.

For responsible vulnerability disclosures or bug bounty inquiries, contact the security engineering team at `security@hyperon.io`.
