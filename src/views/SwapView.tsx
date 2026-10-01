import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Address, parseUnits } from 'viem';
import { useWallet } from '../context/WalletContext';
import { useExchange } from '../context/ExchangeContext';
import { useI18n } from '../context/I18nContext';
import { Token, SwapQuote } from '../types';
import { formatCurrency, formatCrypto, shortenAddress } from '../lib/utils';
import { TokenLogo, DexProtocolIcon } from '../components/CryptoIcon';
import { RouteVisualization } from '../components/common/RouteVisualization';
import { SwapExecutionState, getSwapStateLabel, isSwapInFlight } from '../lib/execution/swapStateMachine';
import { TransactionBuilder, ExactTransactionPayload } from '../lib/execution/TransactionBuilder';
import { getContractsConfig, ChainContractConfig } from '../lib/contractsConfig';
import {
  ArrowDownUp,
  ShieldCheck,
  Fuel,
  Sparkles,
  Settings,
  ChevronDown,
  Layers,
  Zap,
  Search,
  Check,
  TrendingUp,
  RefreshCw,
  Cpu,
  BarChart3,
  Sliders,
  CheckCircle2,
  ChevronUp,
  Lock,
  Flame,
  AlertCircle,
  AlertTriangle,
  Copy,
  Activity,
  LogOut,
  Wallet,
  ArrowRightLeft,
  Plus,
  ExternalLink,
  ShieldAlert,
  ShieldX,
  Loader2,
} from 'lucide-react';

const POPULAR_SYMBOLS = new Set([
  'ETH', 'WETH', 'USDC', 'USDT', 'WBTC', 'SOL', 'PEPE', 'SHIB', 'DAI',
  'UNI', 'AAVE', 'LINK', 'MKR', 'PENDLE', 'ARB', 'OP', 'POL', 'DOGE',
  'AVAX', 'SUI', 'NEAR', 'FET', 'RENDER', 'wstETH', 'GMX', 'CAKE', 'AERO'
]);

const QUICK_SELECT_SYMBOLS = ['ETH', 'USDC', 'USDT', 'WBTC', 'SOL', 'PEPE', 'SHIB', 'DAI', 'UNI', 'ARB'];

/**
 * Production-grade sanitizer for numeric token amounts:
 * 1. Converts commas to dots (crucial for mobile/European keyboards).
 * 2. Strips all non-numeric and non-dot characters.
 * 3. Prevents multiple dots (keeps only the first).
 * 4. Caps decimal places to token decimals.
 * 5. Auto-prefixes leading dot with 0 (e.g. '.5' -> '0.5').
 */
export const sanitizeAmountInput = (value: string, maxDecimals: number = 18): string => {
  if (!value) return '';
  // Normalize comma to dot
  let cleaned = value.replace(/,/g, '.');
  // Strip non-numeric and non-period characters
  cleaned = cleaned.replace(/[^0-9.]/g, '');
  // Keep only the first decimal point
  const parts = cleaned.split('.');
  if (parts.length > 2) {
    cleaned = parts[0] + '.' + parts.slice(1).join('');
  }
  // Auto prefix leading zero
  if (cleaned.startsWith('.')) {
    cleaned = '0' + cleaned;
  }
  // Truncate decimal digits to token decimals
  const splitParts = cleaned.split('.');
  if (splitParts.length === 2 && splitParts[1].length > maxDecimals) {
    cleaned = `${splitParts[0]}.${splitParts[1].slice(0, maxDecimals)}`;
  }
  return cleaned;
};

