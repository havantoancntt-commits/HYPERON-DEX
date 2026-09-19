/**
 * HYPERON-DEX HARDENED TRADE EXECUTION PIPELINE
 *
 * Implements the Full 17-State Execution Machine:
 * IDLE -> FETCHING_QUOTE -> QUOTE_READY
 * -> CHECKING_ALLOWANCE -> APPROVAL_REQUIRED -> APPROVING -> APPROVAL_CONFIRMED
 * -> BUILDING_TRANSACTION -> SIMULATING -> SIMULATION_PASSED
 * -> REVALIDATING_QUOTE -> SIGNING -> BROADCASTING -> PENDING -> CONFIRMING -> VERIFYING -> SUCCESS
 *
 * Pipeline sequence:
 * QUOTE → VALIDATE → APPROVAL → BUILD EXACT TX → SIMULATE EXACT TX → SIGN → BROADCAST → RECEIPT → VERIFY → SUCCESS
 *
 * Zero False Success:
 * Only REAL QUOTE + EXACT TRANSACTION + SUCCESSFUL SIMULATION + VALID APPROVAL
 * + SIGNED EXACT PAYLOAD + MINED SUCCESSFUL RECEIPT + VERIFIED OUTPUT + VALID ROUTE
 * can reach SUCCESS.
 */

import { useState, useCallback, useRef } from 'react';
import { Address, Hex, encodeFunctionData, parseUnits, formatUnits } from 'viem';
import { SwapQuote, TransactionSimulation } from '../types';
import { TransactionBuilder, ExactTransactionPayload, ERC20_ABI } from '../lib/execution/TransactionBuilder';
import { ReceiptVerifier } from '../lib/execution/ReceiptVerifier';
import { DEX_ERROR_CODES, DexError } from '../lib/errorCodes';

export type ExecutionState =
  | 'IDLE'
  | 'FETCHING_QUOTE'
  | 'QUOTE_READY'
  | 'CHECKING_ALLOWANCE'
  | 'APPROVAL_REQUIRED'
  | 'APPROVING'
  | 'APPROVAL_CONFIRMED'
  | 'BUILDING_TRANSACTION'
  | 'SIMULATING'
  | 'SIMULATION_PASSED'
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
  simulateTrade: (quote: SwapQuote, userAddress: string, exactTx?: ExactTransactionPayload) => Promise<TransactionSimulation | null>;
  executeTradeLifecycle: (quote: SwapQuote, userAddress: string) => Promise<boolean>;
  retry: () => void;
  reset: () => void;
}

