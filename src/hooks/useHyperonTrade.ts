/**
 * HYPERON-DEX HARDENED TRADE EXECUTION PIPELINE
 *
 * Implements the Full 17-State Execution Machine (Phase 25):
 * IDLE -> FETCHING_QUOTE -> QUOTE_READY -> BUILDING_TRANSACTION -> SIMULATING -> SIMULATION_PASSED
 * -> CHECKING_ALLOWANCE -> APPROVAL_REQUIRED -> APPROVING -> APPROVAL_CONFIRMED
 * -> REVALIDATING_QUOTE -> SIGNING -> BROADCASTING -> PENDING -> CONFIRMING -> VERIFYING -> SUCCESS
 *
 * With Full Failure Handling:
 * QUOTE_FAILED, SIMULATION_FAILED, APPROVAL_FAILED, SIGNATURE_REJECTED,
 * BROADCAST_FAILED, TRANSACTION_REVERTED, VERIFICATION_FAILED, EXPIRED, UNKNOWN_TRANSACTION_STATE.
 *
 * Zero False Success:
 * Only REAL QUOTE + EXACT TRANSACTION + SUCCESSFUL SIMULATION + VALID APPROVAL
 * + SIGNED EXACT PAYLOAD + MINED SUCCESSFUL RECEIPT + VERIFIED OUTPUT + VALID ROUTE
 * can reach SUCCESS.
 */

import { useState, useCallback, useRef } from 'react';
import { Address, Hex, encodeFunctionData, parseUnits, formatUnits } from 'viem';
import { SwapQuote, TransactionSimulation } from '../types';
import { TransactionBuilder, ERC20_ABI } from '../lib/execution/TransactionBuilder';
import { ReceiptVerifier } from '../lib/execution/ReceiptVerifier';
import { DEX_ERROR_CODES, DexError } from '../lib/errorCodes';

export type ExecutionState =
  | 'IDLE'
  | 'FETCHING_QUOTE'
  | 'QUOTE_READY'
  | 'BUILDING_TRANSACTION'
  | 'SIMULATING'
  | 'SIMULATION_PASSED'
  | 'CHECKING_ALLOWANCE'
  | 'APPROVAL_REQUIRED'
  | 'APPROVING'
  | 'APPROVAL_CONFIRMED'
  | 'REVALIDATING_QUOTE'
  | 'SIGNING'
  | 'BROADCASTING'
  | 'PENDING'
  | 'CONFIRMING'
  | 'VERIFYING'
  | 'SUCCESS'
  // Failure States
  | 'QUOTE_FAILED'
  | 'SIMULATION_FAILED'
  | 'APPROVAL_FAILED'
  | 'SIGNATURE_REJECTED'
  | 'BROADCAST_FAILED'
  | 'TRANSACTION_REVERTED'
  | 'VERIFICATION_FAILED'
  | 'EXPIRED'
  | 'UNKNOWN_TRANSACTION_STATE';

export interface TradeProgress {
  step: ExecutionState;
  progressPercent: number;
  statusMessage: string;
  txHash: string | null;
  quoteHash: string | null;
  error: string | null;
  actualAmountOut?: string;
  approvalTxHash?: string | null;
}

export interface UseHyperonTradeOptions {
  maxRetries?: number;
  initialBackoffMs?: number;
  onSuccess?: (txHash: string, verifiedAmountOut?: string) => void;
  onError?: (error: Error, state: ExecutionState) => void;
}

export interface UseHyperonTradeReturn {
  progress: TradeProgress;
  isBusy: boolean;
  fetchQuote: (fromSymbol: string, toSymbol: string, amount: string, chainId: number) => Promise<SwapQuote | null>;
  simulateTrade: (quote: SwapQuote, userAddress: string) => Promise<TransactionSimulation | null>;
  executeTradeLifecycle: (quote: SwapQuote, userAddress: string) => Promise<boolean>;
  retry: () => void;
  reset: () => void;
}

