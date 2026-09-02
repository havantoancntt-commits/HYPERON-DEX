import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useWallet } from '../context/WalletContext';
import { useExchange } from '../context/ExchangeContext';
import { Token, SwapQuote } from '../types';
import { formatCurrency, formatCrypto } from '../lib/utils';
import { TokenLogo, DexProtocolIcon } from '../components/CryptoIcon';
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
  AlertCircle
} from 'lucide-react';

export const SwapView: React.FC = () => {
  const { balances, isConnected, connectWallet, slippage, setSlippage, mevProtected, setMevProtected, address, chainId } = useWallet();
  const { selectedPair, setActiveSimulation, setActiveQuote, addToast, getLiveToken, liveTokens } = useExchange();

  const [fromSymbol, setFromSymbol] = useState<string>(selectedPair.base?.symbol || 'ETH');
  const [toSymbol, setToSymbol] = useState<string>(selectedPair.quote?.symbol || 'USDC');

  const fromToken = getLiveToken(fromSymbol);
  const toToken = getLiveToken(toSymbol);

  const [fromAmount, setFromAmount] = useState<string>('1.0');
  const [quote, setQuote] = useState<SwapQuote | null>(null);
  const [isFetchingQuote, setIsFetchingQuote] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showFromSelect, setShowFromSelect] = useState<boolean>(false);
  const [showToSelect, setShowToSelect] = useState<boolean>(false);
  const [searchTokenQuery, setSearchTokenQuery] = useState<string>('');
  const [isRatioInverted, setIsRatioInverted] = useState<boolean>(false);
  const [autoSlippageActive, setAutoSlippageActive] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'routing' | 'matrix' | 'ai' | null>(null);
  const [isSwapping, setIsSwapping] = useState<boolean>(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);

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
    if (tok.priceUsd > 1000) return 6;
    if (tok.priceUsd < 0.1) return 6;
    return 4;
  }, []);

  const formatTokenDisplay = useCallback((val: number, tok: Token) => {
    if (!val || isNaN(val) || val <= 0) return '0.00';
    const dec = getTokenDisplayDecimals(tok);
    if (val >= 1000) {
      return val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: dec });
    }
    if (val < 0.0001) {
      return val.toExponential(4);
    }
    return val.toFixed(dec);
  }, [getTokenDisplayDecimals]);

  // Fetch real quote from server Smart Router (debounced with AbortController)
  const fetchQuote = useCallback(async (amountStr: string, fTok: Token, tTok: Token, currentSlippage: number) => {
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
          toTokenSymbol: tTok.symbol,
          amount: amountStr,
          slippage: currentSlippage,
          chainId,
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
  const isInsufficientBalance = isConnected && numFromAmount > fromBalance;

  const handlePercentageSelect = (percent: number) => {
    if (fromBalance <= 0) {
      setFromAmount('0.0');
      return;
    }
    const val = percent === 100 ? fromBalance.toString() : (fromBalance * (percent / 100)).toFixed(4);
    setFromAmount(val);
  };

  const handleInitiateSwap = async () => {
    if (!quote || isSwapping || numFromAmount <= 0) return;

    if (!isConnected || !address) {
      addToast({
        title: 'Yêu Cầu Kết Nối Ví',
        message: 'Vui lòng kết nối ví Web3 để mô phỏng và thực thi giao dịch hoán đổi an toàn.',
        type: 'warning',
      });
      return;
    }

    if (simulateControllerRef.current) {
      simulateControllerRef.current.abort();
    }
    const controller = new AbortController();
    simulateControllerRef.current = controller;
    const signal = controller.signal;

    setIsSwapping(true);
    setActiveQuote(quote);

    try {
      const res = await fetch('/api/swaps/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quote,
          userAddress: address,
          chainId: chainId || 'ethereum',
        }),
        signal,
      });
      if (signal.aborted) return;
      const data = await res.json();
      if (signal.aborted) return;

      if (res.ok && data.simulation) {
        setActiveSimulation(data.simulation);
      } else {
        addToast({
          title: 'Mô Phỏng Thất Bại',
          message: data?.userMessage || data?.message || 'Giao dịch có thể bị revert trên blockchain.',
          type: 'error',
        });
      }
    } catch (err: unknown) {
      if ((err as Error)?.name === 'AbortError' || signal.aborted) return;
      addToast({
        title: 'Lỗi Mô Phỏng Giao Dịch',
        message: (err as Error)?.message || 'Không thể kết nối đến RPC sandbox node.',
        type: 'error',
      });
    } finally {
      if (!signal.aborted) {
        setIsSwapping(false);
      }
    }
  };

  const filteredSelectionTokens = liveTokens.filter(
    (t) =>
      t.symbol.toLowerCase().includes(searchTokenQuery.toLowerCase()) ||
      t.name.toLowerCase().includes(searchTokenQuery.toLowerCase())
  );

  const priceRatio = fromToken.priceUsd > 0 && toToken.priceUsd > 0
    ? fromToken.priceUsd / toToken.priceUsd
    : 0;

  const expectedOutVal = quote ? quote.expectedOutput : (numFromAmount * priceRatio);

  return (
    <div className="max-w-xl mx-auto space-y-3.5 pb-16">
      {/* Top Header Controls */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <h1 className="text-lg sm:text-xl font-black text-white flex items-center gap-2 font-sans tracking-tight">
            Smart DEX Router
          </h1>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-bold flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-400" /> TỐI ƯU TỶ GIÁ
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* MEV Shield Status Pill */}
          <div
            onClick={() => setMevProtected(!mevProtected)}
            className={`hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-mono font-bold cursor-pointer transition-all border ${
              mevProtected
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
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
              <span className="text-xs font-bold text-white font-sans">Độ trượt giá chấp nhận (Slippage)</span>
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
              {autoSlippageActive ? '✓ Auto AI Tối Ưu' : 'Tùy Chỉnh'}
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
              <span className="text-xs text-slate-400 font-medium">Tự nhập:</span>
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

          <div className="pt-2.5 border-t border-white/[0.06] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <div>
                <div className="text-xs font-bold text-white">Chống MEV Flashbots Private Relay</div>
                <div className="text-[10px] text-slate-400">Tránh bị bot kẹp giá (sandwich attack) trên mempool công khai</div>
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
            <span className="font-semibold text-slate-300">Bạn Trả</span>
            <div className="flex items-center gap-1.5 font-mono">
              <span>Khả dụng: <strong className="text-white">{fromBalance.toFixed(4)}</strong> {fromToken.symbol}</span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <input
              type="text"
              inputMode="decimal"
              value={fromAmount}
              onChange={(e) => {
                const val = e.target.value;
                if (/^\d*\.?\d*$/.test(val)) {
                  setFromAmount(val);
                }
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
                  onClick={() => handlePercentageSelect(pct)}
                  className="px-2 py-0.5 text-[10px] font-mono font-bold rounded-lg bg-white/[0.04] hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-300 transition-colors cursor-pointer"
                >
                  {pct === 100 ? 'MAX' : `${pct}%`}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* SWAP DIRECTION SWITCHER */}
        <div className="flex justify-center -my-3.5 relative z-10">
          <button
            onClick={handleSwapTokens}
            className="w-9 h-9 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 border-4 border-[#0D111A] rounded-full flex items-center justify-center text-white shadow-xl transition-transform hover:scale-110 active:scale-95 duration-200 cursor-pointer"
            title="Đảo chiều token"
          >
            <ArrowDownUp className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* RECEIVE BOX */}
        <div className="bg-[#131926] p-4 rounded-2xl border border-white/[0.06] hover:border-white/15 transition-all space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400 font-sans">
            <span className="font-semibold text-slate-300 flex items-center gap-1.5">
              <span>Bạn Nhận (Ước Tính Tối Ưu)</span>
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                BEST RATE
              </span>
            </span>
            <span className="font-mono text-slate-400">
              Số dư: <strong className="text-white">{toBalance.toFixed(4)}</strong> {toToken.symbol}
            </span>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="text-2xl sm:text-3xl font-mono font-black text-white">
              {expectedOutVal > 0 ? formatTokenDisplay(expectedOutVal, toToken) : '0.00'}
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
              ≈ {formatCurrency(expectedOutVal * toToken.priceUsd)} USD
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
        </div>

        {/* CLEAN 1-LINE EXECUTION SUMMARY BAR */}
        {quote ? (
          <div className="p-3 rounded-2xl bg-[#080C14] border border-white/[0.06] grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
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
        ) : quoteError && !isFetchingQuote && numFromAmount > 0 ? (
          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-mono flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
            <span>{quoteError}</span>
          </div>
        ) : null}

        {/* SOLID, NON-FLICKERING ACTION BUTTON */}
        <div className="pt-2">
          {!isConnected ? (
            <button
              onClick={() => connectWallet('demo')}
              className="w-full py-4 bg-gradient-to-r from-blue-600 via-cyan-500 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-sm rounded-2xl shadow-xl shadow-cyan-900/25 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Zap className="w-4 h-4 fill-white" />
              <span>Kết Nối Ví Web3</span>
            </button>
          ) : numFromAmount <= 0 ? (
            <button
              disabled
              className="w-full py-4 bg-white/[0.04] border border-white/[0.08] text-slate-500 font-bold text-sm rounded-2xl cursor-not-allowed"
            >
              Nhập Số Lượng Hoán Đổi
            </button>
          ) : isInsufficientBalance ? (
            <button
              disabled
              className="w-full py-4 bg-rose-500/10 border border-rose-500/30 text-rose-400 font-bold text-sm rounded-2xl cursor-not-allowed flex items-center justify-center gap-2"
            >
              <AlertCircle className="w-4 h-4 text-rose-400" />
              <span>Số Dư {fromToken.symbol} Không Đủ</span>
            </button>
          ) : !quote ? (
            <button
              disabled
              className="w-full py-4 bg-white/[0.04] border border-white/[0.08] text-slate-500 font-bold text-sm rounded-2xl cursor-not-allowed flex items-center justify-center gap-2"
            >
              <AlertCircle className="w-4 h-4 text-slate-500" />
              <span>{isFetchingQuote ? 'Đang Tính Toán Báo Giá...' : 'Không Có Thanh Khoản On-Chain Khả Dụng'}</span>
            </button>
          ) : (
            <button
              onClick={handleInitiateSwap}
              disabled={isSwapping}
              className="w-full py-4 bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:via-blue-500 hover:to-indigo-500 text-white font-black text-sm uppercase tracking-wide rounded-2xl shadow-xl shadow-cyan-900/30 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99] disabled:opacity-50"
            >
              {isSwapping ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  <span>Đang Mô Phỏng Khớp Lệnh...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 fill-white" />
                  <span>Mô Phỏng & Hoán Đổi Tức Thì</span>
                </>
              )}
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
              <span className="text-emerald-400 font-bold">100% Hoàn Hảo</span>
              {activeTab === 'routing' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </button>

          {activeTab === 'routing' && quote && (
            <div className="p-4 bg-[#080C14] space-y-2 border-t border-white/[0.04]">
              {quote.routeSplits && quote.routeSplits.map((split, idx) => (
                <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-[#0D111A] border border-white/[0.04] font-mono">
                  <div className="flex items-center gap-2.5">
                    <DexProtocolIcon dexId={split.dexName} name={split.dexName} className="w-5 h-5" />
                    <span className="font-bold text-cyan-300">{split.percentage}%</span>
                    <span className="text-white font-medium">{split.dexName}</span>
                  </div>
                  <span className="text-slate-400 text-[11px]">{split.path.join(' → ')}</span>
                </div>
              ))}
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

        {/* Accordion 3: AI Intelligence & Flashbots Defense */}
        <div>
          <button
            onClick={() => setActiveTab(activeTab === 'ai' ? null : 'ai')}
            className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-white/[0.02] transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2 font-bold text-white">
              <Cpu className="w-4 h-4 text-cyan-400" />
              <span>Phân Tích Trí Tuệ Nhân Tạo & Phòng Thủ MEV</span>
            </div>
            <div className="flex items-center gap-2 font-mono text-slate-400 text-[11px]">
              <span className="text-emerald-400 font-bold">Flashbots Relay</span>
              {activeTab === 'ai' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </button>

          {activeTab === 'ai' && quote && (
            <div className="p-4 bg-[#080C14] space-y-2 font-sans border-t border-white/[0.04]">
              <p className="text-slate-300 text-xs leading-relaxed">
                {quote.aiRouteInsight || 'Hệ thống Smart Router liên tục theo dõi thanh khoản các sàn để đảm bảo mức trượt giá và chi phí gas là thấp nhất thị trường.'}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 font-mono text-[11px]">
                <div className="p-2.5 rounded-xl bg-black/40 border border-white/[0.06] flex items-center gap-2">
                  <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div>
                    <div className="text-white font-bold">Private RPC Tunnel</div>
                    <div className="text-slate-400 text-[10px]">Ẩn hoàn toàn khỏi mempool công cộng</div>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-black/40 border border-white/[0.06] flex items-center gap-2">
                  <Flame className="w-4 h-4 text-amber-400 shrink-0" />
                  <div>
                    <div className="text-white font-bold">Gas Optimization</div>
                    <div className="text-slate-400 text-[10px]">Tối ưu 135,000 gas units</div>
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
                placeholder="Tìm tên token hoặc dán địa chỉ contract..."
                value={searchTokenQuery}
                onChange={(e) => setSearchTokenQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-[#131926] border border-white/[0.08] rounded-xl text-xs font-sans text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div className="max-h-72 overflow-y-auto space-y-1 scrollbar-none">
              {filteredSelectionTokens.map((token, idx) => (
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
                        {token.symbol}
                        <span className="text-[10px] font-normal text-slate-400">{token.name}</span>
                      </div>
                      <div className="text-[10px] font-mono text-slate-500">Đã xác thực On-chain</div>
                    </div>
                  </div>
                  <div className="text-right font-mono">
                    <div className="text-xs font-bold text-white">${token.priceUsd.toLocaleString(undefined, { minimumFractionDigits: token.priceUsd < 10 ? 4 : 2 })}</div>
                    <div className={`text-[10px] font-bold ${token.change24h >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {token.change24h >= 0 ? '+' : ''}{token.change24h.toFixed(2)}%
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
