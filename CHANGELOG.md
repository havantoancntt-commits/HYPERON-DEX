# HYPERON-DEX Changelog

All notable changes to the HYPERON-DEX platform are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [4.1.0] - 2026-09-04

### Security Hardening & Enterprise Audit Remediation

#### Added
- **Enterprise Webhook Security & SSRF Protection (CVE-2026-63730 Remediation)**:
  - Strict domain whitelist (`DEFAULT_ALLOWED_HOSTS`: `api.hyperon.io`, `webhook.trusted.com`, `hooks.slack.com`, `discord.com`, `api.telegram.org`).
  - RFC 1918, RFC 3927 (link-local `169.254.0.0/16`), loopback (`127.0.0.0/8`, `::1`), and cloud metadata IP (`metadata.google.internal`) filtering.
  - Sensitive port restriction allowing only standard HTTPS port `443`.
  - Static endpoint validation prohibiting user-controlled query strings and URL fragments.
  - HMAC-SHA256 signature verification (`X-Hyperon-Signature`) for anti-tampering.
  - In-memory structured security audit log ring buffer.
  - Webhook verification endpoint `POST /api/v1/webhooks/verify-url`, dispatch endpoint `POST /api/v1/webhooks/dispatch`, and audit endpoint `GET /api/v1/webhooks/audit-logs`.
- **Multi-Oracle Price Consolidation & Flashloan Circuit Breaker**:
  - Independent multi-source aggregation from minimum 3 feeds (Uniswap V3 TWAP, Chainlink feeds, composite market data).
  - Outlier rejection stripping sources deviating by $>15\%$ from the median.
  - Strict `BigInt` weighted consensus calculation.
  - Rolling 60-second price volatility monitor; automatically trips circuit breaker on $>20\%$ price change to prevent flashloan exploits.
  - Routing integration halting swaps on assets with an active circuit breaker.
  - Oracle consensus endpoint `GET /api/v1/oracle/consolidated/:symbol` and reset endpoint `POST /api/v1/oracle/circuit-breaker/reset`.
- **Production Web Security Headers via Helmet**:
  - Content Security Policy (CSP) tailored for Web3 DApps and live preview environments.
  - HTTP Strict Transport Security (HSTS) with 1-year max age, subdomains, and preloading.
  - `X-Content-Type-Options: nosniff` enforcement.
- **Enhanced EVM Disassembler & Token Risk Classification**:
  - Sequential EVM bytecode disassembler tracking `PUSH1`–`PUSH32` operands.
  - State storage mutation analysis tracking `SSTORE` ($0x55$) count and `SLOAD` ($0x54$).
  - Detection of origin checks (`ORIGIN` $0x32$) and transfer hook anomalies.
  - Explicit three-tier risk classification: `VERIFIED`, `MEDIUM_RISK`, and `HIGH_RISK`.
- **Institutional Documentation**:
  - `AUDIT.md`: Formal verification and security audit report covering 50/50 test matrix and threat modeling.

#### Changed
- `router.ts`: Added circuit breaker gate in `calculateSmartRouteQuote` to reject swaps on volatile or manipulated assets.
- `errorCodes.ts`: Added `CIRCUIT_BREAKER_TRIGGERED` and `SSRF_DETECTED` error constants and localized user messages.
- `scanner.ts`: Updated `ComprehensiveSecurityAudit` and `scanBytecodeOpcodes` to return opcode mutation metrics and `verificationTier`.

---

## [4.0.0] - 2026-09-04

### Initial Production Architecture & Invariant Hardening
- Implemented Gas-Aware Economic Split Routing Optimizer.
- Dynamic fee tier extraction (500, 3000, 10000 bps) for Uniswap V3 simulations.
- Pre-flight `eth_call` transaction simulation with revert decoding.
- 50/50 Invariant Verification Test Suite.
