/**
 * HYPERON-DEX ReceiptVerifier
 * Production-Grade On-Chain Receipt & Event Log Verification Engine
 *
 * Implements:
 * - Fail-closed transaction status check (must be success / 0x1 / 1)
 * - Router target verification against expected router & canonical router registry
 * - Decodes on-chain event logs (ERC-20 Transfer, Uniswap V3 Swap, Uniswap V2 Swap, HyperonRouter SwapExecuted, WETH Withdrawal)
 * - Native token output balance delta verification (accounting for gas if sender === recipient)
 * - ERC-20 transfer filtering to strictly match expectedTokenOut and expectedRecipient
 * - Balance delta accounting for fee-on-transfer and rebasing tokens
 * - Strictly enforces actualAmountOut >= amountOutMinimum
 * - Fail-closed verification states (SUCCESS, TRANSACTION_REVERTED, ROUTER_MISMATCH, VERIFICATION_FAILED)
 */

import { Address, Hex } from 'viem';
import { isVerifiedRouter } from '../../../server/services/routerRegistry';

export const TRANSFER_EVENT_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
export const UNISWAP_V3_SWAP_TOPIC = '0xc42079f94a6350d7e6235f29174924f9d5fb2017966560bc040d99955b76e6f8';
export const UNISWAP_V2_SWAP_TOPIC = '0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822';
export const HYPERON_SWAP_EXECUTED_TOPIC = '0x159d29c4dd7daebc22d119abebda0b001d8f8ef6134ae1fcb003a566f103de35';
export const WETH_WITHDRAWAL_TOPIC = '0x7fcf532c15f0a6db0bd6d0e038bea71d30d808c7d98cb3bf7268a95d5080b65';

export interface DecodedReceiptEvent {
  eventName: 'Transfer' | 'V3Swap' | 'V2Swap' | 'SwapExecuted' | 'Withdrawal' | 'Unknown';
  contractAddress: Address;
  from?: Address;
  to?: Address;
  recipient?: Address;
  value?: bigint;
  amount0Out?: bigint;
  amount1Out?: bigint;
  amountIn?: bigint;
  amountOut?: bigint;
  routeHash?: Hex;
}

export interface VerificationResult {
  verified: boolean;
  status:
    | 'SUCCESS'
    | 'TRANSACTION_REVERTED'
    | 'ROUTER_MISMATCH'
    | 'SLIPPAGE_BREACH'
    | 'OUTPUT_VERIFICATION_FAILED'
    | 'VERIFICATION_FAILED'
    | 'UNKNOWN_FINALITY';
  reason?: string;
  actualAmountOut?: bigint;
  recipient?: Address;
  txHash: Hex;
  blockNumber?: number;
  gasUsed?: bigint;
  decodedEvents: DecodedReceiptEvent[];
}

export interface VerifyReceiptParams {
  receipt: {
    status: 'success' | 'reverted' | '0x1' | '0x0' | 1 | 0;
    transactionHash: Hex;
    to?: Address | null;
    from?: Address | null;
    blockNumber?: bigint | number;
    gasUsed?: bigint;
    effectiveGasPrice?: bigint;
    logs: Array<{
      address: Address;
      topics: Hex[];
      data: Hex;
    }>;
  };
  expectedRecipient: Address;
  expectedTokenOut: Address;
  amountOutMinimum: bigint;
  expectedRouter?: Address;
  expectedSender?: Address;
  chainId?: number | string;
  isNativeOut?: boolean;
  balanceBefore?: bigint;
  balanceAfter?: bigint;
  routeHash?: Hex;
}

