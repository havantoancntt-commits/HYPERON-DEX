# HYPERON-DEX — Next-Generation Institutional Web3 Super Exchange

> **IMPORTANT SECURITY & INDEPENDENCE DECLARATION:**  
> **HYPERON-DEX** is an independent, non-custodial decentralized exchange protocol and Web3 institutional terminal. **HYPERON-DEX is completely separate, unrelated, and unaffiliated with the HyperDX project** (which was subject to a historical security event). HYPERON-DEX operates on an isolated, formally verified codebase with zero shared keys, infrastructure, or governance.

HYPERON-DEX is an institutional-grade, AI-native decentralized exchange (DEX) aggregator and Web3 trading terminal built with **TypeScript**, **Express**, **Vite**, **React 19**, **viem**, **Foundry**, **Solidity 0.8.28**, and **Tailwind CSS**.

The platform provides mathematically verified on-chain routing, dynamic split optimization, real-time pre-flight transaction simulations (`eth_call`), bytecode-level honeypot & vulnerability scanning, and provably fair Chainlink VRF 2.5 lottery games—with **zero synthetic data** and **strict BigInt precision**.

---

## 1. Core Architecture & System Overview

```
                          ┌──────────────────────────┐
                          │   HYPERON React Client   │
                          │   (Client-Side Routing,  │
                          │    ZK Proofs via viem)   │
                          └─────────────┬────────────┘
                                        │ Signed Payload / ZK Proof
                          ┌─────────────▼────────────┐
                          │  Minimal Private Relayer  │
                          │  (/api/submit, Flashbots) │
                          └─────────────┬────────────┘
         ┌──────────────────────────────┼──────────────────────────────┐
         ▼                              ▼                              ▼
┌───────────────────┐        ┌─────────────────────┐        ┌───────────────────┐
│ SmartGraphRouter  │        │  HyperonRouter.sol  │        │   SecurityScanner │
│ - Gas-aware split │        │ - Solidity 0.8.28   │        │ - EVM Disassembly │
│ - Real DEX quotes │        │ - OpenZeppelin v5   │        │ - Honeypot checks │
│ - EIP-1559 MA Gas │        │ - EIP-4626 Vaults   │        │ - SSRF OWASP block│
└────────┬──────────┘        └──────────┬──────────┘        └───────────────────┘
         │                              │
         ▼                              ▼
┌───────────────────┐        ┌─────────────────────┐
│    ammEngine      │        │ Multi-Oracle Agg    │
│ - Uniswap V2 (x*y)│        │ - ERC-7528 standard │
│ - Uniswap V3 (L)  │        │ - 5% Outlier Reject │
│ - Curve Invariant │        │ - 5s 10% Emerg Halt │
│ - Balancer Weights│        │ - Volume Weighted   │
└───────────────────┘        └─────────────────────┘
```

### Key Modules & Components:

0. **Zero-Trust Client-Side Routing & Relayer (`src/lib/router.ts`, `server.ts`)**:
   - Computes multi-venue swap paths directly in browser / Web Worker using public RPCs.
   - Generates Zero-Knowledge routing proofs (`snarkjs` / SHA256-Merkle) to shield trade intent and eliminate user profiling.
   - Minimal Relayer `/api/submit` broadcasts transactions into private mempools (Flashbots Protect) without participating in decision calculations.

1. **Smart Contracts (`contracts/`)**:
   - `HyperonRouter.sol`: Institutional hybrid router integrating Uniswap V3, Curve StableSwap, and EIP-4626 Tokenized Vaults with `ReentrancyGuard` and `onlyRelayer` execution.
   - `HyperonOracleAggregator.sol`: ERC-7528 on-chain price oracle aggregator enforcing volume-weighted pricing, 5% outlier filters, and automated circuit breakers.
   - Foundry configuration (`foundry.toml`) with Cancún EVM target and fuzzing suite.

2. **Enterprise SSRF Protection (`server/services/webhookSecurity.ts`)**:
   - Full OWASP SSRF compliance blocking RFC 1918 private subnets, cloud metadata IPs (`169.254.169.254`), internal domains, and restricted ports (443 only). Whitelist domain validation.

3. **Multi-Oracle Price Aggregator (`server/services/multiOracleAggregator.ts`)**:
   - Volume-weighted median calculation discarding low-volume feeds (< 1% liquidity).
   - Strict 5% maximum deviation limit against median.
   - Instant 5-second emergency circuit breaker for >10% price spikes.

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
Runs the 217-point regression and formal math invariant test suite:
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

The regression suite (`tests/runAllTests.ts`) rigorously verifies 217 invariant properties:
1. **Canonical Token Identity**: Unknown tokens throw `TOKEN_NOT_FOUND` rather than falling back to zero addresses.
2. **AMM Precision Invariants**: 18 $\to$ 6, 8 $\to$ 6, and 18 $\to$ 18 swaps preserve $k$ and enforce mathematical monotonicity.
3. **Curve StableSwap**: Tight stablecoin peg preservation across decimal scales.
4. **Oracle Integrity**: Price feeds return explicit `null` and `UNAVAILABLE` when unverified (no synthetic $1.00 fallbacks); minimum 2 independent sources required for quorum.
5. **DEX Comparison Matrix**: Verified pools produce `LIVE_QUOTE`; venues without pools produce `UNAVAILABLE`.
6. **Simulation Security**: Enforces `USER_ADDRESS_REQUIRED`, dynamic fee tier extraction, and router ABI selection.
7. **Gas-Aware Routing & Bit-Exact Precision**: Verifies `calculateGasCostInTokenOutRaw`, `DecimalMath`, and `FeeMath` directional rounding (ceil on protocol fees/required input, floor on outputs).
8. **Cryptographic Route Commitment**: Binds quote parameters (pools, tokenIn, tokenOut, amountIn, minAmountOut, nonce, deadline) preventing MITM and parameter tampering.
9. **EVM Disassembler**: Verifies `PUSH` data is isolated from executable opcodes.
10. **Chainlink VRF 2.5**: Verifies cryptographic determinism and entropy uniformity.
11. **Multi-Instance Distributed Circuit Breaker**: Formal abstraction for split-brain prevention across horizontally scaled container instances.

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
