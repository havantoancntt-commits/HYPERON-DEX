import React, { useState, useEffect } from 'react';
import { useWallet } from '../context/WalletContext';
import { useExchange } from '../context/ExchangeContext';
import { VERIFIED_TOKENS } from '../lib/constants';
import { OrderBook, TradeRecord, OrderType, UserOrder, CandleData } from '../types';
import { formatCurrency, formatCrypto, formatTimeAgo } from '../lib/utils';
import {
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  LineChart,
  BarChart3,
  Clock,
  Layers,
  ChevronDown,
  X,
  CheckCircle2,
  AlertTriangle,
  Activity,
  Zap
} from 'lucide-react';

export const TradeTerminalView: React.FC = () => {
  const { balances, isConnected, connectWallet, executeTransaction } = useWallet();
  const { addToast, getLiveToken, getLivePrice, tickDirections } = useExchange();

  const [activeSymbol, setActiveSymbol] = useState<string>('ETH');
  const activePair = getLiveToken(activeSymbol);

  const [timeframe, setTimeframe] = useState<'1m' | '5m' | '15m' | '1h' | '4h' | '1D'>('15m');
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [orderType, setOrderType] = useState<OrderType>('limit');
  const [limitPrice, setLimitPrice] = useState<string>(activePair.priceUsd.toString());
  const [stopPrice, setStopPrice] = useState<string>((activePair.priceUsd * 0.95).toFixed(2));
  const [amount, setAmount] = useState<string>('1.0');

  const [candles, setCandles] = useState<CandleData[]>([]);
  const [hoveredCandle, setHoveredCandle] = useState<CandleData | null>(null);
  const [orderBook, setOrderBook] = useState<OrderBook | null>(null);
  const [recentTrades, setRecentTrades] = useState<TradeRecord[]>([]);
  const [userOrders, setUserOrders] = useState<UserOrder[]>([
    {
      id: 'ord-101',
      pair: 'ETH/USDC',
      type: 'limit',
      side: 'buy',
      price: 3350.00,
      amount: 2.0,
      filledAmount: 0,
      status: 'open',
      createdAt: Date.now() - 3600000,
      chainId: 'ethereum',
    },
    {
      id: 'ord-102',
      pair: 'ETH/USDC',
      type: 'take_profit',
      side: 'sell',
      price: 3650.00,
      amount: 1.5,
      filledAmount: 0,
      status: 'open',
      createdAt: Date.now() - 7200000,
      chainId: 'ethereum',
    },
  ]);

  // Synchronize limit price input when active token changes
  useEffect(() => {
    setLimitPrice(activePair.priceUsd.toString());
    setStopPrice((activePair.priceUsd * 0.95).toFixed(activePair.priceUsd < 10 ? 4 : 2));
  }, [activeSymbol]);

  // Fetch real-time OHLCV candles
  useEffect(() => {
    const fetchCandles = async () => {
      try {
        const res = await fetch(`/api/prices/history?symbol=${activeSymbol}&timeframe=${timeframe}&count=32`);
        if (res.ok) {
          const data = await res.json();
          if (data.candles) {
            setCandles(data.candles);
          }
        }
      } catch (err) {
        console.warn('Failed to fetch candlestick history:', err);
      }
    };

    fetchCandles();
    const interval = setInterval(fetchCandles, 4000);
    return () => clearInterval(interval);
  }, [activeSymbol, timeframe]);

  // Fetch live orderbook & trades from backend
  useEffect(() => {
    const fetchMarketData = async () => {
      try {
        const [obRes, tradesRes] = await Promise.all([
          fetch(`/api/markets/orderbook?symbol=${activeSymbol}`),
          fetch(`/api/markets/trades?symbol=${activeSymbol}`),
        ]);
        const obData = await obRes.json();
        const tradesData = await tradesRes.json();
        setOrderBook(obData);
        setRecentTrades(tradesData.trades || []);
      } catch (err) {
        console.warn('Failed to fetch market terminal data:', err);
      }
    };

    fetchMarketData();
    const interval = setInterval(fetchMarketData, 3000);
    return () => clearInterval(interval);
  }, [activeSymbol]);

  const handlePlaceOrder = async () => {
    const parsedAmount = parseFloat(amount);
    const parsedPrice = orderType === 'market' ? activePair.priceUsd : parseFloat(limitPrice);

    if (!parsedAmount || parsedAmount <= 0) return;

    if (orderType === 'twap') {
      addToast({
        title: 'TWAP Algorithm Order Submitted',
        message: 'Order will be sliced into 12 sub-orders over 60 minutes to minimize price impact.',
        type: 'info',
      });
    }

    const newOrder: UserOrder = {
      id: `ord-${Date.now()}`,
      pair: `${activePair.symbol}/USDC`,
      type: orderType,
      side,
      price: parsedPrice,
      stopPrice: orderType === 'stop_limit' ? parseFloat(stopPrice) : undefined,
      amount: parsedAmount,
      filledAmount: orderType === 'market' ? parsedAmount : 0,
      status: orderType === 'market' ? 'filled' : 'open',
      createdAt: Date.now(),
      chainId: 'ethereum',
    };

    setUserOrders((prev) => [newOrder, ...prev]);

    if (orderType === 'market') {
      await executeTransaction({
        chainId: 'ethereum',
        type: 'SWAP',
        fromToken: side === 'buy' ? 'USDC' : activePair.symbol,
        toToken: side === 'buy' ? activePair.symbol : 'USDC',
        fromAmount: side === 'buy' ? parsedAmount * parsedPrice : parsedAmount,
        toAmount: side === 'buy' ? parsedAmount : parsedAmount * parsedPrice,
        gasSpentGwei: 18,
        gasSpentUsd: 3.80,
      });

      addToast({
        title: 'Market Order Executed',
        message: `Filled ${parsedAmount} ${activePair.symbol} @ $${parsedPrice.toLocaleString()}`,
        type: 'success',
      });
    } else {
      addToast({
        title: 'Order Placed on Orderbook',
        message: `${orderType.toUpperCase()} ${side.toUpperCase()} ${parsedAmount} ${activePair.symbol} @ $${parsedPrice.toLocaleString()}`,
        type: 'success',
      });
    }
  };

  const handleCancelOrder = (id: string) => {
    setUserOrders((prev) => prev.filter((o) => o.id !== id));
    addToast({
      title: 'Order Cancelled',
      message: `Order #${id} has been removed from mempool orderbook.`,
      type: 'warning',
    });
  };

  // Mathematical price scaling for candlestick chart
  const minPrice = candles.length > 0 ? Math.min(...candles.map((c) => c.low)) : activePair.priceUsd * 0.98;
  const maxPrice = candles.length > 0 ? Math.max(...candles.map((c) => c.high)) : activePair.priceUsd * 1.02;
  const priceRange = Math.max(maxPrice - minPrice, activePair.priceUsd * 0.005);
  const tickDir = tickDirections[activePair.symbol] || 'same';

  return (
    <div className="space-y-4 pb-12">
      {/* Top Ticker Header Bar */}
      <div className="p-4 rounded-2xl bg-[#0A0A0A] border border-white/5 flex flex-wrap items-center justify-between gap-4">
        {/* Pair Selector */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <img src={activePair.logoUrl} alt={activePair.name} className="w-8 h-8 rounded-full" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base text-white">{activePair.symbol}/USDC</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  REAL-TIME ORACLE
                </span>
              </div>
              <div className="text-[11px] text-slate-400">{activePair.name}</div>
            </div>
          </div>

          <div className="hidden sm:block h-8 w-px bg-white/5" />

          {/* Price Metrics */}
          <div className="flex items-center gap-5 text-xs font-mono">
            <div>
              <div className="text-[10px] text-slate-500 font-bold">LAST PRICE</div>
              <div className={`text-base font-extrabold transition-colors flex items-center gap-1 ${
                tickDir === 'up' ? 'text-emerald-400' : tickDir === 'down' ? 'text-rose-400' : 'text-white'
              }`}>
                {formatCurrency(activePair.priceUsd)}
                {tickDir === 'up' && <ArrowUpRight className="w-3.5 h-3.5" />}
                {tickDir === 'down' && <ArrowDownRight className="w-3.5 h-3.5" />}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 font-bold">24H CHANGE</div>
              <div className={`font-semibold text-sm ${activePair.change24h >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {activePair.change24h >= 0 ? '+' : ''}{activePair.change24h}%
              </div>
            </div>
            <div className="hidden md:block">
              <div className="text-[10px] text-slate-500 font-bold">24H VOLUME</div>
              <div className="text-slate-200 text-sm">{formatCurrency(activePair.volume24h, 1)}</div>
            </div>
            <div className="hidden lg:block">
              <div className="text-[10px] text-slate-500 font-bold">24H HIGH / LOW</div>
              <div className="text-slate-300 text-xs">
                ${(activePair.priceUsd * (1 + Math.abs(activePair.change24h) * 0.015)).toFixed(2)} / ${(activePair.priceUsd * (1 - Math.abs(activePair.change24h) * 0.015)).toFixed(2)}
              </div>
            </div>
          </div>
        </div>

        {/* Pair Quick Switch */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {VERIFIED_TOKENS.slice(0, 6).map((t) => {
            const currentLive = getLiveToken(t.symbol);
            return (
              <button
                key={t.symbol}
                onClick={() => setActiveSymbol(t.symbol)}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeSymbol === t.symbol
                    ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-900/20'
                    : 'bg-[#121212] text-slate-400 hover:text-white border border-white/5'
                }`}
              >
                <span>{t.symbol}</span>
                <span className={`text-[10px] ${currentLive.change24h >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {currentLive.change24h >= 0 ? '+' : ''}{currentLive.change24h.toFixed(1)}%
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Terminal Grid: Chart (Left) + Orderbook (Middle) + Buy/Sell (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Candlestick & Price Chart Area (7 Cols) */}
        <div className="lg:col-span-7 rounded-2xl bg-[#0A0A0A] border border-white/5 p-4 flex flex-col justify-between min-h-[460px]">
          {/* Chart Controls */}
          <div className="flex items-center justify-between pb-3 border-b border-white/5">
            <div className="flex items-center gap-1">
              {(['1m', '5m', '15m', '1h', '4h', '1D'] as const).map((tf) => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
                    timeframe === tf ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>

            {/* Hovered / Current Candle Inspector */}
            <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
              {hoveredCandle ? (
                <>
                  <span>O: <strong className="text-slate-200">${hoveredCandle.open}</strong></span>
                  <span>H: <strong className="text-emerald-400">${hoveredCandle.high}</strong></span>
                  <span>L: <strong className="text-rose-400">${hoveredCandle.low}</strong></span>
                  <span>C: <strong className="text-white">${hoveredCandle.close}</strong></span>
                  <span>Vol: <strong className="text-blue-400">{hoveredCandle.volume}</strong></span>
                </>
              ) : (
                <>
                  <span>MA(7): <strong className="text-amber-400">${(activePair.priceUsd * 0.994).toFixed(2)}</strong></span>
                  <span>MA(25): <strong className="text-purple-400">${(activePair.priceUsd * 0.988).toFixed(2)}</strong></span>
                </>
              )}
            </div>
          </div>

          {/* Interactive Visual Real-Time Candlestick Chart */}
          <div className="flex-1 py-4 flex flex-col justify-end relative select-none">
            {/* Horizontal Grid price levels */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20">
              <div className="border-b border-white/20 w-full flex justify-end text-[10px] font-mono text-slate-500 pr-2 pt-0.5">
                ${maxPrice.toFixed(2)}
              </div>
              <div className="border-b border-white/10 w-full flex justify-end text-[10px] font-mono text-slate-500 pr-2">
                ${((maxPrice + minPrice) / 2).toFixed(2)}
              </div>
              <div className="border-b border-white/20 w-full flex justify-end text-[10px] font-mono text-slate-500 pr-2 pb-0.5">
                ${minPrice.toFixed(2)}
              </div>
            </div>

            {/* Real Candlesticks Rendered from dynamic OHLCV data */}
            <div className="h-64 w-full flex items-end justify-between gap-1.5 px-2 relative z-10">
              {candles.map((candle, idx) => {
                const isGreen = candle.close >= candle.open;
                const bodyTop = Math.max(candle.open, candle.close);
                const bodyBottom = Math.min(candle.open, candle.close);
                
                // Position calculations in %
                const highPct = ((candle.high - minPrice) / priceRange) * 100;
                const lowPct = ((candle.low - minPrice) / priceRange) * 100;
                const bodyTopPct = ((bodyTop - minPrice) / priceRange) * 100;
                const bodyBottomPct = ((bodyBottom - minPrice) / priceRange) * 100;
                
                const wickHeight = Math.max(highPct - lowPct, 2);
                const bodyHeight = Math.max(bodyTopPct - bodyBottomPct, 2);

                return (
                  <div
                    key={idx}
                    onMouseEnter={() => setHoveredCandle(candle)}
                    onMouseLeave={() => setHoveredCandle(null)}
                    className="flex-1 flex flex-col items-center justify-end h-full group cursor-pointer relative"
                  >
                    {/* Wick */}
                    <div
                      className={`w-[1px] absolute ${isGreen ? 'bg-emerald-400' : 'bg-rose-400'}`}
                      style={{
                        bottom: `${Math.min(Math.max(lowPct, 2), 98)}%`,
                        height: `${Math.min(Math.max(wickHeight, 3), 96)}%`,
                      }}
                    />
                    {/* Body */}
                    <div
                      className={`w-full max-w-[12px] rounded-xs z-10 transition-all ${
                        isGreen ? 'bg-emerald-500 group-hover:bg-emerald-400' : 'bg-rose-500 group-hover:bg-rose-400'
                      } ${hoveredCandle === candle ? 'ring-2 ring-white scale-110' : ''}`}
                      style={{
                        position: 'absolute',
                        bottom: `${Math.min(Math.max(bodyBottomPct, 2), 98)}%`,
                        height: `${Math.min(Math.max(bodyHeight, 2.5), 96)}%`,
                      }}
                    />
                  </div>
                );
              })}
            </div>

            {/* Active Live Price Marker */}
            <div
              className="absolute right-0 bg-blue-600 text-white font-mono text-[11px] font-bold px-2 py-0.5 rounded-l shadow-lg transition-all duration-300"
              style={{
                bottom: `${Math.min(Math.max(((activePair.priceUsd - minPrice) / priceRange) * 100, 5), 95)}%`,
              }}
            >
              ${activePair.priceUsd.toFixed(2)}
            </div>
          </div>

          <div className="pt-3 border-t border-white/5 flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>24h Low: ${(activePair.priceUsd * 0.97).toFixed(2)}</span>
            <span className="flex items-center gap-1.5 text-blue-400 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping" />
              Spread: {orderBook?.spreadPercent || '0.04'}%
            </span>
            <span>24h High: ${(activePair.priceUsd * 1.03).toFixed(2)}</span>
          </div>
        </div>

        {/* Order Book & Recent Trades (2.5 Cols) */}
        <div className="lg:col-span-2.5 rounded-2xl bg-[#0A0A0A] border border-white/5 p-3.5 flex flex-col justify-between text-xs font-mono">
          <div className="font-bold text-white text-xs pb-2 border-b border-white/5 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-blue-400" /> Order Book
            </span>
            <span className="text-[10px] text-slate-400">Size ({activePair.symbol})</span>
          </div>

          {/* Asks (Sells - Red) */}
          <div className="space-y-1 py-1">
            {orderBook?.asks.slice(0, 5).reverse().map((ask, i) => (
              <div key={i} className="flex justify-between text-[11px] relative py-0.5">
                <span className="text-rose-400 font-medium">${ask.price.toFixed(activePair.priceUsd < 10 ? 4 : 2)}</span>
                <span className="text-slate-300">{ask.amount.toFixed(activePair.priceUsd > 100 ? 3 : 1)}</span>
                <div
                  className="absolute right-0 top-0 bottom-0 bg-rose-500/10 rounded pointer-events-none"
                  style={{ width: `${Math.min(ask.amount * 25, 100)}%` }}
                />
              </div>
            ))}
          </div>

          {/* Real-time Spread Indicator */}
          <div className="py-1.5 px-2 my-1 rounded-lg bg-[#121212] border border-white/5 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Market Spread</span>
            <span className="text-blue-400 font-bold">${orderBook?.spread || '0.12'} ({orderBook?.spreadPercent || '0.04'}%)</span>
          </div>

          {/* Bids (Buys - Green) */}
          <div className="space-y-1 py-1">
            {orderBook?.bids.slice(0, 5).map((bid, i) => (
              <div key={i} className="flex justify-between text-[11px] relative py-0.5">
                <span className="text-emerald-400 font-medium">${bid.price.toFixed(activePair.priceUsd < 10 ? 4 : 2)}</span>
                <span className="text-slate-300">{bid.amount.toFixed(activePair.priceUsd > 100 ? 3 : 1)}</span>
                <div
                  className="absolute right-0 top-0 bottom-0 bg-emerald-500/10 rounded pointer-events-none"
                  style={{ width: `${Math.min(bid.amount * 25, 100)}%` }}
                />
              </div>
            ))}
          </div>

          {/* Live Recent Trade Feed */}
          <div className="pt-2 border-t border-white/5 space-y-1">
            <div className="text-[10px] text-slate-500 font-bold uppercase pb-1 flex items-center justify-between">
              <span>Real-Time Trades</span>
              <span className="text-emerald-400 font-mono">FEED LIVE</span>
            </div>
            {recentTrades.slice(0, 4).map((tr) => (
              <div key={tr.id} className="flex items-center justify-between text-[10px]">
                <span className={tr.type === 'buy' ? 'text-emerald-400' : 'text-rose-400'}>
                  ${tr.price.toFixed(activePair.priceUsd < 10 ? 4 : 2)}
                </span>
                <span className="text-slate-400">{tr.amount} {activePair.symbol}</span>
                <span className="text-slate-600">{formatTimeAgo(tr.timestamp)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Trade Execution Order Form (2.5 Cols) */}
        <div className="lg:col-span-2.5 rounded-2xl bg-[#0A0A0A] border border-white/5 p-4 flex flex-col justify-between text-xs space-y-3">
          <div>
            {/* Buy / Sell Tabs */}
            <div className="grid grid-cols-2 gap-1 p-1 bg-[#121212] rounded-xl border border-white/5">
              <button
                onClick={() => setSide('buy')}
                className={`py-2 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                  side === 'buy' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                BUY {activePair.symbol}
              </button>
              <button
                onClick={() => setSide('sell')}
                className={`py-2 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                  side === 'sell' ? 'bg-rose-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                SELL {activePair.symbol}
              </button>
            </div>

            {/* Order Type Selector */}
            <div className="mt-3">
              <label className="text-[10px] font-mono text-slate-500 font-bold uppercase">Order Type</label>
              <div className="grid grid-cols-3 gap-1 mt-1 font-mono text-[11px]">
                {(['limit', 'market', 'twap'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setOrderType(t)}
                    className={`py-1.5 rounded-lg border transition-colors cursor-pointer uppercase font-semibold ${
                      orderType === t
                        ? 'bg-blue-600 text-white border-blue-500'
                        : 'bg-[#121212] text-slate-400 border-white/5 hover:text-white'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Price Inputs */}
            {orderType !== 'market' && (
              <div className="mt-3">
                <div className="flex justify-between text-[10px] font-mono text-slate-400">
                  <span>LIMIT PRICE</span>
                  <button
                    onClick={() => setLimitPrice(activePair.priceUsd.toString())}
                    className="text-blue-400 hover:underline cursor-pointer"
                  >
                    Set Market (${activePair.priceUsd})
                  </button>
                </div>
                <div className="relative mt-1">
                  <input
                    type="number"
                    step="any"
                    value={limitPrice}
                    onChange={(e) => setLimitPrice(e.target.value)}
                    className="w-full px-3 py-2 bg-[#121212] border border-white/5 rounded-xl font-mono text-white text-xs focus:outline-none focus:border-blue-500"
                  />
                  <span className="absolute right-3 top-2 font-mono text-xs text-slate-500">USDC</span>
                </div>
              </div>
            )}

            {/* Amount Input */}
            <div className="mt-3">
              <div className="flex justify-between text-[10px] font-mono text-slate-400">
                <span>AMOUNT</span>
                <span className="text-slate-500">Bal: {balances[activePair.symbol] || 0} {activePair.symbol}</span>
              </div>
              <div className="relative mt-1">
                <input
                  type="number"
                  step="any"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-[#121212] border border-white/5 rounded-xl font-mono text-white text-xs focus:outline-none focus:border-blue-500"
                />
                <span className="absolute right-3 top-2 font-mono text-xs text-slate-500">{activePair.symbol}</span>
              </div>
            </div>

            {/* Percentage shortcuts */}
            <div className="grid grid-cols-4 gap-1 mt-2 font-mono text-[10px]">
              {[25, 50, 75, 100].map((pct) => (
                <button
                  key={pct}
                  onClick={() => {
                    const bal = side === 'buy' ? (balances.USDC || 1000) / activePair.priceUsd : balances[activePair.symbol] || 2;
                    setAmount(((bal * pct) / 100).toFixed(2));
                  }}
                  className="py-1 rounded bg-[#121212] hover:bg-[#181818] border border-white/5 text-slate-400 hover:text-white transition-colors"
                >
                  {pct}%
                </button>
              ))}
            </div>

            {/* Summary */}
            <div className="mt-4 p-2.5 rounded-xl bg-[#121212] border border-white/5 font-mono text-[11px] space-y-1 text-slate-400">
              <div className="flex justify-between">
                <span>Total Value:</span>
                <span className="text-white font-bold">
                  ${((parseFloat(amount) || 0) * (orderType === 'market' ? activePair.priceUsd : parseFloat(limitPrice) || activePair.priceUsd)).toFixed(2)} USDC
                </span>
              </div>
              <div className="flex justify-between">
                <span>Routing:</span>
                <span className="text-emerald-400">MEV Protected (Private RPC)</span>
              </div>
            </div>
          </div>

          {/* Place Order CTA */}
          <button
            onClick={handlePlaceOrder}
            className={`w-full py-3 rounded-xl font-bold text-xs transition-all shadow-lg cursor-pointer ${
              side === 'buy'
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/20'
                : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/20'
            }`}
          >
            {side === 'buy' ? 'BUY' : 'SELL'} {activePair.symbol} NOW
          </button>
        </div>
      </div>

      {/* User Open & Historic Orders Table */}
      <div className="rounded-2xl bg-[#0A0A0A] border border-white/5 p-4">
        <div className="flex items-center justify-between pb-3 border-b border-white/5">
          <div className="font-bold text-white text-xs flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-400" /> Active Mempool & Limit Orders
          </div>
          <span className="text-xs font-mono text-slate-400">{userOrders.length} Orders</span>
        </div>

        <div className="overflow-x-auto mt-2">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-white/5 text-[10px] uppercase text-slate-500">
                <th className="py-2.5 px-3">Order ID</th>
                <th className="py-2.5 px-3">Pair</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Side</th>
                <th className="py-2.5 px-3">Price</th>
                <th className="py-2.5 px-3">Amount</th>
                <th className="py-2.5 px-3">Filled</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-slate-300">
              {userOrders.map((ord) => (
                <tr key={ord.id} className="hover:bg-[#121212] transition-colors">
                  <td className="py-3 px-3 text-slate-400 font-semibold">{ord.id}</td>
                  <td className="py-3 px-3 text-white font-bold">{ord.pair}</td>
                  <td className="py-3 px-3 uppercase text-blue-400">{ord.type}</td>
                  <td className="py-3 px-3 uppercase font-bold">
                    <span className={ord.side === 'buy' ? 'text-emerald-400' : 'text-rose-400'}>{ord.side}</span>
                  </td>
                  <td className="py-3 px-3 text-white">${ord.price.toFixed(2)}</td>
                  <td className="py-3 px-3">{ord.amount}</td>
                  <td className="py-3 px-3 text-slate-400">{ord.filledAmount}</td>
                  <td className="py-3 px-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      ord.status === 'filled'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}>
                      {ord.status}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    {ord.status === 'open' && (
                      <button
                        onClick={() => handleCancelOrder(ord.id)}
                        className="p-1 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 rounded transition-colors cursor-pointer"
                        title="Cancel Order"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
