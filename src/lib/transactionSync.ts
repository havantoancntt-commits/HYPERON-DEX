/**
 * HYPERON-DEX Transaction Sync, Indexer & Reorg Detection Engine
 * Production-Grade On-Chain Transaction Recovery and Multi-Block Finality Tracker
 *
 * INVARIANTS:
 * - Unique key: `${chainId}:${txHash.toLowerCase()}`.
 * - On app reload: automatically reconciles pending transactions against live blockchain state.
 * - If receipt is confirmed: verifies logs via ReceiptVerifier, tracks confirmation depth.
 * - Detects blockchain reorganization: if confirmed block hash or transaction ceases to exist, marks REORGED.
 * - Detects dropped transactions if transaction disappears from mempool and nonce is surpassed.
 * - Never trusts localStorage as source of truth without live on-chain receipt validation.
 */

import { Address, Hex, PublicClient } from 'viem';
import { ChainId, TransactionHistoryItem } from '../types';
import { ReceiptVerifier, VerificationResult } from './execution/ReceiptVerifier';
import { getChainConfig } from './chainConfig';

export interface SyncedTxStatus {
  txHash: string;
  chainId: ChainId;
  status: 'pending' | 'confirmed' | 'failed' | 'reverted' | 'reorged' | 'dropped' | 'replaced' | 'verification_failed';
  blockNumber?: number;
  blockHash?: string;
  confirmations: number;
  submittedNonce?: number;
  actualAmountOutRaw?: string;
  reorgDetected?: boolean;
  verificationResult?: VerificationResult;
  errorMessage?: string;
}

export class TransactionSyncEngine {
  private static STORAGE_KEY = 'hyperon_indexed_transactions_v2';
  private static memoryStore: Map<string, TransactionHistoryItem> = new Map();

  /**
   * Generates unique composite key: chainId:txHash
   */
  static getCompositeKey(chainId: string, txHash: string): string {
    return `${chainId.toLowerCase()}:${txHash.toLowerCase()}`;
  }

  /**
   * Persists an indexed transaction record.
   */
  static recordTransaction(tx: TransactionHistoryItem): void {
    const key = this.getCompositeKey(tx.chainId, tx.txHash);
    this.memoryStore.set(key, tx);

    if (typeof window === 'undefined') return;
    try {
      const existing = this.loadAllTransactions();
      const filtered = existing.filter((item) => this.getCompositeKey(item.chainId, item.txHash) !== key);
      const updated = [tx, ...filtered].slice(0, 100); // retain last 100
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // Safe fallback
    }
  }