export class ReceiptVerifier {
  /**
   * Decodes a raw transaction receipt log.
   */
  static decodeLog(log: { address: Address; topics: Hex[]; data: Hex }): DecodedReceiptEvent {
    const firstTopic = log.topics[0]?.toLowerCase();
    const contract = log.address.toLowerCase() as Address;

    if (firstTopic === TRANSFER_EVENT_TOPIC && log.topics.length >= 3) {
      try {
        const from = `0x${log.topics[1].slice(26)}`.toLowerCase() as Address;
        const to = `0x${log.topics[2].slice(26)}`.toLowerCase() as Address;
        const value = BigInt(log.data === '0x' ? '0' : log.data);
        return {
          eventName: 'Transfer',
          contractAddress: contract,
          from,
          to,
          value,
        };
      } catch {
        // Fall through
      }
    }

    if (firstTopic === WETH_WITHDRAWAL_TOPIC) {
      try {
        const src = log.topics[1] ? (`0x${log.topics[1].slice(26)}`.toLowerCase() as Address) : undefined;
        const value = BigInt(log.data === '0x' ? '0' : log.data);
        return {
          eventName: 'Withdrawal',
          contractAddress: contract,
          from: src,
          value,
        };
      } catch {
        // Fall through
      }
    }

    if (firstTopic === UNISWAP_V3_SWAP_TOPIC && log.topics.length >= 3) {
      try {
        const sender = `0x${log.topics[1].slice(26)}`.toLowerCase() as Address;
        const recipient = `0x${log.topics[2].slice(26)}`.toLowerCase() as Address;
        const cleanData = log.data.startsWith('0x') ? log.data.slice(2) : log.data;
        if (cleanData.length >= 128) {
          const rawAmount0 = BigInt('0x' + cleanData.slice(0, 64));
          const rawAmount1 = BigInt('0x' + cleanData.slice(64, 128));
          const amount0 = rawAmount0 >= 2n ** 255n ? rawAmount0 - 2n ** 256n : rawAmount0;
          const amount1 = rawAmount1 >= 2n ** 255n ? rawAmount1 - 2n ** 256n : rawAmount1;
          const out0 = amount0 < 0n ? -amount0 : 0n;
          const out1 = amount1 < 0n ? -amount1 : 0n;
          return {
            eventName: 'V3Swap',
            contractAddress: contract,
            from: sender,
            to: recipient,
            recipient,
            amount0Out: out0,
            amount1Out: out1,
            amountOut: out0 > out1 ? out0 : out1,
          };
        }
      } catch {
        // Fall through
      }
    }

    if (firstTopic === HYPERON_SWAP_EXECUTED_TOPIC && log.topics.length >= 4) {
      try {
        const user = `0x${log.topics[1].slice(26)}`.toLowerCase() as Address;
        const cleanData = log.data.startsWith('0x') ? log.data.slice(2) : log.data;
        if (cleanData.length >= 192) {
          const amountIn = BigInt('0x' + cleanData.slice(0, 64));
          const amountOut = BigInt('0x' + cleanData.slice(64, 128));
          const rHash = ('0x' + cleanData.slice(128, 192)) as Hex;
          return {
            eventName: 'SwapExecuted',
            contractAddress: contract,
            recipient: user,
            from: user,
            amountIn,
            amountOut,
            routeHash: rHash,
          };
        }
      } catch {
        // Fall through
      }
    }

    if (firstTopic === UNISWAP_V2_SWAP_TOPIC && log.topics.length >= 2) {
      try {
        const to = log.topics[2] ? (`0x${log.topics[2].slice(26)}`.toLowerCase() as Address) : undefined;
        const cleanData = log.data.startsWith('0x') ? log.data.slice(2) : log.data;
        if (cleanData.length >= 256) {
          const amount0Out = BigInt('0x' + cleanData.slice(128, 192));
          const amount1Out = BigInt('0x' + cleanData.slice(192, 256));
          return {
            eventName: 'V2Swap',
            contractAddress: contract,
            to,
            recipient: to,
            amount0Out,
            amount1Out,
          };
        }
      } catch {
        // Fall through
      }
    }

    return {
      eventName: 'Unknown',
      contractAddress: contract,
    };
  }