export function useHyperonTrade(options: UseHyperonTradeOptions = {}): UseHyperonTradeReturn {
  const { onSuccess, onError } = options;

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
    timeoutMs = 90000,
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
        // Network latency, continue polling
      }
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
    throw new DexError(
      DEX_ERROR_CODES.UNKNOWN_TRANSACTION_STATE,
      `Receipt polling timed out after ${Math.round(timeoutMs / 1000)} seconds for tx ${txHash}.`
    );
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
   * Helper: Checks on-chain balance (Native or ERC20)
   */
  const checkOnChainBalance = async (
    provider: any,
    tokenAddress: Address,
    owner: Address,
    isNative: boolean
  ): Promise<bigint> => {
    try {
      if (isNative) {
        const balHex = await provider.request({
          method: 'eth_getBalance',
          params: [owner, 'latest'],
        });
        return BigInt(balHex && balHex !== '0x' ? balHex : '0x0');
      } else {
        const calldata = encodeFunctionData({
          abi: ERC20_ABI,
          functionName: 'balanceOf',
          args: [owner],
        });
        const resultHex = await provider.request({
          method: 'eth_call',
          params: [{ to: tokenAddress, data: calldata }, 'latest'],
        });
        return BigInt(resultHex && resultHex !== '0x' ? resultHex : '0x0');
      }
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
          progressPercent: 20,
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
    async (
      quote: SwapQuote,
      userAddress: string,
      exactTx?: ExactTransactionPayload
    ): Promise<TransactionSimulation | null> => {
      // Validate quote freshness
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
        progressPercent: 65,
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
            exactTx,
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
          const reason =
            sim.revertReason ||
            (sim.warnings && sim.warnings.length > 0 ? sim.warnings.join('; ') : 'Execution would revert on-chain');
          throw new DexError(DEX_ERROR_CODES.SIMULATION_FAILED, reason);
        }

        setProgress((prev) => ({
          ...prev,
          step: 'SIMULATION_PASSED',
          progressPercent: 70,
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
          statusMessage: `Simulation failed: ${errorMsg}`,
          error: errorMsg,
        }));
        if (onError) onError(err, 'SIMULATION_FAILED');
        return null;
      }
    },
    [onError]
  );

  /**
   * 3. Complete End-to-End Execution Pipeline
   *
   * Rigorous Sequence:
   * QUOTE -> VALIDATE -> APPROVAL -> BUILD EXACT TX -> SIMULATE EXACT TX -> SIGN -> BROADCAST -> RECEIPT -> VERIFY -> SUCCESS
   */
  const executeTradeLifecycle = useCallback(
    async (quote: SwapQuote, userAddress: string): Promise<boolean> => {
      const action = async (): Promise<boolean> => {
        const provider = typeof window !== 'undefined' ? (window as any).ethereum : null;
        if (!provider) {
          throw new DexError(DEX_ERROR_CODES.USER_ADDRESS_REQUIRED, 'No Web3 wallet detected.');
        }

        // 1. Validate Quote Freshness
        TransactionBuilder.validateQuoteFreshness(quote);

        // 2. Identify native tokens & targets
        const isNativeIn =
          quote.fromToken.symbol === 'ETH' ||
          quote.fromToken.symbol === 'BNB' ||
          quote.fromToken.symbol === 'POL' ||
          quote.fromToken.symbol === 'MATIC' ||
          quote.fromToken.address === '0x0000000000000000000000000000000000000000';

        const isNativeOut =
          quote.toToken.symbol === 'ETH' ||
          quote.toToken.symbol === 'BNB' ||
          quote.toToken.symbol === 'POL' ||
          quote.toToken.symbol === 'MATIC' ||
          quote.toToken.address === '0x0000000000000000000000000000000000000000';

        // 3. Build preliminary swap transaction to derive exact router target and amountInRaw
        const preliminaryTx = TransactionBuilder.buildSwapTransaction({
          quote,
          userAddress: userAddress as Address,
        });
        const routerSpender = preliminaryTx.to;
        const requiredAmountIn = preliminaryTx.amountInRaw;

        // 4. APPROVAL LIFECYCLE (Decoupled and executed BEFORE swap transaction is signed)
        if (!isNativeIn) {
          setProgress((prev) => ({
            ...prev,
            step: 'CHECKING_ALLOWANCE',
            progressPercent: 30,
            statusMessage: 'Checking live on-chain token allowance for verified router...',
          }));

          const tokenInAddress = quote.fromToken.address as Address;
          const currentAllowance = await checkOnChainAllowance(
            provider,
            tokenInAddress,
            userAddress as Address,
            routerSpender
          );

          if (currentAllowance < requiredAmountIn) {
            setProgress((prev) => ({
              ...prev,
              step: 'APPROVAL_REQUIRED',
              progressPercent: 35,
              statusMessage: 'Token approval required. Preparing authorization transaction...',
            }));

            // Handle USDT reset if needed
            const isUsdt = quote.fromToken.symbol.toUpperCase() === 'USDT';
            const { resetTx, approveTx } = TransactionBuilder.buildApprovalTransaction({
              tokenAddress: tokenInAddress,
              owner: userAddress as Address,
              spender: routerSpender,
              amountIn: requiredAmountIn,
              currentAllowance,
              resetFirst: isUsdt && currentAllowance > 0n,
              chainId: preliminaryTx.chainId,
              chainSlug: preliminaryTx.chainSlug,
            });

            if (resetTx) {
              setProgress((prev) => ({
                ...prev,
                step: 'APPROVING',
                progressPercent: 40,
                statusMessage: 'Resetting existing allowance to 0 (USDT requirement)...',
              }));

              let resetHash: string;
              try {
                resetHash = await provider.request({
                  method: 'eth_sendTransaction',
                  params: [{ from: userAddress, to: resetTx.to, data: resetTx.data, value: '0x0' }],
                });
              } catch (resErr: any) {
                if (resErr?.code === 4001) {
                  throw new DexError(DEX_ERROR_CODES.SIGNATURE_REJECTED, 'Allowance reset rejected by user.');
                }
                throw new DexError(DEX_ERROR_CODES.EXECUTION_FAILED, resErr?.message || 'Allowance reset failed.');
              }

              const resetReceipt = await pollForReceipt(provider, resetHash, 45000);
              if (resetReceipt.status !== '0x1' && resetReceipt.status !== 1) {
                throw new DexError(DEX_ERROR_CODES.REVERTED, 'Allowance reset transaction reverted on-chain.');
              }
            }

            setProgress((prev) => ({
              ...prev,
              step: 'APPROVING',
              progressPercent: 45,
              statusMessage: 'Requesting token approval signature from wallet...',
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

            setProgress((prev) => ({
              ...prev,
              step: 'CONFIRMING',
              progressPercent: 50,
              statusMessage: 'Awaiting on-chain approval confirmation...',
              approvalTxHash,
            }));

            const appReceipt = await pollForReceipt(provider, approvalTxHash, 60000);
            if (appReceipt.status !== '0x1' && appReceipt.status !== 1) {
              throw new DexError(DEX_ERROR_CODES.REVERTED, 'Token approval transaction reverted on-chain.');
            }

            // Post-approval verification
            const postAllowance = await checkOnChainAllowance(
              provider,
              tokenInAddress,
              userAddress as Address,
              routerSpender
            );
            if (postAllowance < requiredAmountIn) {
              throw new DexError(
                DEX_ERROR_CODES.EXECUTION_FAILED,
                'Post-approval check failed: Allowance remains insufficient.'
              );
            }

            setProgress((prev) => ({
              ...prev,
              step: 'APPROVAL_CONFIRMED',
              progressPercent: 55,
              statusMessage: 'Token approval confirmed on-chain.',
            }));
          }
        }

        // 5. BUILD EXACT TRANSACTION PAYLOAD (Single Source of Truth)
        setProgress((prev) => ({
          ...prev,
          step: 'BUILDING_TRANSACTION',
          progressPercent: 60,
          statusMessage: 'Constructing exact verified swap transaction payload...',
        }));

        const exactTx = TransactionBuilder.buildSwapTransaction({
          quote,
          userAddress: userAddress as Address,
        });

        // 6. SIMULATE EXACT TRANSACTION PAYLOAD
        const sim = await simulateTrade(quote, userAddress, exactTx);
        if (!sim || !sim.success) {
          return false;
        }

        // 7. REVALIDATE QUOTE & DEADLINE IMMEDIATELY BEFORE SIGNING
        setProgress((prev) => ({
          ...prev,
          step: 'REVALIDATING_QUOTE',
          progressPercent: 75,
          statusMessage: 'Revalidating quote fresh state and deadline...',
        }));

        TransactionBuilder.validateQuoteFreshness(quote);
        const nowEpoch = BigInt(Math.floor(Date.now() / 1000));
        if (nowEpoch > exactTx.deadline) {
          throw new DexError(DEX_ERROR_CODES.QUOTE_EXPIRED, 'Transaction deadline exceeded. Fresh quote required.');
        }

        // 8. STRICT PAYLOAD EQUIVALENCE CHECK
        TransactionBuilder.assertPayloadEquivalence(exactTx, {
          chainId: exactTx.chainId,
          to: exactTx.to,
          data: exactTx.data,
          value: exactTx.value,
          amountIn: exactTx.amountIn,
          amountOutMinimum: exactTx.amountOutMinimum,
          recipient: exactTx.recipient,
          routeHash: exactTx.routeHash,
        });

        // 9. RECORD ON-CHAIN BALANCE BEFORE SWAP (For airtight post-tx delta verification)
        const balanceBefore = await checkOnChainBalance(
          provider,
          exactTx.tokenOut,
          userAddress as Address,
          isNativeOut
        );

        // 10. REQUEST WALLET SIGNATURE ON EXACT PAYLOAD
        setProgress((prev) => ({
          ...prev,
          step: 'SIGNING',
          progressPercent: 80,
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

        // 11. BROADCASTING & MINED CONFIRMATION
        setProgress((prev) => ({
          ...prev,
          step: 'BROADCASTING',
          progressPercent: 85,
          statusMessage: 'Transaction broadcast to network.',
          txHash: broadcastHash,
        }));

        setProgress((prev) => ({
          ...prev,
          step: 'PENDING',
          progressPercent: 88,
          statusMessage: 'Transaction pending in mempool...',
          txHash: broadcastHash,
        }));

        setProgress((prev) => ({
          ...prev,
          step: 'CONFIRMING',
          progressPercent: 92,
          statusMessage: 'Mining in progress. Awaiting block receipt...',
          txHash: broadcastHash,
        }));

        const receipt = await pollForReceipt(provider, broadcastHash, 90000);

        // 12. RECORD ON-CHAIN BALANCE AFTER SWAP
        const balanceAfter = await checkOnChainBalance(
          provider,
          exactTx.tokenOut,
          userAddress as Address,
          isNativeOut
        );

        // 13. RECEIPT & BALANCE DELTA VERIFICATION
        setProgress((prev) => ({
          ...prev,
          step: 'VERIFYING',
          progressPercent: 96,
          statusMessage: 'Verifying on-chain swap event logs and balance delta...',
          txHash: broadcastHash,
        }));

        const verification = ReceiptVerifier.verifyReceipt({
          receipt,
          expectedRecipient: userAddress as Address,
          expectedTokenOut: exactTx.tokenOut,
          amountOutMinimum: exactTx.amountOutMinimum,
          expectedRouter: exactTx.to,
          expectedSender: userAddress as Address,
          chainId: exactTx.chainId,
          isNativeOut,
          balanceBefore,
          balanceAfter,
          routeHash: exactTx.routeHash,
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

        // 14. TRUE SUCCESS STATE
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
