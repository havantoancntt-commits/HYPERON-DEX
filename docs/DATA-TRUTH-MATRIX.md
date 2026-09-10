# HYPERON-DEX — Data Truth & Verification Matrix

This matrix defines the strict technical verification boundaries, on-chain provenance requirements, and mathematical precision guarantees enforced across the **HYPERON-DEX** production engine.

---

## 1. Data Integrity & Provenance Protocol

| Data Domain | Origin & Verification Method | Status States | Fallback Behavior on Failure |
| :--- | :--- | :--- | :--- |
| **Token Prices** | Binance REST API `v3/ticker/24hr` + On-Chain AMM Reserves | `LIVE`, `STALE`, `UNAVAILABLE`, `ERROR` | Strict `null` / `UNAVAILABLE`. **Zero fake $1.00 fallbacks.** |
| **Blockchain RPC** | Viem multi-provider fallback transport (`Cloudflare`, `Ankr`, `PublicNode`) | `SUCCESS`, `RPC_UNAVAILABLE`, `INVALID_CHAIN` | Throws explicit error or returns `null` block number. No simulated blocks. |
| **Token Security** | On-chain EVM bytecode inspection (`eth_getCode`), EIP-1967 proxy detection, selector forensics | `LOW`, `MEDIUM`, `HIGH`, `CRITICAL` | Evidence-based risk score with explicit `unknownFactors` listing. |
| **DEX Quotes** | `AMMEngine` Constant Product $x \cdot y = k$ and Curve StableSwap with integer `bigint` math | `AVAILABLE`, `NO_LIQUIDITY`, `NOT_IMPLEMENTED` | Route ignored if no depth; rejects unverified pools. |
| **Tx Simulation** | Real on-chain `balanceOf`, `allowance`, and gas price queries via Viem | `SIMULATED_SUCCESS`, `SIMULATED_REVERT`, `APPROVAL_REQUIRED` | Pre-flight rejection with custom revert reason decoding. |
| **Market Intelligence** | On-chain quantitative indicators (RSI, ATR, Bollinger, Order Book Imbalance) & backtest engine | `DETERMINISTIC_ANALYSIS` | Pure decentralized mathematical models. User signs all transactions. |

---

## 2. Mathematical Precision Standards

1. **Integer Token Arithmetic (`bigint`)**:
   - Token amounts are parsed and converted to native units using `parseUnits(amount, decimals)` and formatted using `formatUnits(amountRaw, decimals)`.
   - Swap fees and minimum received calculations use integer basis points:
     $$\text{amountInWithFee} = \text{amountIn} \cdot (10000 - \text{feeBps})$$
     $$\text{amountOut} = \frac{\text{reserveOut} \cdot \text{amountInWithFee}}{\text{reserveIn} \cdot 10000 + \text{amountInWithFee}}$$
     $$\text{minimumReceived} = \frac{\text{amountOut} \cdot (10000 - \text{slippageBps})}{10000}$$

2. **Price Impact vs. Slippage Tolerance**:
   - **Spot Price**: $\frac{\text{reserveOut} / 10^{d_{\text{out}}}}{\text{reserveIn} / 10^{d_{\text{in}}}}$
   - **Execution Price**: $\frac{\text{amountOut} / 10^{d_{\text{out}}}}{\text{amountIn} / 10^{d_{\text{in}}}}$
   - **Price Impact**: $\frac{\text{spotPrice} - \text{executionPrice}}{\text{spotPrice}} \times 100\%$

3. **Multi-Chain Router Registry**:
   - Verified Router, Quoter, and Factory addresses for Ethereum, Base, Arbitrum, Optimism, BSC, and Polygon.
   - Private MEV protection via Flashbots RPC relays where supported.

---

## 3. Centralized Error Taxonomy

- `INVALID_ADDRESS`: Malformed EVM hex address.
- `INVALID_CHAIN`: Unsupported or unreachable network.
- `RPC_UNAVAILABLE`: Multi-provider node connectivity failure.
- `PRICE_UNAVAILABLE`: Missing live price feed; no speculative estimates.
- `INSUFFICIENT_BALANCE`: User wallet balance is lower than input amount.
- `APPROVAL_REQUIRED`: Token allowance must be granted to router contract.
- `NO_LIQUIDITY`: Insufficient liquidity depth in AMM pool.
- `INVALID_SLIPPAGE`: Slippage tolerance outside $(0.01\%, 50.0\%)$ bounds.
- `SIMULATION_FAILED`: Pre-flight on-chain transaction execution reverted.
