/**
 * HYPERON-DEX Real On-Chain Approval Engine
 * Strict 9-Step Token Approval Lifecycle & Invariant Verification
 *
 * INVARIANTS:
 * - Read allowance from blockchain directly via `allowance(owner, spender)`.
 * - If current allowance >= amountIn, do not request approval.
 * - If current allowance < amountIn, construct real approval transaction.
 * - Support USDT 0-reset on Ethereum when currentAllowance > 0n.
 * - Wait for on-chain transaction receipt (poll eth_getTransactionReceipt).
 * - Receipt status MUST be 0x1 / 1 (reverted receipt strictly throws APPROVAL_FAILED).
 * - Re-read allowance from blockchain after receipt.
 * - Only enable swap once allowance is verified sufficient on-chain.
 * - No mock approvals, no assuming approval succeeded on popup close.
 */

import { Address, encodeFunctionData, PublicClient } from 'viem';
import { ERC20_ABI } from './execution/TransactionBuilder';
import { DEX_ERROR_CODES, DexError } from './errorCodes';

export interface ApprovalCheckResult {
  isApproved: boolean;
  currentAllowance: bigint;
  requiredAmount: bigint;
  tokenAddress: Address;
  spenderAddress: Address;
  ownerAddress: Address;
  needsReset: boolean;
}

export interface ApprovalExecutionResult {
  success: boolean;
  approvalTxHash: string;
  resetTxHash?: string;
  finalAllowance: bigint;
}

export class ApprovalEngine {
  /**
   * Reads on-chain allowance directly from the token contract.
   */
  static async readAllowance(
    client: any,
    tokenAddress: Address,
    owner: Address,
    spender: Address
  ): Promise<bigint> {
    try {
      const allowance = (await (client as any).readContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: [owner, spender],
      })) as bigint;
      return allowance;
    } catch (err: any) {
      throw new DexError(
        DEX_ERROR_CODES.RPC_ERROR,
        `Failed to read on-chain allowance for token ${tokenAddress}: ${err?.message || String(err)}`
      );
    }
  }

  /**
   * Checks whether approval is required for a specific token amount.
   */
  static async checkApproval(
    client: PublicClient,
    tokenAddress: Address,
    owner: Address,
    spender: Address,
    amountIn: bigint,
    chainId?: string | number
  ): Promise<ApprovalCheckResult> {
    const currentAllowance = await this.readAllowance(client, tokenAddress, owner, spender);
    const isApproved = currentAllowance >= amountIn;

    // Check if token is USDT on Ethereum Mainnet requiring reset when allowance > 0 and < amountIn
    const isEthereum = chainId === 1 || chainId === '1' || chainId === 'ethereum';
    const isUsdtEth = isEthereum && tokenAddress.toLowerCase() === '0xdac17f958d2ee523a2206206994597c13d831ec7';
    const needsReset = isUsdtEth && currentAllowance > 0n && !isApproved;

    return {
      isApproved,
      currentAllowance,
      requiredAmount: amountIn,
      tokenAddress,
      spenderAddress: spender,
      ownerAddress: owner,
      needsReset,
    };
  }

  /**
   * Waits for transaction receipt and verifies it succeeded on-chain.
   * Fails closed if receipt status !== 0x1 or max attempts reached.
   */
  static async waitForReceipt(
    provider: any,
    txHash: string,
    maxWaitMs: number = 60000,
    pollIntervalMs: number = 2000
  ): Promise<any> {
    const startTime = Date.now();
    while (Date.now() - startTime < maxWaitMs) {
      try {
        const receipt = await provider.request({
          method: 'eth_getTransactionReceipt',
          params: [txHash],
        });
        if (receipt) {
          const status = receipt.status;
          const isSuccess = status === '0x1' || status === 1 || status === 'success';
          if (!isSuccess) {
            throw new DexError(
              DEX_ERROR_CODES.APPROVAL_FAILED,
              `Approval transaction ${txHash} reverted on-chain. Receipt status: ${status}.`
            );
          }
          return receipt;
        }
      } catch (err: any) {
        if (err instanceof DexError) throw err;
      }
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }

    throw new DexError(
      DEX_ERROR_CODES.TRANSACTION_TIMEOUT,
      `Approval transaction ${txHash} timed out waiting for receipt after ${Math.round(maxWaitMs / 1000)}s.`
    );
  }

  /**
   * Executes the full approval flow:
   * 1. If needs reset: send reset tx -> wait receipt -> verify.
   * 2. Send approval tx -> wait receipt -> verify.
   * 3. Re-read on-chain allowance.
   * 4. Verify recheckAllowance >= amountIn.
   */
  static async executeApproval(params: {
    client: PublicClient;
    provider: any;
    tokenAddress: Address;
    owner: Address;
    spender: Address;
    amountIn: bigint;
    exactAmount?: boolean;
    chainId?: string | number;
    onStepChange?: (step: 'RESETTING' | 'APPROVING' | 'WAITING_RECEIPT' | 'VERIFYING') => void;
  }): Promise<ApprovalExecutionResult> {
    const { client, provider, tokenAddress, owner, spender, amountIn, exactAmount = false, chainId, onStepChange } = params;

    // Check allowance first
    const check = await this.checkApproval(client, tokenAddress, owner, spender, amountIn, chainId);
    if (check.isApproved) {
      return {
        success: true,
        approvalTxHash: '',
        finalAllowance: check.currentAllowance,
      };
    }

    let resetTxHash: string | undefined;

    // Step 1: Execute Reset if needed (USDT)
    if (check.needsReset) {
      onStepChange?.('RESETTING');
      const resetCalldata = encodeFunctionData({
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [spender, 0n],
      });

      resetTxHash = await provider.request({
        method: 'eth_sendTransaction',
        params: [
          {
            from: owner,
            to: tokenAddress,
            value: '0x0',
            data: resetCalldata,
          },
        ],
      });

      if (!resetTxHash) {
        throw new DexError(DEX_ERROR_CODES.WALLET_REJECTED, 'USDT reset approval rejected by wallet.');
      }

      onStepChange?.('WAITING_RECEIPT');
      await this.waitForReceipt(provider, resetTxHash);
    }

    // Step 2: Execute Approval
    onStepChange?.('APPROVING');
    // For standard DEX: approve exact amount or max uint256
    const approveAmount = exactAmount
      ? amountIn
      : BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');

    const approveCalldata = encodeFunctionData({
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [spender, approveAmount],
    });

    const approvalTxHash = await provider.request({
      method: 'eth_sendTransaction',
      params: [
        {
          from: owner,
          to: tokenAddress,
          value: '0x0',
          data: approveCalldata,
        },
      ],
    });

    if (!approvalTxHash) {
      throw new DexError(DEX_ERROR_CODES.WALLET_REJECTED, 'Approval transaction was rejected by user.');
    }

    // Step 3: Wait for receipt
    onStepChange?.('WAITING_RECEIPT');
    await this.waitForReceipt(provider, approvalTxHash);

    // Step 4: Re-read allowance directly from the blockchain
    onStepChange?.('VERIFYING');
    const finalAllowance = await this.readAllowance(client, tokenAddress, owner, spender);
    if (finalAllowance < amountIn) {
      throw new DexError(
        DEX_ERROR_CODES.APPROVAL_FAILED,
        `On-chain allowance verification failed: Expected at least ${amountIn}, got ${finalAllowance}.`
      );
    }

    return {
      success: true,
      approvalTxHash,
      resetTxHash,
      finalAllowance,
    };
  }
}