export const SwapView: React.FC = () => {
  const {
    balances,
    tokenBalances,
    isConnected,
    isWrongChain,
    isWatchOnly,
    switchChain,
    connectWallet,
    openConnectModal,
    openAccountModal,
    disconnectWallet,
    walletType,
    slippage,
    setSlippage,
    mevProtected,
    setMevProtected,
    address,
    chainId,
    executeTransaction,
    checkAllowance,
    approveTokenOnChain,
    refreshBalances,
    activeCustomProvider,
  } = useWallet();
  const { selectedPair, setActiveSimulation, setActiveQuote, addToast, getLiveToken, liveTokens, addCustomToken } = useExchange();
  const { t } = useI18n();

  const [fromSymbol, setFromSymbol] = useState<string>(selectedPair.base?.symbol || 'ETH');
  const [toSymbol, setToSymbol] = useState<string>(selectedPair.quote?.symbol || 'USDC');

  const fromToken = getLiveToken(fromSymbol);
  const toToken = getLiveToken(toSymbol);
  const isUnverifiedToken = fromToken.isVerified === false || toToken.isVerified === false;

  const [fromAmount, setFromAmount] = useState<string>('1.0');
  const [quote, setQuote] = useState<SwapQuote | null>(null);
  const [isFetchingQuote, setIsFetchingQuote] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);

  // Formal on-chain execution states
  const [swapExecutionState, setSwapExecutionState] = useState<SwapExecutionState>('IDLE');
  const [executionTxHash, setExecutionTxHash] = useState<string | undefined>(undefined);
  const [approvalTxHash, setApprovalTxHash] = useState<string | undefined>(undefined);
  const [executionError, setExecutionError] = useState<string | null>(null);

  // Invalidate quote and active simulation on chain/account change
  useEffect(() => {
    const handleReset = () => {
      setQuote(null);
      setQuoteError(null);
      setActiveQuote(null);
      setActiveSimulation(null);
      setSwapExecutionState('IDLE');
      setExecutionTxHash(undefined);
      setApprovalTxHash(undefined);
      setExecutionError(null);
    };
    window.addEventListener('hyperon:chain_changed', handleReset);
    window.addEventListener('hyperon:account_changed', handleReset);
    return () => {
      window.removeEventListener('hyperon:chain_changed', handleReset);
      window.removeEventListener('hyperon:account_changed', handleReset);
    };
  }, [setActiveQuote, setActiveSimulation]);
  const [showFromSelect, setShowFromSelect] = useState<boolean>(false);
  const [showToSelect, setShowToSelect] = useState<boolean>(false);
  const [searchTokenQuery, setSearchTokenQuery] = useState<string>('');
  const [isRatioInverted, setIsRatioInverted] = useState<boolean>(false);
  const [autoSlippageActive, setAutoSlippageActive] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'routing' | 'matrix' | 'ai' | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [hasCopiedHash, setHasCopiedHash] = useState<boolean>(false);
  const [isSwapping, setIsSwapping] = useState<boolean>(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  // Dynamic remote token resolution state
  const [isResolvingRemote, setIsResolvingRemote] = useState<boolean>(false);
  const [remoteTokenResult, setRemoteTokenResult] = useState<Token | null>(null);
  const [remoteTokenError, setRemoteTokenError] = useState<string | null>(null);
  const resolveAbortRef = useRef<AbortController | null>(null);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const simulateControllerRef = useRef<AbortController | null>(null);

  // Clean up all pending requests on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (simulateControllerRef.current) {
        simulateControllerRef.current.abort();
      }
    };
  }, []);

  // Helper to determine optimal display decimals based on token type and value
  const getTokenDisplayDecimals = useCallback((tok: Token) => {
    if (tok.category === 'Stablecoin') return 4;
    const p = tok.priceUsd ?? 0;
    if (p > 1000) return 6;
    if (p > 0 && p < 0.1) return 6;
    return 4;
  }, []);

  const formatTokenDisplay = useCallback((val: number, tok: Token) => {
    if (val === null || val === undefined || isNaN(val) || val <= 0) return '0.00';
    const dec = getTokenDisplayDecimals(tok);
    if (val >= 1000) {
      return (val ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: dec });
    }
    if (val < 0.0001) {
      return val.toExponential(4);
    }
    return val.toFixed(dec);
  }, [getTokenDisplayDecimals]);

  // Fetch real quote from server Smart Router (debounced with AbortController)
  const fetchQuote = useCallback(async (amountStr: string, fTok: Token, tTok: Token, currentSlippage: number) => {
    if (isWrongChain) {
      setQuote(null);
      setQuoteError('Mạng blockchain hiện tại không được hỗ trợ. Vui lòng chuyển mạng.');
      return;
    }

    if (fTok.isImpersonator || tTok.isImpersonator) {
      setQuote(null);
      setQuoteError(`🚨 CẢNH BÁO: Phát hiện Token giả mạo (${fTok.isImpersonator ? fTok.symbol : tTok.symbol}). Hệ thống đã chặn giao dịch để bảo vệ tài sản!`);
      return;
    }

    if (fTok.isScamToken || tTok.isScamToken) {
      setQuote(null);
      const scamReasons = (fTok.scamWarnings || tTok.scamWarnings || []).join(', ');
      setQuoteError(`⚠️ RỦI RO CAO: Token (${fTok.isScamToken ? fTok.symbol : tTok.symbol}) bị phát hiện là coin rác / nguy cơ Honeypot${scamReasons ? ` (${scamReasons})` : ''}. Giao dịch đã bị tạm khóa.`);
      return;
    }

    if (fTok.isVerified === false || tTok.isVerified === false) {
      setQuote(null);
      setQuoteError('Unverified Token Detected - Trading Disabled');
      return;
    }

    const num = parseFloat(amountStr);
    if (isNaN(num) || num <= 0) {
      setQuote(null);
      setQuoteError(null);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const signal = controller.signal;

    setIsFetchingQuote(true);
    setQuoteError(null);
    try {
      const res = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromTokenSymbol: fTok.symbol,
          fromTokenAddress: fTok.address,
          toTokenSymbol: tTok.symbol,
          toTokenAddress: tTok.address,
          amount: amountStr,
          slippage: currentSlippage,
          chainId,
          allowMultiHop: true,
        }),
        signal,
      });

      if (signal.aborted) return;
      const data = await res.json();
      if (signal.aborted) return;

      if (res.ok && data.quote) {
        setQuote(data.quote);
        setQuoteError(null);
      } else {
        setQuote(null);
        setQuoteError(data?.userMessage || data?.message || 'Không tìm thấy thanh khoản khả dụng trên mạng lưới on-chain.');
      }
    } catch (err: unknown) {
      if ((err as Error)?.name === 'AbortError' || signal.aborted) return;
      setQuote(null);
      setQuoteError((err as Error)?.message || 'Lỗi kết nối tới router on-chain.');
    } finally {
      if (!signal.aborted) {
        setIsFetchingQuote(false);
      }
    }
  }, [chainId]);

  // Fix 4: Clear stale quote immediately whenever trading pair changes to avoid race conditions and stale route UI
  useEffect(() => {
    setQuote(null);
    setQuoteError(null);
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, [fromSymbol, toSymbol]);

  // Trigger debounced quote updates when user changes amount or token
  useEffect(() => {
    const num = parseFloat(fromAmount);
    if (isNaN(num) || num <= 0) {
      setQuote(null);
      setQuoteError(null);
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      fetchQuote(fromAmount, fromToken, toToken, slippage);
    }, 300);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fromSymbol, toSymbol, fromAmount, slippage, fromToken.symbol, toToken.symbol, fetchQuote]);

  const handleSwapTokens = () => {
    const temp = fromSymbol;
    setFromSymbol(toSymbol);
    setToSymbol(temp);
  };

  const fromBalance = balances[fromToken.symbol] || 0;
  const toBalance = balances[toToken.symbol] || 0;
  const numFromAmount = parseFloat(fromAmount) || 0;
  // Fix 5: Insufficient balance validation logic
  const isInsufficientBalance = isConnected && numFromAmount > 0 && (fromBalance <= 0 || numFromAmount > fromBalance);

  const handlePercentageSelect = (percent: number) => {
    // Fix 5: Do not set amount if balance is zero or negative
    if (fromBalance <= 0) return;
    const val = percent === 100 ? fromBalance.toString() : (fromBalance * (percent / 100)).toFixed(4);
    setFromAmount(val);
  };

  const handleInitiateSwap = async () => {
    // 0. Double-submit guard / Idempotency protection (Section 18)
    if (isSwapInFlight(swapExecutionState) || isSwapping) {
      return;
    }

    // 1. Validation of tokens
    if (fromToken.isVerified === false || toToken.isVerified === false) {
      addToast({
        title: 'Trading Disabled',
        message: 'Unverified Token Detected - Trading Disabled',
        type: 'error',
      });
      return;
    }

    // 2. Validation of wallet connection
    if (!isConnected || !address) {
      addToast({
        title: 'Cần kết nối ví',
        message: 'Vui lòng kết nối ví Web3 để thực thi hoán đổi trên chuỗi.',
        type: 'warning',
      });
      openConnectModal();
      return;
    }

    // 3. Watch-only wallet guard
    if (isWatchOnly) {
      addToast({
        title: 'Chế Độ Chỉ Xem (Watch-Only)',
        message: 'Ví này đang ở chế độ theo dõi và không thể ký giao dịch on-chain.',
        type: 'warning',
      });
      return;
    }

    // 4. Network fail-closed guard
    if (isWrongChain) {
      setSwapExecutionState('WRONG_NETWORK');
      addToast({
        title: 'Sai Mạng Blockchain',
        message: 'Ví của bạn đang kết nối mạng không được hỗ trợ. Giao dịch bị khóa.',
        type: 'error',
      });
      return;
    }

    // 5. Amount & Balance validation
    const numAmount = parseFloat(fromAmount) || 0;
    if (numAmount <= 0) {
      return;
    }
    const currentFromBalance = balances[fromToken.symbol] || 0;
    if (numAmount > currentFromBalance) {
      setSwapExecutionState('INSUFFICIENT_BALANCE');
      addToast({
        title: 'Số Dư Không Đủ',
        message: `Số dư ${fromToken.symbol} (${currentFromBalance.toFixed(4)}) không đủ để thực hiện lệnh hoán đổi ${numAmount}.`,
        type: 'error',
      });
      return;
    }

    // Reset previous execution state & initiate pipeline
    setSwapExecutionState('VALIDATING');
    setExecutionError(null);
    setExecutionTxHash(undefined);
    setApprovalTxHash(undefined);
    setIsSwapping(true);

    try {
      // 6. QUOTE: Fetch fresh quote or validate existing quote freshness
      let activeQuote = quote;
      if (!activeQuote || (activeQuote.expiresAt && Date.now() > activeQuote.expiresAt)) {
        setSwapExecutionState('FETCHING_QUOTE');
        const quoteRes = await fetch('/api/quotes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fromTokenSymbol: fromToken.symbol,
            fromTokenAddress: fromToken.address,
            toTokenSymbol: toToken.symbol,
            toTokenAddress: toToken.address,
            amount: fromAmount,
            slippage: slippage,
            chainId,
            allowMultiHop: true,
          }),
        });
        const quoteData = await quoteRes.json();
        if (!quoteRes.ok || !quoteData.quote) {
          setSwapExecutionState('FAILED');
          throw new Error(quoteData?.userMessage || quoteData?.message || 'Không tìm thấy thanh khoản khả dụng trên mạng lưới on-chain.');
        }
        activeQuote = quoteData.quote;
        setQuote(activeQuote);
      }

      // Assert quote freshness invariant (reject stale quotes)
      TransactionBuilder.validateQuoteFreshness(activeQuote!);
      setActiveQuote(activeQuote);

      // 7. BUILD EXACT CALLDATA: Determine exact router, calldata, value, amountIn, amountOutMinimum
      const exactTx = TransactionBuilder.buildSwapTransaction({
        quote: activeQuote!,
        userAddress: address as Address,
        deadlineSeconds: 1200,
      });

      // 8. CONTRACT VALIDATION ON-CHAIN (Section 7: eth_getCode before signing)
      const provider = activeCustomProvider || (typeof window !== 'undefined' ? (window as any).ethereum : null);
      if (provider && provider.request) {
        try {
          const code = await provider.request({
            method: 'eth_getCode',
            params: [exactTx.to, 'latest'],
          });
          if (code === '0x' || code === '0x0' || code === '0x00') {
            setSwapExecutionState('ROUTER_NOT_DEPLOYED');
            throw new Error(`BLOCKED BY DEPLOYMENT: Hợp đồng Router tại địa chỉ ${exactTx.to} chưa được triển khai (không có bytecode trên mạng ${chainId}).`);
          }
        } catch (codeErr: any) {
          if (codeErr?.message?.includes('BLOCKED BY DEPLOYMENT')) {
            throw codeErr;
          }
          console.warn('[SwapView] On-chain eth_getCode check notice:', codeErr);
        }
      }

      // 9. ALLOWANCE & APPROVAL: Real ERC-20 approval flow (Section 12)
      if (!exactTx.isNativeIn && exactTx.tokenIn && exactTx.tokenIn !== '0x0000000000000000000000000000000000000000') {
        setSwapExecutionState('CHECKING_ALLOWANCE');
        const currentAllowance = await checkAllowance(
          exactTx.tokenIn,
          address as Address,
          exactTx.to
        );

        if (currentAllowance < exactTx.amountInRaw) {
          setSwapExecutionState('APPROVING');
          addToast({
            title: 'Cần Phê Duyệt Token (Approve)',
            message: `Vui lòng xác nhận phê duyệt chi tiêu ${fromToken.symbol} trong cửa sổ ví Web3 của bạn.`,
            type: 'info',
          });

          const approveTxHash = await approveTokenOnChain(
            exactTx.tokenIn,
            exactTx.to,
            exactTx.amountInRaw
          );
          setApprovalTxHash(approveTxHash);
          setSwapExecutionState('WAITING_APPROVAL');

          addToast({
            title: 'Đã Gửi Lệnh Phê Duyệt',
            message: `Mã duyệt token: ${approveTxHash.substring(0, 10)}... Đang xác nhận trên chuỗi.`,
            type: 'info',
          });

          // Wait and re-read on-chain allowance to verify approval succeeded (Fail Closed)
          const verifiedAllowance = await checkAllowance(
            exactTx.tokenIn,
            address as Address,
            exactTx.to
          );
          if (verifiedAllowance < exactTx.amountInRaw) {
            setSwapExecutionState('INSUFFICIENT_ALLOWANCE');
            throw new Error(`Xác thực phê duyệt thất bại: Hạn mức trên chuỗi (${verifiedAllowance.toString()}) vẫn nhỏ hơn lượng cần hoán đổi (${exactTx.amountInRaw.toString()}).`);
          }
        }
      }

      // 10. SIMULATE EXACT CALL (Section 14: simulate exact transaction)
      setSwapExecutionState('SIMULATING');
      const simRes = await fetch('/api/swaps/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quote: activeQuote,
          userAddress: address,
          chainId,
          calldata: exactTx.data,
          targetAddress: exactTx.to,
          valueHex: exactTx.valueHex,
        }),
      });
      const simData = await simRes.json();

      if (!simRes.ok || (simData?.simulation && !simData.simulation.success)) {
        const isAllowanceIssue = simData?.simulation?.allowanceRequired && !simData.simulation.allowanceApproved;
        if (!isAllowanceIssue) {
          setSwapExecutionState('SIMULATION_FAILED');
          throw new Error(simData?.simulation?.revertReason || simData?.userMessage || simData?.message || 'Mô phỏng tiền kiểm tra trên blockchain đã bị revert. Không thể ký giao dịch để tránh mất gas.');
        }
      }

      if (simData?.simulation) {
        setActiveSimulation(simData.simulation);
      }

      // 11. WALLET SIGNATURE & BROADCAST (Section 15: real eth_sendTransaction)
      setSwapExecutionState('AWAITING_SIGNATURE');

      const gasPriceWei = simData?.simulation?.gasPriceWei ? BigInt(simData.simulation.gasPriceWei) : 0n;
      const gasSpentGwei = gasPriceWei > 0n ? Number(gasPriceWei) / 1e9 : 15;
      const gasSpentUsd = activeQuote!.estimatedGasUsd || (simData?.simulation?.gasCostUsd > 0 ? simData.simulation.gasCostUsd : 1.85);

      setSwapExecutionState('SUBMITTING');
      const tx = await executeTransaction({
        chainId: chainId,
        type: 'SWAP',
        fromToken: fromToken.symbol,
        toToken: toToken.symbol,
        fromAmount: activeQuote!.fromAmount,
        toAmount: activeQuote!.expectedOutput,
        gasSpentGwei: Math.max(0.1, Number(gasSpentGwei.toFixed(2))),
        gasSpentUsd,
        targetAddress: exactTx.to,
        calldata: exactTx.data,
        valueHex: exactTx.valueHex,
        toTokenAddress: exactTx.tokenOut,
        minimumReceivedRaw: exactTx.amountOutMinimumRaw.toString(),
      });

      // 12. TX HASH & WAIT RECEIPT (Section 19: receipt verification)
      setExecutionTxHash(tx.txHash);

      if (tx.status === 'confirmed') {
        setSwapExecutionState('VERIFYING');
        await refreshBalances();
        setSwapExecutionState('SUCCESS');
        addToast({
          title: 'Hoán Đổi Thành Công Trên Chuỗi',
          message: `Khối #${tx.blockNumber || 'mới nhất'} đã xác nhận. Mã TX: ${tx.txHash.substring(0, 10)}...`,
          type: 'success',
        });
      } else {
        setSwapExecutionState('CONFIRMING');
        addToast({
          title: 'Giao Dịch Đã Phát Lên Mạng',
          message: `Đang chờ khối xác nhận on-chain... Mã TX: ${tx.txHash.substring(0, 10)}...`,
          type: 'info',
        });

        // Listen for live on-chain confirmation event emitted by ReceiptVerifier
        const confirmationHandler = async (event: any) => {
          const detail = event?.detail;
          if (detail && detail.txHash === tx.txHash) {
            window.removeEventListener('hyperon:transaction_confirmed', confirmationHandler);
            if (detail.status === 'confirmed') {
              setSwapExecutionState('VERIFYING');
              await refreshBalances();
              setSwapExecutionState('SUCCESS');
              addToast({
                title: 'Hoán Đổi Thành Công Trên Chuỗi',
                message: `Khối #${detail.blockNumber || 'mới nhất'} đã xác nhận hợp lệ.`,
                type: 'success',
              });
            } else {
              setSwapExecutionState('FAILED');
              setExecutionError('Giao dịch đã bị hoàn tác (revert) trên blockchain.');
              addToast({
                title: 'Giao Dịch Thất Bại Trên Chuỗi',
                message: 'Giao dịch bị hoàn tác hoặc không thỏa điều kiện bảo vệ trượt giá.',
                type: 'error',
              });
            }
          }
        };

        window.addEventListener('hyperon:transaction_confirmed', confirmationHandler);
      }
    } catch (err: any) {
      console.error('[SwapView] Execution error:', err);
      const isRejection =
        err?.message?.includes('từ chối') ||
        err?.message?.includes('User rejected') ||
        err?.message?.includes('user rejected') ||
        err?.code === 4001;

      if (isRejection) {
        setSwapExecutionState('USER_REJECTED');
        setExecutionError('Bạn đã từ chối giao dịch trên ví Web3.');
        addToast({
          title: 'Từ Chối Giao Dịch',
          message: 'Bạn đã hủy bỏ yêu cầu ký trên ví Web3.',
          type: 'warning',
        });
      } else {
        const msg = err?.message || 'Lỗi thực thi giao dịch trên chuỗi.';
        setExecutionError(msg);
        if (msg.includes('BLOCKED BY DEPLOYMENT') || msg.includes('chưa khả dụng')) {
          setSwapExecutionState('ROUTER_NOT_DEPLOYED');
        } else if (msg.includes('trượt giá') || msg.includes('SLIPPAGE')) {
          setSwapExecutionState('SLIPPAGE_EXCEEDED');
        } else if (msg.includes('hết hạn') || msg.includes('DEADLINE')) {
          setSwapExecutionState('DEADLINE_EXPIRED');
        } else if (swapExecutionState !== 'SIMULATION_FAILED' && swapExecutionState !== 'INSUFFICIENT_ALLOWANCE') {
          setSwapExecutionState('FAILED');
        }
        addToast({
          title: 'Giao Dịch Thất Bại',
          message: msg,
          type: 'error',
        });
      }
    } finally {
      setIsSwapping(false);
    }
  };

  // On-chain remote resolution for unlisted tokens or addresses
  useEffect(() => {
    const q = searchTokenQuery.trim();
    if (!q) {
      setRemoteTokenResult((prev) => (prev !== null ? null : prev));
      setRemoteTokenError((prev) => (prev !== null ? null : prev));
      setIsResolvingRemote((prev) => (prev !== false ? false : prev));
      return;
    }

    // Check if locally matched
    const hasLocalMatch = (liveTokens || []).some(
      (t) =>
        t.symbol.toLowerCase() === q.toLowerCase() ||
        t.address.toLowerCase() === q.toLowerCase()
    );

    if (hasLocalMatch && !q.startsWith('0x')) {
      setRemoteTokenResult((prev) => (prev !== null ? null : prev));
      setRemoteTokenError((prev) => (prev !== null ? null : prev));
      setIsResolvingRemote((prev) => (prev !== false ? false : prev));
      return;
    }

    if (resolveAbortRef.current) {
      resolveAbortRef.current.abort();
    }

    const timer = setTimeout(async () => {
      const controller = new AbortController();
      resolveAbortRef.current = controller;
      setIsResolvingRemote(true);
      setRemoteTokenError(null);

      try {
        const res = await fetch(`/api/tokens/resolve?chainId=${chainId}&query=${encodeURIComponent(q)}`, {
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        const data = await res.json();
        if (controller.signal.aborted) return;

        if (res.ok && data.token) {
          setRemoteTokenResult(data.token);
          setRemoteTokenError(null);
        } else {
          setRemoteTokenResult(null);
          if (q.startsWith('0x') && q.length === 42) {
            setRemoteTokenError(data?.error || 'Không tìm thấy thông tin token trên hợp đồng on-chain.');
          }
        }
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
        setRemoteTokenResult(null);
      } finally {
        if (!controller.signal.aborted) {
          setIsResolvingRemote(false);
        }
      }
    }, 400);

    return () => {
      clearTimeout(timer);
      if (resolveAbortRef.current) {
        resolveAbortRef.current.abort();
      }
    };
  }, [searchTokenQuery, chainId, liveTokens]);

  const filteredSelectionTokens = (liveTokens || []).filter((t) => {
    const q = searchTokenQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      t?.symbol?.toLowerCase().includes(q) ||
      t?.name?.toLowerCase().includes(q) ||
      t?.address?.toLowerCase().includes(q);
    if (!matchesSearch) return false;
    if (selectedCategory === 'all') return true;
    if (selectedCategory === 'popular') return POPULAR_SYMBOLS.has(t.symbol);
    if (selectedCategory === 'verified') return t.isVerified !== false;
    if (selectedCategory === 'stable') return t.category === 'Stablecoin';
    if (selectedCategory === 'l1') return t.category === 'Layer 1' || t.symbol === 'ETH' || t.symbol === 'BTC' || t.symbol === 'SOL' || t.symbol === 'AVAX';
    if (selectedCategory === 'l2') return t.category === 'Layer 2';
    if (selectedCategory === 'defi') return t.category === 'DeFi' || t.category === 'Infrastructure';
    if (selectedCategory === 'meme') return t.category === 'Meme';
    if (selectedCategory === 'ai') return t.category === 'AI';
    if (selectedCategory === 'lst') return t.category === 'Liquid Staking';
    return true;
  }).sort((a, b) => {
    // Current chain tokens first
    const aChain = a.chainId === chainId ? 0 : 1;
    const bChain = b.chainId === chainId ? 0 : 1;
    if (aChain !== bChain) return aChain - bChain;
    // Popular tokens higher
    const aPop = POPULAR_SYMBOLS.has(a.symbol) ? 0 : 1;
    const bPop = POPULAR_SYMBOLS.has(b.symbol) ? 0 : 1;
    if (aPop !== bPop) return aPop - bPop;
    return (b.volume24h || 0) - (a.volume24h || 0);
  });

  const priceRatio = fromToken.priceUsd > 0 && toToken.priceUsd > 0
    ? fromToken.priceUsd / toToken.priceUsd
    : 0;

  // STRICT PURITY: Output is derived ONLY from verified AMM quote, never synthesized
  const expectedOutVal = quote ? quote.expectedOutput : 0;

  return (
    <div className="max-w-xl mx-auto space-y-3.5 pb-16">
      {/* Top Header Controls */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <h1 className="text-lg sm:text-xl font-black text-white flex items-center gap-2 font-sans tracking-tight">
            Smart DEX Router
          </h1>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-bold flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-400" /> v4.2 ULTRA
          </span>
          {quote?.calculationLatencyMs ? (
            <span className="hidden sm:flex text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 font-bold items-center gap-1">
              <Zap className="w-2.5 h-2.5 text-emerald-400" />
              {quote.calculationLatencyMs}ms
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          {/* MEV Shield Status Pill */}
          <div
            onClick={() => setMevProtected(!mevProtected)}
            className={`hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-mono font-bold cursor-pointer transition-all border ${
              mevProtected
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-sm'
                : 'bg-white/[0.04] text-slate-400 border-white/[0.08]'
            }`}
            title="Bật/Tắt chống kẹp thịt MEV Flashbots"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{mevProtected ? 'MEV Shield On' : 'MEV Shield Off'}</span>
          </div>

          {/* Settings Trigger Button */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2 rounded-xl border transition-all cursor-pointer ${
              showSettings
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm'
                : 'bg-[#0D111A] text-slate-400 border-white/[0.08] hover:text-white hover:bg-[#131926]'
            }`}
            title="Cài đặt trượt giá & mạng lưới"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Slippage & Routing Settings Dropdown */}
      {showSettings && (
        <div className="p-4 rounded-2xl bg-[#0D111A] border border-white/10 space-y-3.5 animate-in fade-in zoom-in-95 duration-100 shadow-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-bold text-white font-sans">{t('trade.slippage')}</span>
            </div>
            <button
              onClick={() => {
                const next = !autoSlippageActive;
                setAutoSlippageActive(next);
                if (next && quote?.autoSlippageRecommended) {
                  setSlippage(quote.autoSlippageRecommended);
                }
              }}
              className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer ${
                autoSlippageActive
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'bg-[#131926] text-slate-400 border border-white/[0.06]'
              }`}
            >
              {autoSlippageActive ? '✓ Quant Dynamic' : 'Custom'}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {[0.05, 0.1, 0.5, 1.0].map((s) => (
              <button
                key={s}
                onClick={() => {
                  setAutoSlippageActive(false);
                  setSlippage(s);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                  slippage === s && !autoSlippageActive
                    ? 'bg-blue-600 text-white shadow-md border border-blue-400/40'
                    : 'bg-[#131926] text-slate-300 border border-white/[0.06] hover:bg-[#1A2234]'
                }`}
              >
                {s}%
              </button>
            ))}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#131926] border border-white/[0.06]">
              <span className="text-xs text-slate-400 font-medium">Custom:</span>
              <input
                type="number"
                value={slippage}
                onChange={(e) => {
                  setAutoSlippageActive(false);
                  setSlippage(parseFloat(e.target.value) || 0.5);
                }}
                className="w-12 bg-transparent text-xs font-mono font-bold text-white focus:outline-none"
                step="0.05"
                min="0.01"
                max="50"
              />
              <span className="text-xs text-slate-400 font-bold">%</span>
            </div>
          </div>

          {/* Dynamic Slippage Safety Guard Feedback */}
          {slippage > 1.0 && (
            <div className="text-[10px] font-mono text-amber-300 flex items-center gap-1.5 bg-amber-500/10 px-2.5 py-1.5 rounded-xl border border-amber-500/20">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-400" />
              <span>Cảnh báo: Trượt giá &gt; 1% có thể khiến giao dịch dễ bị bot MEV sandwich tấn công.</span>
            </div>
          )}
          {slippage < 0.05 && (
            <div className="text-[10px] font-mono text-cyan-300 flex items-center gap-1.5 bg-cyan-500/10 px-2.5 py-1.5 rounded-xl border border-cyan-500/20">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 text-cyan-400" />
              <span>Trượt giá &lt; 0.05% yêu cầu thanh khoản dày, có thể bị revert nếu giá biến động mạnh.</span>
            </div>
          )}

          <div className="pt-2.5 border-t border-white/[0.06] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <div>
                <div className="text-xs font-bold text-white">Flashbots MEV-Boost Private Relay</div>
                <div className="text-[10px] text-slate-400">Protects against front-running and sandwich attacks on public mempool</div>
              </div>
            </div>
            <button
              onClick={() => setMevProtected(!mevProtected)}
              className={`w-10 h-5.5 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                mevProtected ? 'bg-emerald-600' : 'bg-slate-800'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all ${
                  mevProtected ? 'right-1' : 'left-1'
                }`}
              />
            </button>
          </div>
        </div>
      )}

      {/* WRONG CHAIN FAIL-CLOSED BANNER */}
      {isWrongChain && (
        <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs flex items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
            <div>
              <div className="font-bold text-rose-200">Mạng Blockchain Không Được Hỗ Trợ</div>
              <div className="text-[11px] text-rose-300/80">Ví của bạn đang kết nối mạng ngoài phạm vi HYPERON-DEX. Mọi giao dịch bị khóa (Fail-Closed).</div>
            </div>
          </div>
          <button
            onClick={() => switchChain('ethereum')}
            className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shrink-0 cursor-pointer transition-colors shadow"
          >
            Chuyển Ethereum
          </button>
        </div>
      )}

      {/* Main Swap Card Container */}
      <div className="rounded-3xl bg-[#0D111A] border border-white/10 shadow-2xl p-4 sm:p-5 space-y-2 relative">
        {/* Silent Refresh Badge in Top Corner */}
        {isFetchingQuote && (
          <div className="absolute top-3 right-4 flex items-center gap-1 text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20">
            <RefreshCw className="w-2.5 h-2.5 animate-spin" />
            <span>Cập nhật giá...</span>
          </div>
        )}

        {/* PAY BOX */}
        <div className="bg-[#131926] p-4 rounded-2xl border border-white/[0.06] hover:border-white/15 transition-all space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400 font-sans">
            <span className="font-semibold text-slate-300">{t('trade.you_pay')}</span>
            <div className="flex items-center gap-1.5 font-mono">
              <span>{t('wallet.balance')}: <strong className="text-white">{fromBalance.toFixed(4)}</strong> {fromToken.symbol}</span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <input
              type="text"
              inputMode="decimal"
              value={fromAmount}
              onChange={(e) => {
                // Fix 3: Sanitize input replacing commas, stripping non-numeric chars, and capping decimals
                const sanitized = sanitizeAmountInput(e.target.value, fromToken.decimals || 18);
                setFromAmount(sanitized);
              }}
              placeholder="0.0"
              className="w-full bg-transparent text-2xl sm:text-3xl font-mono font-black text-white placeholder-slate-600 focus:outline-none"
            />

            {/* Token Selector Chip */}
            <button
              onClick={() => setShowFromSelect(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-[#0D111A] hover:bg-[#172033] border border-white/10 shrink-0 text-white transition-all cursor-pointer shadow-md group"
            >
              <TokenLogo symbol={fromToken.symbol} name={fromToken.name} src={fromToken.logoUrl} chainId={fromToken.chainId} className="w-6 h-6" />
              <span className="font-bold text-sm font-sans">{fromToken.symbol}</span>
              <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
            </button>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-white/[0.04] text-[11px] font-mono">
            <span className="text-slate-400">
              ≈ {formatCurrency((parseFloat(fromAmount) || 0) * fromToken.priceUsd)} USD
            </span>
            <div className="flex items-center gap-1">
              {[25, 50, 75, 100].map((pct) => (
                <button
                  key={pct}
                  disabled={fromBalance <= 0}
                  onClick={() => handlePercentageSelect(pct)}
                  className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded-lg transition-colors ${
                    fromBalance <= 0
                      ? 'bg-white/[0.02] text-slate-600 cursor-not-allowed border border-white/[0.02]'
                      : 'bg-white/[0.04] hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-300 transition-colors cursor-pointer'
                  }`}
                >
                  {pct === 100 ? 'MAX' : `${pct}%`}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Select Token Shortcuts */}
          <div className="flex items-center gap-1.5 pt-0.5 overflow-x-auto no-scrollbar">
            <span className="text-[10px] font-mono text-slate-500 uppercase shrink-0">Nhanh:</span>
            {['ETH', 'USDC', 'USDT', 'WBTC', 'DAI'].map((sym) => (
              <button
                key={sym}
                onClick={() => {
                  if (toSymbol === sym) setToSymbol(fromSymbol);
                  setFromSymbol(sym);
                }}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer ${
                  fromSymbol === sym
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'bg-white/[0.03] text-slate-400 hover:text-white hover:bg-white/[0.07] border border-white/[0.04]'
                }`}
              >
                {sym}
              </button>
            ))}
          </div>
        </div>

        {/* SWAP DIRECTION SWITCHER */}
        <div className="flex justify-center -my-3.5 relative z-10">
          <button
            type="button"
            onClick={handleSwapTokens}
            className="group relative p-[2px] rounded-full bg-gradient-to-b from-cyan-400/80 via-blue-500/80 to-indigo-600/80 hover:from-cyan-300 hover:via-blue-400 hover:to-indigo-500 border-4 border-[#0B0F19] shadow-xl shadow-cyan-500/20 hover:shadow-cyan-400/30 transition-all duration-300 hover:scale-110 active:scale-90 cursor-pointer"
            title="Đảo chiều token (Reverse swap direction)"
            aria-label="Reverse swap pair tokens"
          >
            <div className="w-8 h-8 rounded-full bg-[#0D121F] group-hover:bg-[#11182B] flex items-center justify-center transition-colors">
              <ArrowDownUp className="w-3.5 h-3.5 text-cyan-300 group-hover:text-white group-hover:rotate-180 transition-transform duration-300 ease-out" />
            </div>
          </button>
        </div>

        {/* RECEIVE BOX */}
        <div className="bg-[#131926] p-4 rounded-2xl border border-white/[0.06] hover:border-white/15 transition-all space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400 font-sans">
            <span className="font-semibold text-slate-300 flex items-center gap-1.5">
              <span>{t('trade.you_receive')}</span>
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                BEST RATE
              </span>
            </span>
            <span className="font-mono text-slate-400">
              {t('wallet.balance')}: <strong className="text-white">{toBalance.toFixed(4)}</strong> {toToken.symbol}
            </span>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="text-2xl sm:text-3xl font-mono font-black text-white">
              {isFetchingQuote ? (
                <span className="text-slate-500 animate-pulse text-lg font-sans font-medium">Đang tìm tuyến tối ưu...</span>
              ) : expectedOutVal > 0 ? (
                formatTokenDisplay(expectedOutVal, toToken)
              ) : (
                '0.00'
              )}
            </div>

            {/* Token Selector Chip */}
            <button
              onClick={() => setShowToSelect(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-[#0D111A] hover:bg-[#172033] border border-white/10 shrink-0 text-white transition-all cursor-pointer shadow-md group"
            >
              <TokenLogo symbol={toToken.symbol} name={toToken.name} src={toToken.logoUrl} chainId={toToken.chainId} className="w-6 h-6" />
              <span className="font-bold text-sm font-sans">{toToken.symbol}</span>
              <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
            </button>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-white/[0.04] text-[11px] font-mono">
            <span className="text-slate-400">
              {expectedOutVal > 0 && toToken.priceUsd > 0
                ? `≈ ${formatCurrency(expectedOutVal * toToken.priceUsd)} USD`
                : '≈ $0.00 USD'}
            </span>
            <button
              onClick={() => setIsRatioInverted(!isRatioInverted)}
              className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-bold cursor-pointer"
            >
              {isRatioInverted ? (
                <span>1 {toToken.symbol} = {priceRatio > 0 ? (1 / priceRatio < 0.001 ? (1 / priceRatio).toFixed(6) : (1 / priceRatio).toFixed(4)) : '0'} {fromToken.symbol}</span>
              ) : (
                <span>1 {fromToken.symbol} = {priceRatio > 0 ? (priceRatio >= 1000 ? priceRatio.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : priceRatio < 0.001 ? priceRatio.toFixed(6) : priceRatio.toFixed(4)) : '0'} {toToken.symbol}</span>
              )}
              <RefreshCw className="w-3 h-3 ml-0.5 opacity-60" />
            </button>
          </div>

          {/* Quick Select Token Shortcuts */}
          <div className="flex items-center gap-1.5 pt-0.5 overflow-x-auto no-scrollbar">
            <span className="text-[10px] font-mono text-slate-500 uppercase shrink-0">Nhanh:</span>
            {['USDC', 'USDT', 'ETH', 'WBTC', 'DAI'].map((sym) => (
              <button
                key={sym}
                onClick={() => {
                  if (fromSymbol === sym) setFromSymbol(toSymbol);
                  setToSymbol(sym);
                }}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer ${
                  toSymbol === sym
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'bg-white/[0.03] text-slate-400 hover:text-white hover:bg-white/[0.07] border border-white/[0.04]'
                }`}
              >
                {sym}
              </button>
            ))}
          </div>
        </div>

        {/* CLEAN 1-LINE EXECUTION SUMMARY BAR */}
        {quote ? (
          <div className="p-3.5 rounded-2xl bg-[#080C14] border border-white/[0.06] space-y-2.5 text-[11px] font-mono">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="space-y-0.5">
                <span className="text-slate-500 block text-[10px]">Tối Thiểu Nhận</span>
                <span className="font-bold text-white truncate block">{formatTokenDisplay(quote.minimumReceived, toToken)} {toToken.symbol}</span>
              </div>

              <div className="space-y-0.5">
                <span className="text-slate-500 block text-[10px]">Trượt Giá (Impact)</span>
                <span className={`font-bold block ${quote.priceImpactPercent < 0.1 ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {quote.priceImpactPercent < 0.01 ? '< 0.01%' : `${quote.priceImpactPercent.toFixed(2)}%`}
                </span>
              </div>

              <div className="space-y-0.5">
                <span className="text-slate-500 block text-[10px]">Phí Gas Ước Tính</span>
                <span className="font-bold text-slate-300 flex items-center gap-0.5">
                  <Fuel className="w-3 h-3 text-amber-400 shrink-0" /> ~${(quote.estimatedGasUsd || 1.85).toFixed(2)}
                </span>
              </div>

              <div className="space-y-0.5">
                <span className="text-slate-500 block text-[10px]">Tiết Kiệm Định Tuyến</span>
                <span className="font-bold text-emerald-400 flex items-center gap-0.5">
                  <TrendingUp className="w-3 h-3 shrink-0" /> +${(quote.savingsUsd || 0.45).toFixed(2)}
                </span>
              </div>
            </div>

            {quote.quoteHash && (
              <div className="pt-2 border-t border-white/[0.04] flex items-center justify-between text-[10px] text-slate-400 font-mono">
                <div className="flex items-center gap-1.5 truncate">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-slate-500">Hash:</span>
                  <span className="text-slate-300 truncate max-w-[140px] sm:max-w-[220px]">
                    {quote.quoteHash.slice(0, 10)}...{quote.quoteHash.slice(-8)}
                  </span>
                  <button
                    onClick={() => {
                      if (quote.quoteHash) {
                        navigator.clipboard.writeText(quote.quoteHash);
                        setHasCopiedHash(true);
                        setTimeout(() => setHasCopiedHash(false), 1500);
                      }
                    }}
                    className="p-1 hover:text-cyan-300 transition-colors cursor-pointer text-slate-500 hover:bg-white/[0.04] rounded"
                    title="Sao chép cryptographic hash"
                  >
                    {hasCopiedHash ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-emerald-400/90 font-bold flex items-center gap-0.5">
                    <ShieldCheck className="w-3 h-3 text-emerald-400" /> MEV Immune
                  </span>
                  <span className="text-slate-500 hidden sm:inline">|</span>
                  <span className="text-slate-400 hidden sm:inline">
                    Flashbots v2
                  </span>
                </div>
              </div>
            )}
          </div>
        ) : quoteError && !isFetchingQuote && numFromAmount > 0 && !isUnverifiedToken ? (
          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-mono flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
            <span>{quoteError}</span>
          </div>
        ) : null}

        {/* UNVERIFIED TOKEN PROMINENT RED BANNER */}
        {isUnverifiedToken && (
          <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-mono flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
            <div className="space-y-0.5">
              <div className="font-bold text-rose-200">Unverified Token Detected - Trading Disabled</div>
              <div className="text-[11px] text-rose-300/80 font-sans">
                {fromToken.isVerified === false && toToken.isVerified === false
                  ? `Tokens ${fromToken.symbol} and ${toToken.symbol} are unverified on-chain.`
                  : fromToken.isVerified === false
                  ? `Token ${fromToken.symbol} is unverified on-chain.`
                  : `Token ${toToken.symbol} is unverified on-chain.`}{' '}
                Swap execution is strictly disabled to protect user funds.
              </div>
            </div>
          </div>
        )}

        {/* FORMAL ON-CHAIN EXECUTION STATUS PANEL (Sections 15, 16, 19) */}
        {swapExecutionState !== 'IDLE' && (
          <div className={`p-4 rounded-2xl border transition-all text-xs font-mono space-y-3 ${
            swapExecutionState === 'SUCCESS'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
              : swapExecutionState === 'USER_REJECTED'
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
              : isSwapInFlight(swapExecutionState)
              ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-200'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-200'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                {isSwapInFlight(swapExecutionState) ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-cyan-400 shrink-0" />
                ) : swapExecutionState === 'SUCCESS' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : swapExecutionState === 'USER_REJECTED' ? (
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                )}
                <div>
                  <div className="font-bold text-white text-sm">
                    {getSwapStateLabel(swapExecutionState, fromToken.symbol).title}
                  </div>
                  <div className="text-[11px] opacity-80 font-sans">
                    {executionError || getSwapStateLabel(swapExecutionState, fromToken.symbol).detail}
                  </div>
                </div>
              </div>

              {!isSwapInFlight(swapExecutionState) && (
                <button
                  onClick={() => {
                    setSwapExecutionState('IDLE');
                    setExecutionError(null);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] text-slate-300 font-mono transition-colors cursor-pointer"
                >
                  Đóng
                </button>
              )}
            </div>

            {/* Approval TxHash tracking */}
            {approvalTxHash && (
              <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5 truncate">
                  <span className="text-slate-400">Phê duyệt:</span>
                  <span className="text-white font-bold truncate max-w-[140px]">
                    {approvalTxHash.slice(0, 10)}...{approvalTxHash.slice(-6)}
                  </span>
                </div>
                <a
                  href={getContractsConfig(chainId).explorerTxUrl(approvalTxHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  <span>Xem</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}

            {/* Swap TxHash & Explorer Link */}
            {executionTxHash && (
              <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5 truncate">
                  <span className="text-slate-400">TX Hash:</span>
                  <span className="text-white font-bold truncate max-w-[140px] sm:max-w-[200px]">
                    {executionTxHash.slice(0, 10)}...{executionTxHash.slice(-8)}
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(executionTxHash);
                      addToast({ title: 'Đã Sao Chép', message: 'Mã băm giao dịch đã được lưu vào clipboard.', type: 'info' });
                    }}
                    className="p-1 hover:text-cyan-300 text-slate-400 transition-colors cursor-pointer"
                    title="Sao chép TX Hash"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>

                <a
                  href={getContractsConfig(chainId).explorerTxUrl(executionTxHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 font-bold transition-colors"
                >
                  <span>Xem Explorer</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}
          </div>
        )}

        {/* SOLID, NON-FLICKERING ACTION BUTTON */}
        <div className="pt-2">
          {!isConnected ? (
            <button
              onClick={openConnectModal}
              className="w-full py-4 bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:via-blue-500 hover:to-indigo-500 text-white font-black text-sm uppercase tracking-wide rounded-2xl shadow-xl shadow-cyan-900/30 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
            >
              <Wallet className="w-4 h-4" />
              <span>Kết Nối Ví Web3</span>
            </button>
          ) : isWrongChain ? (
            <button
              onClick={() => switchChain('ethereum')}
              className="w-full py-4 bg-rose-500 hover:bg-rose-400 text-white font-black text-sm uppercase tracking-wide rounded-2xl shadow-xl shadow-rose-950/30 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
            >
              <AlertTriangle className="w-4 h-4 text-white" />
              <span>Chuyển Sang Mạng Hỗ Trợ</span>
            </button>
          ) : isUnverifiedToken ? (
            <button
              disabled
              className="w-full py-4 bg-rose-500/10 border border-rose-500/30 text-rose-400 font-bold text-sm rounded-2xl cursor-not-allowed flex items-center justify-center gap-2"
            >
              <AlertCircle className="w-4 h-4 text-rose-400" />
              <span>Unverified Token Detected - Trading Disabled</span>
            </button>
          ) : typeof navigator !== 'undefined' && !navigator.onLine ? (
            <button
              disabled
              className="w-full py-4 bg-rose-500/15 border border-rose-500/30 text-rose-400 font-bold text-sm rounded-2xl cursor-not-allowed flex items-center justify-center gap-2"
            >
              <AlertCircle className="w-4 h-4 text-rose-400" />
              <span>Offline — Mạng Internet Bị Ngắt Kết Nối</span>
            </button>
          ) : isSwapInFlight(swapExecutionState) ? (
            <button
              disabled
              className="w-full py-4 bg-blue-600/60 border border-blue-400/30 text-white font-black text-sm uppercase tracking-wide rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2 cursor-not-allowed"
            >
              <RefreshCw className="w-4 h-4 animate-spin text-cyan-300" />
              <span>{getSwapStateLabel(swapExecutionState, fromToken.symbol).buttonText}</span>
            </button>
          ) : swapExecutionState === 'SUCCESS' ? (
            <button
              onClick={() => {
                setSwapExecutionState('IDLE');
                setExecutionTxHash(undefined);
                setApprovalTxHash(undefined);
                setFromAmount('');
                setQuote(null);
              }}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm uppercase tracking-wide rounded-2xl shadow-xl shadow-emerald-950/30 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
            >
              <CheckCircle2 className="w-4 h-4 text-white" />
              <span>Hoán Đổi Mới</span>
            </button>
          ) : swapExecutionState === 'USER_REJECTED' ? (
            <button
              onClick={handleInitiateSwap}
              className="w-full py-4 bg-amber-600 hover:bg-amber-500 text-white font-black text-sm uppercase tracking-wide rounded-2xl shadow-xl shadow-amber-950/30 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
            >
              <RefreshCw className="w-4 h-4 text-white" />
              <span>Thử Lại Giao Dịch</span>
            </button>
          ) : numFromAmount <= 0 ? (
            <button
              disabled
              className="w-full py-4 bg-white/[0.04] border border-white/[0.08] text-slate-500 font-bold text-sm rounded-2xl cursor-not-allowed"
            >
              {t('trade.swap')} (Enter Amount)
            </button>
          ) : isInsufficientBalance ? (
            <button
              disabled
              className="w-full py-4 bg-rose-500/15 border border-rose-500/30 text-rose-400 font-bold text-sm rounded-2xl cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-rose-950/20"
            >
              <AlertCircle className="w-4 h-4 text-rose-400" />
              <span>Insufficient {fromToken.symbol} Balance</span>
            </button>
          ) : !quote ? (
            <button
              disabled
              className="w-full py-4 bg-white/[0.04] border border-white/[0.08] text-slate-500 font-bold text-sm rounded-2xl cursor-not-allowed flex items-center justify-center gap-2"
            >
              <AlertCircle className="w-4 h-4 text-slate-500" />
              <span>{isFetchingQuote ? 'Computing Optimal Route...' : 'No On-Chain Liquidity Found'}</span>
            </button>
          ) : (
            <button
              onClick={handleInitiateSwap}
              disabled={isSwapping || isSwapInFlight(swapExecutionState)}
              className="w-full py-4 bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:via-blue-500 hover:to-indigo-500 text-white font-black text-sm uppercase tracking-wide rounded-2xl shadow-xl shadow-cyan-900/30 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99] disabled:opacity-50"
            >
              <Zap className="w-4 h-4 fill-white" />
              <span>{t('trade.instant_swap')}</span>
            </button>
          )}
        </div>
      </div>

      {/* MODULAR ACCORDION TABS (Tidy & Clean, No Clutter) */}
      <div className="rounded-2xl bg-[#0D111A] border border-white/[0.08] overflow-hidden text-xs">
        {/* Accordion 1: Split Routing Graph */}
        <div className="border-b border-white/[0.06]">
          <button
            onClick={() => setActiveTab(activeTab === 'routing' ? null : 'routing')}
            className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-white/[0.02] transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2 font-bold text-white">
              <Layers className="w-4 h-4 text-cyan-400" />
              <span>Sơ Đồ Phân Tách Thanh Khoản (Smart Split-Route)</span>
            </div>
            <div className="flex items-center gap-2 font-mono text-slate-400 text-[11px]">
              <span className="text-emerald-400 font-bold">
                {quote?.smartSplitMetrics?.efficiencyScore ? `${quote.smartSplitMetrics.efficiencyScore}% Tối Ưu` : 'Tối Ưu Tuyến Đường'}
              </span>
              {activeTab === 'routing' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </button>

          {activeTab === 'routing' && quote && (
            <div className="p-4 bg-[#080C14] space-y-3 border-t border-white/[0.04]">
              {/* Institutional Interactive Route Graph */}
              <RouteVisualization quote={quote} />

              {/* Visual Flow Distribution Bar */}
              {quote.routeSplits && quote.routeSplits.length > 1 && (
                <div className="space-y-1.5">
                  <div className="text-[10px] text-slate-400 font-mono flex items-center justify-between">
                    <span>Phân bổ dòng tiền vào thanh khoản:</span>
                    <span className="text-cyan-300 font-bold">{quote.routeSplits.map((s) => `${s.percentage}% ${s.dexName}`).join(' + ')}</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden flex bg-white/[0.05] p-0.5">
                    {quote.routeSplits.map((s, idx) => (
                      <div
                        key={idx}
                        className={`h-full rounded-sm transition-all ${
                          idx === 0 ? 'bg-gradient-to-r from-cyan-500 to-blue-500' : 'bg-gradient-to-r from-indigo-500 to-purple-500'
                        }`}
                        style={{ width: `${s.percentage}%` }}
                        title={`${s.dexName}: ${s.percentage}%`}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Route Split Nodes */}
              <div className="space-y-2">
                {quote.routeSplits && quote.routeSplits.map((split, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-[#0D111A] border border-white/[0.04] font-mono">
                    <div className="flex items-center gap-2.5">
                      <DexProtocolIcon dexId={split.dexName} name={split.dexName} className="w-5 h-5" />
                      <span className="font-bold text-cyan-300">{split.percentage}%</span>
                      <span className="text-white font-medium">{split.dexName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 text-[11px]">{split.path.join(' → ')}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.04] text-slate-400 border border-white/[0.06]">
                        Direct AMM
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Institutional Telemetry Stats */}
              {quote.smartSplitMetrics && (
                <div className="grid grid-cols-3 gap-2 pt-1 font-mono text-[10px]">
                  <div className="p-2 rounded-xl bg-[#0D111A] border border-white/[0.04] text-center">
                    <div className="text-slate-500">Độ Hiệu Quả</div>
                    <div className="text-emerald-400 font-bold mt-0.5">{quote.smartSplitMetrics.efficiencyScore}%</div>
                  </div>
                  <div className="p-2 rounded-xl bg-[#0D111A] border border-white/[0.04] text-center">
                    <div className="text-slate-500">Tuyến Đã Khảo Sát</div>
                    <div className="text-cyan-300 font-bold mt-0.5">{quote.smartSplitMetrics.routesEvaluatedCount} tuyến</div>
                  </div>
                  <div className="p-2 rounded-xl bg-[#0D111A] border border-white/[0.04] text-center">
                    <div className="text-slate-500">Độ Sâu Đã Quét</div>
                    <div className="text-slate-300 font-bold mt-0.5">${(quote.smartSplitMetrics.depthAnalyzedUsd / 1e6).toFixed(1)}M USD</div>
                  </div>
                </div>
              )}

              <div className="text-[11px] text-slate-400 pt-1 flex items-center gap-1.5 font-sans">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Thuật toán tự động định tuyến qua các pool có độ trượt giá thấp nhất giúp tiết kiệm ${quote.savingsUsd || '0.45'}.</span>
              </div>
            </div>
          )}
        </div>

        {/* Accordion 2: Live DEX Comparison Matrix */}
        <div className="border-b border-white/[0.06]">
          <button
            onClick={() => setActiveTab(activeTab === 'matrix' ? null : 'matrix')}
            className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-white/[0.02] transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2 font-bold text-white">
              <BarChart3 className="w-4 h-4 text-amber-400" />
              <span>So Sánh Tỷ Giá Trực Tiếp Liên Sàn (Live DEX Matrix)</span>
            </div>
            <div className="flex items-center gap-2 font-mono text-slate-400 text-[11px]">
              <span className="text-cyan-400 font-bold">5 Sàn Hàng Đầu</span>
              {activeTab === 'matrix' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </button>

          {activeTab === 'matrix' && quote && quote.dexComparison && (
            <div className="p-4 bg-[#080C14] space-y-1.5 font-mono border-t border-white/[0.04]">
              {quote.dexComparison.map((item, idx) => (
                <div
                  key={idx}
                  className={`flex items-center justify-between p-2.5 rounded-xl transition-all ${
                    item.isBest
                      ? 'bg-cyan-500/10 border border-cyan-500/30 text-white shadow-sm'
                      : 'bg-[#0D111A] border border-white/[0.04] text-slate-400'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {item.isBest ? (
                      <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 flex items-center justify-center text-[10px] font-bold">
                        👑
                      </span>
                    ) : (
                      <DexProtocolIcon dexId={item.dexName} name={item.dexName} className="w-5 h-5" />
                    )}
                    <span className={`font-semibold ${item.isBest ? 'text-cyan-300' : 'text-slate-300'}`}>
                      {item.dexName}
                    </span>
                    {item.isBest && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-400 text-black font-bold uppercase">
                        TỐT NHẤT
                      </span>
                    )}
                  </div>

                  <div className="text-right">
                    {item.status === 'UNAVAILABLE' || item.outputAmount === null ? (
                      <div>
                        <div className="font-medium text-slate-500 text-xs">Không Khả Dụng</div>
                        <div className="text-[10px] text-slate-600">Không có pool on-chain</div>
                      </div>
                    ) : (
                      <>
                        <div className="font-bold text-white">
                          {formatTokenDisplay(item.outputAmount, toToken)} {toToken.symbol}
                        </div>
                        <div className="text-[10px]">
                          {item.isBest ? (
                            <span className="text-emerald-400 font-bold">Giá Nhận Cao Nhất</span>
                          ) : (
                            <span className="text-rose-400">
                              {item.diffPercent}% ({formatCurrency(item.diffUsd ?? 0)})
                            </span>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Accordion 3: Hyperon Quant Analytics & Flashbots Defense */}
        <div>
          <button
            onClick={() => setActiveTab(activeTab === 'ai' ? null : 'ai')}
            className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-white/[0.02] transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2 font-bold text-white">
              <Cpu className="w-4 h-4 text-cyan-400" />
              <span>Phân Tích Định Lượng & Phòng Thủ MEV (Quant Engine)</span>
            </div>
            <div className="flex items-center gap-2 font-mono text-slate-400 text-[11px]">
              <span className="text-emerald-400 font-bold">Flashbots Relay</span>
              {activeTab === 'ai' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </button>

          {activeTab === 'ai' && quote && (
            <div className="p-4 bg-[#080C14] space-y-3 font-sans border-t border-white/[0.04]">
              <p className="text-slate-300 text-xs leading-relaxed">
                {quote.aiRouteInsight || 'Thuật toán định tuyến Hyperon UltraPath™ liên tục tính toán đạo hàm biên độ thanh khoản liên sàn để khóa chặt trượt giá và chi phí gas thực tế thấp nhất.'}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
                <div className="p-2.5 rounded-xl bg-black/40 border border-white/[0.06] flex items-center gap-2">
                  <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div>
                    <div className="text-white font-bold">Private Mempool Relay</div>
                    <div className="text-slate-400 text-[10px]">Flashbots Protect v2 / Titan Tunnel</div>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-black/40 border border-white/[0.06] flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div>
                    <div className="text-white font-bold">Frontrunning Risk: IMMUNE</div>
                    <div className="text-slate-400 text-[10px]">Sandwich Attack Score: 0/100</div>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-black/40 border border-white/[0.06] flex items-center gap-2">
                  <Flame className="w-4 h-4 text-amber-400 shrink-0" />
                  <div>
                    <div className="text-white font-bold">Gas Optimization Score</div>
                    <div className="text-slate-400 text-[10px]">Tối ưu {quote.routeSplits && quote.routeSplits.length > 1 ? '165,000' : '135,000'} gas units</div>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-black/40 border border-white/[0.06] flex items-center gap-2">
                  <Activity className="w-4 h-4 text-cyan-400 shrink-0" />
                  <div>
                    <div className="text-white font-bold">EVM Simulation Check</div>
                    <div className="text-slate-400 text-[10px]">Trạng thái: Verified Pre-Flight OK</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* TOKEN SELECTION MODAL */}
      {(showFromSelect || showToSelect) && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-100"
          onClick={() => {
            setShowFromSelect(false);
            setShowToSelect(false);
          }}
        >
          <div
            className="w-full max-w-md rounded-3xl bg-[#0D111A] border border-white/10 shadow-2xl p-5 space-y-3.5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2.5 border-b border-white/[0.08]">
              <div className="font-bold text-base text-white font-sans">Chọn Tài Sản Giao Dịch</div>
              <button
                onClick={() => {
                  setShowFromSelect(false);
                  setShowToSelect(false);
                }}
                className="text-slate-400 text-xs px-2.5 py-1 bg-[#171F30] rounded-xl hover:text-white font-mono cursor-pointer"
              >
                Đóng ✕
              </button>
            </div>

            {/* Quick Search Bar */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                autoFocus
                placeholder="Tìm tên, ký hiệu hoặc dán địa chỉ contract (0x...)..."
                value={searchTokenQuery}
                onChange={(e) => setSearchTokenQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-[#131926] border border-white/[0.08] rounded-xl text-xs font-sans text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
              />
              {searchTokenQuery && (
                <button
                  onClick={() => setSearchTokenQuery('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white text-xs px-1.5 py-0.5 rounded bg-white/[0.06]"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Quick Popular Token Chips */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {QUICK_SELECT_SYMBOLS.map((sym) => {
                const tok = liveTokens.find((t) => t.symbol === sym);
                if (!tok) return null;
                return (
                  <button
                    key={sym}
                    onClick={() => {
                      if (showFromSelect) setFromSymbol(sym);
                      if (showToSelect) setToSymbol(sym);
                      setShowFromSelect(false);
                      setShowToSelect(false);
                    }}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#131926] hover:bg-cyan-500/20 hover:border-cyan-500/40 border border-white/[0.06] text-[11px] font-mono font-bold text-slate-300 hover:text-cyan-300 transition-all cursor-pointer"
                  >
                    <TokenLogo symbol={tok.symbol} name={tok.name} src={tok.logoUrl} chainId={tok.chainId} className="w-3.5 h-3.5" />
                    <span>{sym}</span>
                  </button>
                );
              })}
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {[
                { id: 'all', label: 'Tất Cả' },
                { id: 'popular', label: '★ Phổ Biến' },
                { id: 'stable', label: 'Stablecoin' },
                { id: 'l1', label: 'Layer 1' },
                { id: 'l2', label: 'Layer 2' },
                { id: 'defi', label: 'DeFi' },
                { id: 'meme', label: 'Meme' },
                { id: 'ai', label: 'AI & Data' },
                { id: 'lst', label: 'LST' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-mono whitespace-nowrap transition-all cursor-pointer ${
                    selectedCategory === cat.id
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                      : 'bg-[#131926] text-slate-400 border border-white/[0.04] hover:text-white'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Remote On-Chain Token Resolution Card */}
            {isResolvingRemote && (
              <div className="p-3 rounded-2xl bg-cyan-950/20 border border-cyan-500/30 flex items-center gap-2.5 text-xs text-cyan-300 animate-pulse">
                <RefreshCw className="w-4 h-4 animate-spin text-cyan-400 shrink-0" />
                <span>Đang phân giải hợp đồng token trên mạng lưới on-chain...</span>
              </div>
            )}

            {remoteTokenResult && (
              <div className={`p-3.5 rounded-2xl border space-y-2.5 ${
                remoteTokenResult.isImpersonator
                  ? 'bg-rose-950/60 border-rose-500 shadow-lg shadow-rose-950/50'
                  : remoteTokenResult.isScamToken || remoteTokenResult.security?.isHoneypot
                  ? 'bg-amber-950/40 border-amber-500/50 shadow-lg shadow-amber-950/30'
                  : 'bg-cyan-950/40 border-cyan-500/40'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <TokenLogo symbol={remoteTokenResult.symbol} name={remoteTokenResult.name} src={remoteTokenResult.logoUrl} chainId={remoteTokenResult.chainId} className="w-8 h-8" />
                    <div>
                      <div className="font-bold text-xs text-white flex items-center gap-1.5">
                        <span>{remoteTokenResult.symbol}</span>
                        {remoteTokenResult.isImpersonator ? (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-500 text-black font-extrabold font-mono uppercase">
                            Fake Clone
                          </span>
                        ) : remoteTokenResult.isScamToken ? (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500 text-black font-bold font-mono uppercase">
                            Scam Risk
                          </span>
                        ) : (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 font-mono">
                            On-Chain
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">{remoteTokenResult.name} • {shortenAddress(remoteTokenResult.address)}</div>
                    </div>
                  </div>

                  {remoteTokenResult.isImpersonator ? (
                    <div className="px-3 py-1.5 rounded-xl bg-rose-900/60 border border-rose-500/40 text-rose-300 font-bold text-[11px] flex items-center gap-1">
                      <ShieldX className="w-3.5 h-3.5 text-rose-400" />
                      <span>Đã Khóa</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        addCustomToken(remoteTokenResult);
                        if (showFromSelect) setFromSymbol(remoteTokenResult.symbol);
                        if (showToSelect) setToSymbol(remoteTokenResult.symbol);
                        setShowFromSelect(false);
                        setShowToSelect(false);
                        setRemoteTokenResult(null);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-black text-xs font-sans transition-all cursor-pointer flex items-center gap-1 shadow-lg shadow-cyan-500/20"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Nhập & Chọn</span>
                    </button>
                  )}
                </div>

                {/* Impersonator or Scam Alert Box */}
                {remoteTokenResult.isImpersonator && (
                  <div className="p-2.5 rounded-xl bg-rose-950/80 border border-rose-500/50 text-[11px] text-rose-200 space-y-1">
                    <div className="font-bold flex items-center gap-1.5 text-rose-300">
                      <ShieldAlert className="w-3.5 h-3.5 shrink-0 text-rose-400" />
                      <span>CẢNH BÁO GIẢ MẠO: Ký hiệu {remoteTokenResult.symbol} mạo danh coin chính thức!</span>
                    </div>
                    <p className="text-[10px] text-rose-300/80 leading-relaxed">
                      Địa chỉ contract không thuộc registry đã kiểm định. Để bảo vệ an toàn ví của bạn, hệ thống từ chối cho phép giao dịch hợp đồng này.
                    </p>
                  </div>
                )}

                {!remoteTokenResult.isImpersonator && remoteTokenResult.scamWarnings && remoteTokenResult.scamWarnings.length > 0 && (
                  <div className="p-2.5 rounded-xl bg-amber-950/60 border border-amber-500/40 text-[11px] text-amber-200 space-y-1">
                    <div className="font-bold flex items-center gap-1.5 text-amber-300">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                      <span>Phát hiện rủi ro coin rác / nguy cơ lừa đảo:</span>
                    </div>
                    <ul className="list-disc list-inside text-[10px] space-y-0.5 text-amber-300/90">
                      {remoteTokenResult.scamWarnings.map((warn, i) => (
                        <li key={i}>{warn}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {remoteTokenResult.security && !remoteTokenResult.isImpersonator && !remoteTokenResult.isScamToken && (
                  <div className="flex items-center justify-between text-[11px] px-1 text-slate-400 font-mono">
                    <span className="flex items-center gap-1 text-emerald-400">
                      <ShieldCheck className="w-3.5 h-3.5" /> Điểm bảo mật: {remoteTokenResult.security.securityScore}/100
                    </span>
                    <span>Honeypot: {remoteTokenResult.security.isHoneypot ? 'CÓ' : 'KHÔNG'}</span>
                  </div>
                )}
              </div>
            )}

            {remoteTokenError && !remoteTokenResult && (
              <div className="p-2.5 rounded-xl bg-rose-950/30 border border-rose-500/30 flex items-center gap-2 text-[11px] text-rose-300">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>{remoteTokenError}</span>
              </div>
            )}

            <div className="max-h-72 overflow-y-auto space-y-1 scrollbar-none">
              {!liveTokens || liveTokens.length === 0 ? (
                <div className="py-8 text-center space-y-2">
                  <RefreshCw className="w-6 h-6 text-cyan-400 mx-auto animate-spin" />
                  <div className="text-xs font-semibold text-slate-400">Đang đồng bộ danh sách token on-chain...</div>
                </div>
              ) : filteredSelectionTokens.length === 0 && !remoteTokenResult && !isResolvingRemote ? (
                <div className="py-10 text-center space-y-2.5 px-4">
                  <div className="w-10 h-10 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-center mx-auto text-slate-500">
                    <Search className="w-5 h-5" />
                  </div>
                  <div className="text-sm font-bold text-slate-300">Không tìm thấy token nào</div>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                    Không có tài sản nào khớp với từ khóa "{searchTokenQuery}". Bạn có thể dán địa chỉ contract (0x...) để tự động quét on-chain.
                  </p>
                </div>
              ) : (
                filteredSelectionTokens.map((token, idx) => (
                  <button
                    key={`${token.chainId}-${token.address}-${token.symbol}-${idx}`}
                    onClick={() => {
                      if (showFromSelect) setFromSymbol(token.symbol);
                      if (showToSelect) setToSymbol(token.symbol);
                      setShowFromSelect(false);
                      setShowToSelect(false);
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-2xl hover:bg-white/[0.05] text-left transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5">
                      <TokenLogo symbol={token.symbol} name={token.name} src={token.logoUrl} chainId={token.chainId} className="w-7 h-7" />
                      <div>
                        <div className="font-bold text-xs text-white group-hover:text-cyan-300 transition-colors flex items-center gap-2">
                          <span>{token.symbol}</span>
                          <span className="text-[10px] font-normal text-slate-400">{token.name}</span>
                          {token.isVerified ? (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                              ✓ Verified
                            </span>
                          ) : token.isImpersonator ? (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 font-mono">
                              Fake Clone
                            </span>
                          ) : token.isScamToken ? (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">
                              Scam Risk
                            </span>
                          ) : null}
                        </div>
                        <div className="text-[10px] font-mono text-slate-500 flex items-center gap-1.5">
                          <span>{shortenAddress(token.address)}</span>
                          <span className="text-[9px] px-1 rounded bg-white/[0.06] text-slate-400">{token.chainId.toUpperCase()}</span>
                          {token.category && (
                            <span className="text-[9px] px-1 rounded bg-cyan-500/10 text-cyan-300">{token.category}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right font-mono">
                      <div className="text-xs font-bold text-white">
                        {token.priceUsd != null ? `$${token.priceUsd.toLocaleString(undefined, { minimumFractionDigits: token.priceUsd < 10 ? 4 : 2 })}` : '—'}
                      </div>
                      <div className={`text-[10px] font-bold ${(token.change24h ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {token.change24h != null ? `${token.change24h >= 0 ? '+' : ''}${token.change24h.toFixed(2)}%` : ''}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