  /**
   * Verifies an on-chain transaction receipt strictly against expected parameters.
   */
  static verifyReceipt(params: VerifyReceiptParams): VerificationResult {
    const {
      receipt,
      expectedRecipient,
      expectedTokenOut,
      amountOutMinimum,
      expectedRouter,
      expectedSender,
      chainId,
      isNativeOut = false,
      balanceBefore,
      balanceAfter,
    } = params;

    // 1. Verify transaction execution status
    const isSuccess = receipt.status === 'success' || receipt.status === '0x1' || receipt.status === 1;
    if (!isSuccess) {
      return {
        verified: false,
        status: 'TRANSACTION_REVERTED',
        reason: 'On-chain transaction execution reverted during execution.',
        txHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber ? Number(receipt.blockNumber) : undefined,
        gasUsed: receipt.gasUsed,
        decodedEvents: [],
      };
    }

    // 2. Verify router target destination
    if (expectedRouter) {
      const normExpectedRouter = expectedRouter.toLowerCase() as Address;
      if (receipt.to && receipt.to.toLowerCase() !== normExpectedRouter) {
        return {
          verified: false,
          status: 'ROUTER_MISMATCH',
          reason: `Transaction target destination (${receipt.to}) does not match expected router (${expectedRouter}). FAIL CLOSED.`,
          txHash: receipt.transactionHash,
          blockNumber: receipt.blockNumber ? Number(receipt.blockNumber) : undefined,
          gasUsed: receipt.gasUsed,
          decodedEvents: [],
        };
      }

      // Check canonical router registry allowlist
      if (chainId !== undefined && !isVerifiedRouter(chainId, normExpectedRouter)) {
        return {
          verified: false,
          status: 'ROUTER_MISMATCH',
          reason: `Router contract (${expectedRouter}) is not registered in canonical router registry for chain ${chainId}. FAIL CLOSED.`,
          txHash: receipt.transactionHash,
          blockNumber: receipt.blockNumber ? Number(receipt.blockNumber) : undefined,
          gasUsed: receipt.gasUsed,
          decodedEvents: [],
        };
      }
    }

    // 2.1 Verify sender account if specified
    if (expectedSender && receipt.from) {
      if (receipt.from.toLowerCase() !== expectedSender.toLowerCase()) {
        return {
          verified: false,
          status: 'VERIFICATION_FAILED',
          reason: `Transaction sender (${receipt.from}) does not match expected account (${expectedSender}). FAIL CLOSED.`,
          txHash: receipt.transactionHash,
          blockNumber: receipt.blockNumber ? Number(receipt.blockNumber) : undefined,
          gasUsed: receipt.gasUsed,
          decodedEvents: [],
        };
      }
    }

    const normRecipient = expectedRecipient.toLowerCase() as Address;
    const normTokenOut = expectedTokenOut.toLowerCase() as Address;

    const decodedEvents: DecodedReceiptEvent[] = [];
    let detectedOutput = 0n;
    let foundRecipientTransfer = false;

    // Decode all logs
    for (const log of receipt.logs || []) {
      const decoded = this.decodeLog(log);
      decodedEvents.push(decoded);
    }

    // 2.2 Verify routeHash if expected
    if (params.routeHash) {
      const expectedRouteHashLower = params.routeHash.toLowerCase();
      const executedEvents = decodedEvents.filter((d) => d.eventName === 'SwapExecuted');
      if (executedEvents.length > 0) {
        const matches = executedEvents.some(
          (d) => d.routeHash && d.routeHash.toLowerCase() === expectedRouteHashLower
        );
        if (!matches) {
          return {
            verified: false,
            status: 'VERIFICATION_FAILED',
            reason: `Executed routeHash in event logs does not match expected route commitment ${params.routeHash}. FAIL CLOSED.`,
            txHash: receipt.transactionHash,
            blockNumber: receipt.blockNumber ? Number(receipt.blockNumber) : undefined,
            gasUsed: receipt.gasUsed,
            decodedEvents,
          };
        }
      }
    }

    // 3. Native Token Output Verification
    if (isNativeOut) {
      // Balance delta approach
      if (balanceBefore !== undefined && balanceAfter !== undefined) {
        const balanceDelta = balanceAfter - balanceBefore;
        let effectiveDelta = balanceDelta;
        // If recipient was also the transaction caller who paid gas, adjust for gas cost
        if (expectedSender && expectedSender.toLowerCase() === normRecipient && receipt.gasUsed && receipt.effectiveGasPrice) {
          const gasCost = receipt.gasUsed * receipt.effectiveGasPrice;
          effectiveDelta = balanceDelta + gasCost;
        }

        if (effectiveDelta >= amountOutMinimum) {
          detectedOutput = effectiveDelta;
          foundRecipientTransfer = true;
        } else {
          return {
            verified: false,
            status: 'VERIFICATION_FAILED',
            reason: `Native token output delta (${effectiveDelta.toString()}) is strictly less than minimum required (${amountOutMinimum.toString()}). Slippage breach detected.`,
            actualAmountOut: effectiveDelta,
            recipient: normRecipient,
            txHash: receipt.transactionHash,
            blockNumber: receipt.blockNumber ? Number(receipt.blockNumber) : undefined,
            gasUsed: receipt.gasUsed,
            decodedEvents,
          };
        }
      } else {
        // Fallback to checking WETH withdrawal logs in receipt
        for (const evt of decodedEvents) {
          if (evt.eventName === 'Withdrawal' && evt.value && evt.value >= amountOutMinimum) {
            detectedOutput = evt.value;
            foundRecipientTransfer = true;
            break;
          }
        }

        if (!foundRecipientTransfer) {
          return {
            verified: false,
            status: 'VERIFICATION_FAILED',
            reason: 'Native token output could not be cryptographically or balance-verified. Balance before/after or WETH withdrawal required. FAIL CLOSED.',
            txHash: receipt.transactionHash,
            blockNumber: receipt.blockNumber ? Number(receipt.blockNumber) : undefined,
            gasUsed: receipt.gasUsed,
            decodedEvents,
          };
        }
      }
    } else {
      // 4. ERC-20 Token Output Verification
      for (const decoded of decodedEvents) {
        if (decoded.eventName === 'Transfer') {
          const tokenMatch = decoded.contractAddress.toLowerCase() === normTokenOut;
          const recipientMatch = decoded.to?.toLowerCase() === normRecipient;

          if (tokenMatch && recipientMatch && decoded.value !== undefined) {
            detectedOutput += decoded.value;
            foundRecipientTransfer = true;
          }
        } else if (decoded.eventName === 'V2Swap') {
          if (decoded.recipient?.toLowerCase() === normRecipient) {
            const swapOut = (decoded.amount0Out || 0n) + (decoded.amount1Out || 0n);
            if (swapOut > 0n) {
              detectedOutput = swapOut > detectedOutput ? swapOut : detectedOutput;
              foundRecipientTransfer = true;
            }
          }
        } else if (decoded.eventName === 'V3Swap') {
          if (decoded.recipient?.toLowerCase() === normRecipient) {
            const swapOut = decoded.amountOut || 0n;
            if (swapOut > 0n) {
              detectedOutput = swapOut > detectedOutput ? swapOut : detectedOutput;
              foundRecipientTransfer = true;
            }
          }
        } else if (decoded.eventName === 'SwapExecuted') {
          if (decoded.recipient?.toLowerCase() === normRecipient) {
            const swapOut = decoded.amountOut || 0n;
            if (swapOut > 0n) {
              detectedOutput = swapOut > detectedOutput ? swapOut : detectedOutput;
              foundRecipientTransfer = true;
            }
          }
        }
      }

      // If balance delta is available, verify actual net balance received (handles fee-on-transfer / tax tokens)
      if (balanceBefore !== undefined && balanceAfter !== undefined) {
        const balanceDelta = balanceAfter - balanceBefore;
        if (balanceDelta > 0n) {
          if (!foundRecipientTransfer || balanceDelta < detectedOutput) {
            detectedOutput = balanceDelta;
            foundRecipientTransfer = true;
          }
        }
      }

      // Check if output was verified
      if (!foundRecipientTransfer && detectedOutput === 0n) {
        return {
          verified: false,
          status: 'VERIFICATION_FAILED',
          reason: `Could not verify output transfer of token ${expectedTokenOut} to recipient ${expectedRecipient} in transaction logs.`,
          txHash: receipt.transactionHash,
          blockNumber: receipt.blockNumber ? Number(receipt.blockNumber) : undefined,
          gasUsed: receipt.gasUsed,
          decodedEvents,
        };
      }

      if (detectedOutput < amountOutMinimum) {
        return {
          verified: false,
          status: 'VERIFICATION_FAILED',
          reason: `Actual output amount (${detectedOutput.toString()}) is strictly less than minimum required (${amountOutMinimum.toString()}). Slippage breach detected.`,
          actualAmountOut: detectedOutput,
          recipient: normRecipient,
          txHash: receipt.transactionHash,
          blockNumber: receipt.blockNumber ? Number(receipt.blockNumber) : undefined,
          gasUsed: receipt.gasUsed,
          decodedEvents,
        };
      }
    }

    return {
      verified: true,
      status: 'SUCCESS',
      actualAmountOut: detectedOutput,
      recipient: normRecipient,
      txHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber ? Number(receipt.blockNumber) : undefined,
      gasUsed: receipt.gasUsed,
      decodedEvents,
    };
  }
}