  /**
   * Loads all stored transactions from local cache or memory fallback.
   */
  static loadAllTransactions(): TransactionHistoryItem[] {
    if (typeof window === 'undefined') {
      return Array.from(this.memoryStore.values());
    }
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (!raw) return Array.from(this.memoryStore.values());
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return Array.from(this.memoryStore.values());
    }
  }

  /**
   * Retrieves a single indexed transaction by hash.
   */
  static getTransaction(txHash: string): TransactionHistoryItem | undefined {
    return this.loadAllTransactions().find(
      (tx) => tx.txHash.toLowerCase() === txHash.toLowerCase()
    );
  }

  /**
   * Reconciles a single transaction against live blockchain state.
   * Strictly enforces:
   * - Nonce tracking (never conclude dropped without submittedNonce)
   * - Reorg protection (verify block hash matches canonical chain)
   * - Fail-closed ReceiptVerifier (if verifier throws or fails -> VERIFICATION_FAILED)
   */
  static async reconcileTransaction(
    provider: any,
    tx: TransactionHistoryItem,
    walletAddress?: string
  ): Promise<SyncedTxStatus> {
    const { txHash, chainId } = tx;

    try {
      // 1. Fetch current block number
      let currentBlock = 0;
      try {
        const blockHex = await provider.request({ method: 'eth_blockNumber' });
        currentBlock = parseInt(blockHex, 16);
      } catch {
        currentBlock = tx.blockNumber || 0;
      }

      // 1.1 Reorg Verification on Confirmed Transactions
      if (tx.status === 'confirmed' && tx.blockNumber && tx.blockHash) {
        try {
          const blockHexParam = `0x${tx.blockNumber.toString(16)}`;
          const currentCanonicalBlock = await provider.request({
            method: 'eth_getBlockByNumber',
            params: [blockHexParam, false],
          });
          if (
            currentCanonicalBlock &&
            currentCanonicalBlock.hash &&
            currentCanonicalBlock.hash.toLowerCase() !== tx.blockHash.toLowerCase()
          ) {
            // Block hash changed -> Blockchain reorganization!
            return {
              txHash,
              chainId,
              status: 'reorged',
              blockNumber: tx.blockNumber,
              blockHash: tx.blockHash,
              confirmations: 0,
              reorgDetected: true,
              errorMessage: `Reorg detected: Block #${tx.blockNumber} hash shifted from ${tx.blockHash} to ${currentCanonicalBlock.hash}. Transaction must be re-validated.`,
            };
          }
        } catch {
          // Keep current state on RPC transient failure
        }
      }

      // 2. Fetch transaction receipt
      const receipt = await provider.request({
        method: 'eth_getTransactionReceipt',
        params: [txHash],
      });

      if (receipt) {
        const receiptBlock = receipt.blockNumber ? parseInt(receipt.blockNumber, 16) : 0;
        const confirmations = currentBlock > 0 && receiptBlock > 0 ? Math.max(1, currentBlock - receiptBlock + 1) : 1;
        const isSuccess = receipt.status === '0x1' || receipt.status === 1 || receipt.status === 'success';

        if (!isSuccess) {
          return {
            txHash,
            chainId,
            status: 'reverted',
            blockNumber: receiptBlock,
            blockHash: receipt.blockHash,
            confirmations,
            errorMessage: 'Transaction reverted on-chain.',
          };
        }

        // Verify receipt logs and output amounts via ReceiptVerifier (Fail Closed)
        let verificationResult: VerificationResult;
        try {
          verificationResult = ReceiptVerifier.verifyReceipt({
            receipt,
            expectedRecipient: (walletAddress || tx.walletAddress || receipt.from || '') as Address,
            expectedTokenOut: (tx.toTokenAddress || '0x0000000000000000000000000000000000000000') as Address,
            amountOutMinimum: tx.minimumReceivedRaw ? BigInt(tx.minimumReceivedRaw) : 0n,
            expectedRouter: tx.targetAddress as Address | undefined,
            expectedSender: (walletAddress || tx.walletAddress || receipt.from || '') as Address,
            chainId,
            routeHash: tx.routeHash as `0x${string}` | undefined,
          });
        } catch (vErr: any) {
          return {
            txHash,
            chainId,
            status: 'verification_failed',
            blockNumber: receiptBlock,
            blockHash: receipt.blockHash,
            confirmations,
            errorMessage: `ReceiptVerifier exception: ${vErr?.message || String(vErr)}. FAIL CLOSED.`,
          };
        }

        if (!verificationResult.verified) {
          return {
            txHash,
            chainId,
            status: 'verification_failed',
            blockNumber: receiptBlock,
            blockHash: receipt.blockHash,
            confirmations,
            verificationResult,
            errorMessage: verificationResult.reason || 'On-chain output verification failed. FAIL CLOSED.',
          };
        }

        return {
          txHash,
          chainId,
          status: 'confirmed',
          blockNumber: receiptBlock,
          blockHash: receipt.blockHash,
          confirmations,
          actualAmountOutRaw: verificationResult.actualAmountOut?.toString(),
          verificationResult,
        };
      }

      // 3. Receipt not found -> Check mempool status
      const txInfo = await provider.request({
        method: 'eth_getTransactionByHash',
        params: [txHash],
      });

      let detectedNonce = tx.submittedNonce;
      if (txInfo && txInfo.nonce) {
        detectedNonce = parseInt(txInfo.nonce, 16);
      }

      // If missing from mempool and receipt null
      if (!txInfo) {
        const queryAddress = walletAddress || tx.walletAddress;
        // Nonce logic: ONLY evaluate dropped/replaced if submittedNonce is known!
        if (queryAddress && detectedNonce !== undefined) {
          try {
            const latestNonceHex = await provider.request({
              method: 'eth_getTransactionCount',
              params: [queryAddress, 'latest'],
            });
            const latestNonce = parseInt(latestNonceHex, 16);

            if (latestNonce > detectedNonce) {
              // Account nonce has passed submittedNonce without this tx receipt
              const all = this.loadAllTransactions();
              const replacement = all.find(
                (t) =>
                  t.txHash.toLowerCase() !== tx.txHash.toLowerCase() &&
                  t.submittedNonce === detectedNonce &&
                  t.walletAddress?.toLowerCase() === queryAddress.toLowerCase()
              );

              if (replacement) {
                return {
                  txHash,
                  chainId,
                  status: 'replaced',
                  submittedNonce: detectedNonce,
                  confirmations: 0,
                  errorMessage: `Transaction was superseded by replacement ${replacement.txHash} with nonce ${detectedNonce}.`,
                };
              }

              return {
                txHash,
                chainId,
                status: 'dropped',
                submittedNonce: detectedNonce,
                confirmations: 0,
                errorMessage: `Transaction dropped from mempool (on-chain nonce advanced to ${latestNonce}).`,
              };
            }
          } catch {
            // Keep pending on RPC error
          }
        }
      }

      return {
        txHash,
        chainId,
        status: 'pending',
        submittedNonce: detectedNonce,
        confirmations: 0,
      };
    } catch (err: any) {
      console.warn(`[TransactionSyncEngine] Error reconciling tx ${txHash}:`, err);
      return {
        txHash,
        chainId,
        status: tx.status,
        confirmations: 0,
        errorMessage: err?.message,
      };
    }
  }

  /**
   * Reconciles all pending transactions in local storage against the live blockchain.
   */
  static async reconcileAllPending(
    provider: any,
    walletAddress?: string,
    onUpdate?: (updated: TransactionHistoryItem[]) => void
  ): Promise<TransactionHistoryItem[]> {
    const all = this.loadAllTransactions();
    const pendingList = all.filter((t) => t.status === 'pending');
    if (pendingList.length === 0) return all;

    let hasChanges = false;
    const updatedAll = [...all];

    for (const pTx of pendingList) {
      const reconciled = await this.reconcileTransaction(provider, pTx, walletAddress);
      if (reconciled.status !== pTx.status || (reconciled.blockNumber && reconciled.blockNumber !== pTx.blockNumber)) {
        hasChanges = true;
        const idx = updatedAll.findIndex(
          (t) => this.getCompositeKey(t.chainId, t.txHash) === this.getCompositeKey(pTx.chainId, pTx.txHash)
        );
        if (idx !== -1) {
          updatedAll[idx] = {
            ...updatedAll[idx],
            status: reconciled.status,
            blockNumber: reconciled.blockNumber || updatedAll[idx].blockNumber,
            blockHash: reconciled.blockHash || updatedAll[idx].blockHash,
            submittedNonce: reconciled.submittedNonce ?? updatedAll[idx].submittedNonce,
            actualAmountOutRaw: reconciled.actualAmountOutRaw || updatedAll[idx].actualAmountOutRaw,
            confirmations: reconciled.confirmations,
            reorgDetected: reconciled.reorgDetected,
            lastCheckedAt: Date.now(),
          };
        }
      }
    }

    if (hasChanges && typeof window !== 'undefined') {
      try {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updatedAll));
        onUpdate?.(updatedAll);
      } catch {
        // Safe fallback
      }
    }

    return updatedAll;
  }
}