export function useHyperonTrade(options: UseHyperonTradeOptions = {}): UseHyperonTradeReturn {
  const { maxRetries = 2, initialBackoffMs = 500, onSuccess, onError } = options;

  const [progress, setProgress] = useState<TradeProgress>({
    step: 'IDLE',
    progressPercent: 0,
    statusMessage: 'Ready for trade execution',
    txHash: null,
    quoteHash: null,
    error: null,
  });

  const lastActionRef = useRef<(() => Promise<boolean>) | null>(null);

  /**
   * Helper: Polls an injected Web3 provider for transaction receipt
   */
  const pollForReceipt = async (
    provider: any,
    txHash: string,
    timeoutMs = 60000,
    intervalMs = 2000
  ): Promise<any> => {
    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
      try {
        const receipt = await provider.request({
          method: 'eth_getTransactionReceipt',
          params: [txHash],
        });
        if (receipt && receipt.blockNumber) {
          return receipt;
        }
      } catch {
        // Network lag, continue polling
      }
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
    throw new Error(`Receipt polling timed out after ${Math.round(timeoutMs / 1000)} seconds.`);
  };

  /**
   * Helper: Checks on-chain ERC20 allowance via eth_call
   */
  const checkOnChainAllowance = async (
    provider: any,
    tokenAddress: Address,
    owner: Address,
    spender: Address
  ): Promise<bigint> => {
    try {
      const calldata = encodeFunctionData({
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: [owner, spender],
      });
      const resultHex = await provider.request({
        method: 'eth_call',
        params: [{ to: tokenAddress, data: calldata }, 'latest'],
      });
      if (resultHex && resultHex !== '0x') {
        return BigInt(resultHex);
      }
      return 0n;
    } catch {
      return 0n;
    }
  };

  /**
   * 1. Fetch Quote with rigorous validation
   */
  const fetchQuote = useCallback(
    async (fromSymbol: string, toSymbol: string, amount: string, chainId: number): Promise<SwapQuote | null> => {
      setProgress({
        step: 'FETCHING_QUOTE',
        progressPercent: 10,
        statusMessage: 'Scanning decentralized liquidity pools...',
        txHash: null,
        quoteHash: null,
        error: null,
      });

      try {
        const res = await fetch('/api/quote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fromToken: fromSymbol, toToken: toSymbol, amount, chainId }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new DexError(
            errData.code || DEX_ERROR_CODES.INVALID_PARAMS,
            errData.userMessage || errData.message || 'Failed to retrieve optimal swap quote.'
          );
        }

        const data = await res.json();
        const quote = (data.quote || data) as SwapQuote;

        // Verify quote parameters
        const hasOutput = quote.expectedOutput !== undefined || quote.toAmount !== undefined;
        if (!quote.fromToken || !quote.toToken || !quote.fromAmount || !hasOutput) {
          throw new DexError(DEX_ERROR_CODES.INVALID_PARAMS, 'Incomplete quote structure returned.');
        }

        setProgress({
          step: 'QUOTE_READY',
          progressPercent: 25,
          statusMessage: 'Optimal multi-source quote verified.',
          txHash: null,
          quoteHash: quote.quoteHash || null,
          error: null,
        });

        return quote;
      } catch (err: any) {
        const errorMsg = err?.message || 'Error fetching quote';
        setProgress({
          step: 'QUOTE_FAILED',
          progressPercent: 0,
          statusMessage: 'Quote acquisition failed',
          txHash: null,
          quoteHash: null,
          error: errorMsg,
        });
        if (onError) onError(err, 'QUOTE_FAILED');
        return null;
      }
    },
    [onError]
  );

  /**
   * 2. Pre-Flight EVM Simulation with Bytecode and Slippage Validation
   */
  const simulateTrade = useCallback(
    async (quote: SwapQuote, userAddress: string): Promise<TransactionSimulation | null> => {
      // Step 2a: Validate quote freshness
      try {
        TransactionBuilder.validateQuoteFreshness(quote);
      } catch (expErr: any) {
        setProgress({
          step: 'EXPIRED',
          progressPercent: 0,
          statusMessage: 'Swap quote has expired. Fresh quote required.',
          txHash: null,
          quoteHash: quote.quoteHash || null,
          error: expErr.message,
        });
        if (onError) onError(expErr, 'EXPIRED');
        return null;
      }

      setProgress((prev) => ({
        ...prev,
        step: 'SIMULATING',
        progressPercent: 35,
        statusMessage: 'Running pre-flight EVM state simulation...',
        error: null,
      }));

      try {
        const res = await fetch('/api/swaps/simulate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            quote,
            userAddress,
            chainId: quote.chainId || quote.fromToken.chainId,
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new DexError(
            errData.code || DEX_ERROR_CODES.SIMULATION_FAILED,
            errData.userMessage || errData.message || 'Pre-flight transaction simulation failed.'
          );
        }

        const data = await res.json();
        const sim = (data.simulation || data) as TransactionSimulation;

        if (!sim.success || sim.status === 'REVERTED') {
          const reason = sim.warnings && sim.warnings.length > 0 ? sim.warnings.join('; ') : 'Execution would revert on-chain';
          throw new DexError(DEX_ERROR_CODES.SIMULATION_FAILED, reason);
        }

        setProgress((prev) => ({
          ...prev,
          step: 'SIMULATION_PASSED',
          progressPercent: 50,
          statusMessage: 'Simulation passed: Bytecode and slippage verified.',
          error: null,
        }));

        return sim;
      } catch (err: any) {
        const errorMsg = err?.message || 'Transaction simulation failed';
        setProgress((prev) => ({
          ...prev,
          step: 'SIMULATION_FAILED',
          progressPercent: 0,
          statusMessage: 'Simulation failed: Trade blocked',
          error: errorMsg,
        }));
        if (onError) onError(err, 'SIMULATION_FAILED');
        return null;
      }
    },
    [onError]
  );

  /**
   * 3. Complete End-to-End Execution Pipeline (Phases 1-8, 25)
   */
  const executeTradeLifecycle = useCallback(
    async (quote: SwapQuote, userAddress: string): Promise<boolean> => {
      const action = async (): Promise<boolean> => {
        const provider = typeof window !== 'undefined' ? (window as any).ethereum : null;
        if (!provider) {
          throw new DexError(DEX_ERROR_CODES.USER_ADDRESS_REQUIRED, 'No Web3 wallet detected.');
        }

        // STEP 1: Pre-flight Simulation
        const sim = await simulateTrade(quote, userAddress);
        if (!sim || !sim.success) {
          return false;
        }

        // STEP 2: Build Exact Transaction Payload
        setProgress((prev) => ({
          ...prev,
          step: 'BUILDING_TRANSACTION',
          progressPercent: 55,
          statusMessage: 'Constructing exact verified transaction calldata...',
        }));

        const exactTx = TransactionBuilder.buildSwapTransaction({
          quote,
          userAddress: userAddress as Address,
        });

        // STEP 3: Allowance Verification & Real Approval Flow
        const isNativeIn =
          quote.fromToken.symbol === 'ETH' ||
          quote.fromToken.symbol === 'BNB' ||
          quote.fromToken.symbol === 'POL' ||
          quote.fromToken.address === '0x0000000000000000000000000000000000000000';

        if (!isNativeIn) {
          setProgress((prev) => ({
            ...prev,
            step: 'CHECKING_ALLOWANCE',
            progressPercent: 60,
            statusMessage: 'Reading live on-chain token allowance...',
          }));

          const tokenInAddress = quote.fromToken.address as Address;
          const spender = exactTx.to;
          const currentAllowance = await checkOnChainAllowance(provider, tokenInAddress, userAddress as Address, spender);

          if (currentAllowance < exactTx.amountIn) {
            setProgress((prev) => ({
              ...prev,
              step: 'APPROVAL_REQUIRED',
              progressPercent: 65,
              statusMessage: 'Token approval required. Requesting wallet authorization...',
            }));

            // Handle USDT-style reset if needed
            const isUsdt = quote.fromToken.symbol.toUpperCase() === 'USDT';
            const { resetTx, approveTx } = TransactionBuilder.buildApprovalTransaction({
              tokenAddress: tokenInAddress,
              owner: userAddress as Address,
              spender,
              amountIn: exactTx.amountIn,
              currentAllowance,
              resetFirst: isUsdt && currentAllowance > 0n,
            });

            if (resetTx) {
              setProgress((prev) => ({
                ...prev,
                step: 'APPROVING',
                progressPercent: 68,
                statusMessage: 'Resetting existing token allowance to 0 (USDT requirement)...',
              }));
              const resetHash = await provider.request({
                method: 'eth_sendTransaction',
                params: [{ from: userAddress, to: resetTx.to, data: resetTx.data, value: '0x0' }],
              });
              const resetReceipt = await pollForReceipt(provider, resetHash, 45000);
              if (resetReceipt.status !== '0x1' && resetReceipt.status !== 1) {
                throw new DexError(DEX_ERROR_CODES.REVERTED, 'Allowance reset transaction reverted.');
              }
            }

            setProgress((prev) => ({
              ...prev,
              step: 'APPROVING',
              progressPercent: 72,
              statusMessage: 'Submitting exact token approval transaction...',
            }));

            let approvalTxHash: string;
            try {
              approvalTxHash = await provider.request({
                method: 'eth_sendTransaction',
                params: [{ from: userAddress, to: approveTx.to, data: approveTx.data, value: '0x0' }],
              });
            } catch (appErr: any) {
              if (appErr?.code === 4001) {
                throw new DexError(DEX_ERROR_CODES.SIGNATURE_REJECTED, 'Approval request rejected by user.');
              }
              throw new DexError(DEX_ERROR_CODES.EXECUTION_FAILED, appErr?.message || 'Token approval failed.');
            }

            // Wait for approval confirmation
            setProgress((prev) => ({
              ...prev,
              step: 'CONFIRMING',
              progressPercent: 78,
              statusMessage: 'Awaiting on-chain approval confirmation...',
              approvalTxHash,
            }));

            const appReceipt = await pollForReceipt(provider, approvalTxHash, 60000);
            if (appReceipt.status !== '0x1' && appReceipt.status !== 1) {
              throw new DexError(DEX_ERROR_CODES.REVERTED, 'Token approval transaction reverted on-chain.');
            }

            // Re-verify on-chain allowance post-mining
            const postAllowance = await checkOnChainAllowance(provider, tokenInAddress, userAddress as Address, spender);
            if (postAllowance < exactTx.amountIn) {
              throw new DexError(
                DEX_ERROR_CODES.EXECUTION_FAILED,
                'Post-approval check failed: Allowance remains insufficient.'
              );
            }

            setProgress((prev) => ({
              ...prev,
              step: 'APPROVAL_CONFIRMED',
              progressPercent: 82,
              statusMessage: 'Token approval confirmed on-chain.',
            }));
          }
        }

        // STEP 4: Revalidate Quote & Deadline Immediately Before Signing
        setProgress((prev) => ({
          ...prev,
          step: 'REVALIDATING_QUOTE',
          progressPercent: 85,
          statusMessage: 'Re-checking quote validity and deadline...',
        }));

        TransactionBuilder.validateQuoteFreshness(quote);
        const nowEpoch = BigInt(Math.floor(Date.now() / 1000));
        if (nowEpoch > exactTx.deadline) {
          throw new DexError(DEX_ERROR_CODES.QUOTE_EXPIRED, 'Transaction deadline exceeded. Fresh quote required.');
        }

        // STEP 5: Request Wallet Signature on Exact Payload
        setProgress((prev) => ({
          ...prev,
          step: 'SIGNING',
          progressPercent: 88,
          statusMessage: 'Requesting cryptographic transaction signature...',
        }));

        let broadcastHash = '';
        try {
          broadcastHash = await provider.request({
            method: 'eth_sendTransaction',
            params: [
              {
                from: userAddress,
                to: exactTx.to,
                value: exactTx.valueHex,
                data: exactTx.data,
              },
            ],
          });
        } catch (sigErr: any) {
          if (sigErr?.code === 4001) {
            throw new DexError(DEX_ERROR_CODES.SIGNATURE_REJECTED, 'Transaction signing was rejected by user.');
          }
          throw new DexError(DEX_ERROR_CODES.EXECUTION_FAILED, sigErr?.message || 'Transaction submission failed.');
        }

        if (!broadcastHash || !broadcastHash.startsWith('0x')) {
          throw new DexError(DEX_ERROR_CODES.EXECUTION_FAILED, 'Invalid transaction hash returned by wallet.');
        }

        // STEP 6: Broadcasting & Mined Confirmation
        setProgress((prev) => ({
          ...prev,
          step: 'BROADCASTING',
          progressPercent: 92,
          statusMessage: 'Transaction broadcast to network. Waiting for block inclusion...',
          txHash: broadcastHash,
        }));

        setProgress((prev) => ({
          ...prev,
          step: 'CONFIRMING',
          progressPercent: 95,
          statusMessage: 'Mining in progress. Awaiting block receipt...',
        }));

        const receipt = await pollForReceipt(provider, broadcastHash, 90000);

        // STEP 7: Receipt & Output Verification
        setProgress((prev) => ({
          ...prev,
          step: 'VERIFYING',
          progressPercent: 98,
          statusMessage: 'Verifying on-chain swap event logs and output balance...',
        }));

        const expectedTokenOut = (
          quote.toToken.symbol === 'ETH' || quote.toToken.address === '0x0000000000000000000000000000000000000000'
            ? quote.fromToken.address // Native transfer or wrap
            : quote.toToken.address
        ) as Address;

        const verification = ReceiptVerifier.verifyReceipt({
          receipt,
          expectedRecipient: userAddress as Address,
          expectedTokenOut,
          amountOutMinimum: exactTx.amountOutMinimum,
          expectedRouter: exactTx.to,
        });

        if (!verification.verified) {
          if (verification.status === 'TRANSACTION_REVERTED') {
            throw new DexError(DEX_ERROR_CODES.REVERTED, verification.reason || 'Transaction reverted on-chain.');
          }
          throw new DexError(
            DEX_ERROR_CODES.EXECUTION_FAILED,
            verification.reason || 'Output balance verification failed.'
          );
        }

        // STEP 8: True SUCCESS State
        const expectedOutNum = quote.toAmount !== undefined ? quote.toAmount : quote.expectedOutput;
        const formattedActualOut = verification.actualAmountOut
          ? formatUnits(verification.actualAmountOut, quote.toToken.decimals || 18)
          : String(expectedOutNum);

        setProgress({
          step: 'SUCCESS',
          progressPercent: 100,
          statusMessage: `Swap executed and verified! Output: ${parseFloat(formattedActualOut).toFixed(4)} ${quote.toToken.symbol}`,
          txHash: broadcastHash,
          quoteHash: quote.quoteHash || null,
          error: null,
          actualAmountOut: formattedActualOut,
        });

        if (onSuccess) onSuccess(broadcastHash, formattedActualOut);
        return true;
      };

      lastActionRef.current = action;

      try {
        return await action();
      } catch (err: any) {
        const errorMsg = err?.message || 'Transaction execution failed';
        const failureState: ExecutionState =
          err?.code === DEX_ERROR_CODES.SIGNATURE_REJECTED
            ? 'SIGNATURE_REJECTED'
            : err?.code === DEX_ERROR_CODES.QUOTE_EXPIRED
            ? 'EXPIRED'
            : err?.code === DEX_ERROR_CODES.REVERTED
            ? 'TRANSACTION_REVERTED'
            : err?.message?.includes('verification')
            ? 'VERIFICATION_FAILED'
            : 'BROADCAST_FAILED';

        setProgress((prev) => ({
          ...prev,
          step: failureState,
          progressPercent: 0,
          statusMessage: `Failed: ${errorMsg}`,
          error: errorMsg,
        }));

        if (onError) onError(err, failureState);
        return false;
      }
    },
    [simulateTrade, onSuccess, onError]
  );

  const retry = useCallback(() => {
    if (lastActionRef.current) {
      lastActionRef.current();
    }
  }, []);

  const reset = useCallback(() => {
    setProgress({
      step: 'IDLE',
      progressPercent: 0,
      statusMessage: 'Ready for trade execution',
      txHash: null,
      quoteHash: null,
      error: null,
    });
    lastActionRef.current = null;
  }, []);

  const isBusy =
    progress.step !== 'IDLE' &&
    progress.step !== 'QUOTE_READY' &&
    progress.step !== 'SUCCESS' &&
    progress.step !== 'QUOTE_FAILED' &&
    progress.step !== 'SIMULATION_FAILED' &&
    progress.step !== 'APPROVAL_FAILED' &&
    progress.step !== 'SIGNATURE_REJECTED' &&
    progress.step !== 'BROADCAST_FAILED' &&
    progress.step !== 'TRANSACTION_REVERTED' &&
    progress.step !== 'VERIFICATION_FAILED' &&
    progress.step !== 'EXPIRED';

  return {
    progress,
    isBusy,
    fetchQuote,
    simulateTrade,
    executeTradeLifecycle,
    retry,
    reset,
  };
}
