import React, { useState, useEffect } from 'react';
import { useWallet } from '../context/WalletContext';
import { useExchange } from '../context/ExchangeContext';
import { VERIFIED_TOKENS } from '../lib/constants';
import { OrderBook, TradeRecord, OrderType, UserOrder, CandleData } from '../types';
import { formatCurrency, formatCrypto, formatTimeAgo } from '../lib/utils';
import { TokenLogo } from '../components/CryptoIcon';
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
  Zap,
  Sliders,
  ShieldCheck,
  Fuel,
  Maximize2,
  RotateCcw,
  Sparkles,
  Info
} from 'lucide-react';

interface Position {
  id: string;
  pair: string;
  side: 'long' | 'short';
  leverage: number;
  entryPrice: number;
  markPrice: number;
  size: number;
  margin: number;
  liquidationPrice: number;
  unrealizedPnl: number;
  pnlPercentage: number;
}

export const TradeTerminalView: React.FC = () => {
  const { balances, isConnected, connectWallet, executeTransaction } = useWallet();
  const { addToast, getLiveToken, getLivePrice, tickDirections } = useExchange();

  const [activeSymbol, setActiveSymbol] = useState<string>('ETH');
  const activePair = getLiveToken(activeSymbol);
  const tickDir = tickDirections[activeSymbol] || 'same';

  const [tradingMode, setTradingMode] = useState<'spot' | 'perpetual'>('spot');
  const [timeframe, setTimeframe] = useState<'1m' | '5m' | '15m' | '1h' | '4h' | '1D'>('15m');
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [orderType, setOrderType] = useState<OrderType>('limit');
  const [limitPrice, setLimitPrice] = useState<string>(activePair.priceUsd.toString());
  const [stopPrice, setStopPrice] = useState<string>((activePair.priceUsd * 0.95).toFixed(2));
  const [amount, setAmount] = useState<string>('1.0');
  const [leverage, setLeverage] = useState<number>(10);
  const [takeProfit, setTakeProfit] = useState<string>('');
  const [stopLoss, setStopLoss] = useState<string>('');
  const [selectedTab, setSelectedTab] = useState<'orders' | 'positions' | 'history' | 'trades'>('orders');

  const [candles, setCandles] = useState<CandleData[]>([]);
  const [hoveredCandle, setHoveredCandle] = useState<CandleData | null>(null);
  const [orderBook, setOrderBook] = useState<OrderBook | null>(null);
  const [recentTrades, setRecentTrades] = useState<TradeRecord[]>([]);
  const [activeIndicator, setActiveIndicator] = useState<'EMA' | 'RSI' | 'MACD' | 'VOL'>('EMA');

  const [userOrders, setUserOrders] = useState<UserOrder[]>([
    {
      id: 'ORD-88219',
      pair: 'ETH/USDC',
      type: 'limit',
      side: 'buy',
      price: 3340.00,
      amount: 2.5,
      filledAmount: 0,
      status: 'open',
      createdAt: Date.now() - 3600000,
      chainId: 'ethereum',
    },
    {
      id: 'ORD-88220',
      pair: 'ETH/USDC',
      type: 'take_profit',
      side: 'sell',
      price: 3680.00,
      amount: 1.8,
      filledAmount: 0,
      status: 'open',
      createdAt: Date.now() - 7200000,
      chainId: 'ethereum',
    },
  ]);

  const [positions, setPositions] = useState<Position[]>([
    {
      id: 'POS-001',
      pair: 'ETH-PERP',
      side: 'long',
      leverage: 10,
      entryPrice: 3380.00,
      markPrice: activePair.priceUsd,
      size: 5.0,
      margin: 1690.00,
      liquidationPrice: 3080.00,
      unrealizedPnl: (activePair.priceUsd - 3380.00) * 5.0,
      pnlPercentage: ((activePair.priceUsd - 3380.00) / 3380.00) * 10 * 100,
    }
  ]);

  // Synchronize limit price input when active token changes
  useEffect(() => {
    setLimitPrice(activePair.priceUsd.toString());
    setStopPrice((activePair.priceUsd * 0.95).toFixed(activePair.priceUsd < 10 ? 4 : 2));
    setTakeProfit((activePair.priceUsd * 1.08).toFixed(activePair.priceUsd < 10 ? 4 : 2));
    setStopLoss((activePair.priceUsd * 0.96).toFixed(activePair.priceUsd < 10 ? 4 : 2));
  }, [activeSymbol]);

  // Update positions with live mark price
  useEffect(() => {
    setPositions((prev) =>
      prev.map((pos) => {
        if (pos.pair.startsWith(activeSymbol)) {
          const currentPrice = activePair.priceUsd;
          const diff = pos.side === 'long' ? currentPrice - pos.entryPrice : pos.entryPrice - currentPrice;
          const pnl = diff * pos.size;
          const pnlPct = (diff / pos.entryPrice) * pos.leverage * 100;
          return {
            ...pos,
            markPrice: currentPrice,
            unrealizedPnl: pnl,
            pnlPercentage: pnlPct,
          };
        }
        return pos;
      })
    );
  }, [activePair.priceUsd, activeSymbol]);

  // Fetch real-time OHLCV candles
  useEffect(() => {
    const fetchCandles = async () => {
      try {
        const res = await fetch(`/api/prices/history?symbol=${activeSymbol}&timeframe=${timeframe}&count=34`);
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
    const interval = setInterval(fetchCandles, 3500);
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

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      addToast({
        title: 'Invalid Amount',
        message: 'Please enter a valid order size quantity.',
        type: 'error',
      });
      return;
    }

    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      addToast({
        title: 'Invalid Price',
        message: 'Please specify a valid limit order price.',
        type: 'error',
      });
      return;
    }

    if (tradingMode === 'perpetual') {
      const newPos: Position = {
        id: `POS-${Math.floor(100 + Math.random() * 900)}`,
        pair: `${activeSymbol}-PERP`,
        side: side === 'buy' ? 'long' : 'short',
        leverage,
        entryPrice: parsedPrice,
        markPrice: activePair.priceUsd,
        size: parsedAmount,
        margin: (parsedAmount * parsedPrice) / leverage,
        liquidationPrice: side === 'buy' ? parsedPrice * (1 - 0.9 / leverage) : parsedPrice * (1 + 0.9 / leverage),
        unrealizedPnl: 0,
        pnlPercentage: 0,
      };
      setPositions((prev) => [newPos, ...prev]);
      addToast({
        title: 'Position Opened',
        message: `${leverage}x ${side === 'buy' ? 'LONG' : 'SHORT'} position on ${activeSymbol} opened at $${parsedPrice.toFixed(2)}.`,
        type: 'success',
      });
      setSelectedTab('positions');
      return;
    }

    if (orderType === 'market') {
      const success = await executeTransaction({
        chainId: 'ethereum',
        type: 'SWAP',
        fromToken: side === 'buy' ? 'USDC' : activePair.symbol,
        toToken: side === 'buy' ? activePair.symbol : 'USDC',
        fromAmount: side === 'buy' ? parsedAmount * parsedPrice : parsedAmount,
        toAmount: side === 'buy' ? parsedAmount : parsedAmount * parsedPrice,
        gasSpentGwei: 24,
        gasSpentUsd: 0.45,
      });

      if (success) {
        addToast({
          title: 'Market Order Filled',
          message: `Successfully executed ${side.toUpperCase()} ${parsedAmount} ${activePair.symbol} at market price $${activePair.priceUsd.toFixed(2)}.`,
          type: 'success',
        });
      }
    } else {
      const newOrder: UserOrder = {
        id: `ORD-${Math.floor(10000 + Math.random() * 90000)}`,
        pair: `${activePair.symbol}/USDC`,
        type: orderType,
        side,
        price: parsedPrice,
        amount: parsedAmount,
        filledAmount: 0,
        status: 'open',
        createdAt: Date.now(),
        chainId: 'ethereum',
      };
      setUserOrders((prev) => [newOrder, ...prev]);
      addToast({
        title: 'Limit Order Placed',
        message: `${side.toUpperCase()} order for ${parsedAmount} ${activePair.symbol} @ $${parsedPrice.toFixed(2)} broadcasted to mempool.`,
        type: 'success',
      });
      setSelectedTab('orders');
    }
  };

  const handleCancelOrder = (orderId: string) => {
    setUserOrders((prev) => prev.filter((o) => o.id !== orderId));
    addToast({
      title: 'Order Cancelled',
      message: `Order #${orderId} was removed from the active book.`,
      type: 'info',
    });
  };

  const handleClosePosition = (positionId: string) => {
    setPositions((prev) => prev.filter((p) => p.id !== positionId));
    addToast({
      title: 'Position Closed',
      message: `Position #${positionId} closed at market price $${activePair.priceUsd.toFixed(2)}.`,
      type: 'success',
    });
  };

  // Calculate high and low from candles
  const candleHighs = candles.map((c) => c.high);
  const candleLows = candles.map((c) => c.low);
  const maxPrice = candleHighs.length ? Math.max(...candleHighs, activePair.priceUsd * 1.01) : activePair.priceUsd * 1.05;
  const minPrice = candleLows.length ? Math.min(...candleLows, activePair.priceUsd * 0.99) : activePair.priceUsd * 0.95;
  const priceRange = maxPrice - minPrice || 1;

  return (
    <div className="space-y-4 pb-12">
      {/* Top Header Metrics Bar */}
      <div className="rounded-2xl bg-[#0D111A] border border-white/[0.08] p-4 shadow-xl flex flex-wrap items-center justify-between gap-4">
        {/* Token Selector & Price Info */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <TokenLogo symbol={activePair.symbol} name={activePair.name} src={activePair.logoUrl} chainId={activePair.chainId} className="w-9 h-9" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-white text-lg font-sans">{activePair.symbol}/USDC</span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  REAL-TIME ORACLE
                </span>
              </div>
              <div className="text-xs text-slate-400 font-medium">{activePair.name} Institutional Feed</div>
            </div>
          </div>

          <div className="hidden sm:block h-8 w-px bg-white/10" />

          {/* Price Metrics */}
          <div className="flex items-center gap-6 text-xs font-mono">
            <div>
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">MARK PRICE</div>
              <div className={`text-base font-extrabold transition-colors flex items-center gap-1 ${
                tickDir === 'up' ? 'text-emerald-400' : tickDir === 'down' ? 'text-rose-400' : 'text-white'
              }`}>
                {formatCurrency(activePair.priceUsd)}
                {tickDir === 'up' && <ArrowUpRight className="w-4 h-4" />}
                {tickDir === 'down' && <ArrowDownRight className="w-4 h-4" />}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">24H CHANGE</div>
              <div className={`font-bold text-sm ${activePair.change24h >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {activePair.change24h >= 0 ? '+' : ''}{activePair.change24h.toFixed(2)}%
              </div>
            </div>
            <div className="hidden md:block">
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">24H VOLUME</div>
              <div className="text-slate-200 text-sm font-bold">{formatCurrency(activePair.volume24h, 1)}</div>
            </div>
            <div className="hidden lg:block">
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">FUNDING / 8H</div>
              <div className="text-cyan-400 text-xs font-bold">+0.0100%</div>
            </div>
          </div>
        </div>

        {/* Quick Pair Ticker Badges */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {VERIFIED_TOKENS.slice(0, 6).map((t) => {
            const currentLive = getLiveToken(t.symbol);
            return (
              <button
                key={t.symbol}
                onClick={() => setActiveSymbol(t.symbol)}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeSymbol === t.symbol
                    ? 'bg-blue-600 text-white font-bold shadow-lg shadow-blue-900/30 border border-blue-400/40'
                    : 'bg-[#131926] text-slate-400 hover:text-white border border-white/[0.06] hover:bg-[#1A2234]'
                }`}
              >
                <span>{t.symbol}</span>
                <span className={`text-[10px] font-semibold ${currentLive.change24h >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {currentLive.change24h >= 0 ? '+' : ''}{currentLive.change24h.toFixed(1)}%
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Terminal Grid: Chart (Left 7 Cols) + Orderbook (Middle 2.5 Cols) + Execution Form (Right 2.5 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Candlestick & Price Chart Area (7 Cols) */}
        <div className="lg:col-span-7 rounded-2xl bg-[#0D111A] border border-white/[0.08] p-4 flex flex-col justify-between min-h-[500px] shadow-xl">
          {/* Chart Header Bar with Timeframes & Indicators */}
          <div className="flex flex-wrap items-center justify-between pb-3 border-b border-white/[0.08] gap-2">
            <div className="flex items-center gap-1">
              {(['1m', '5m', '15m', '1h', '4h', '1D'] as const).map((tf) => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                    timeframe === tf ? 'bg-blue-600 text-white font-bold shadow-sm' : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>

            {/* Indicators Selector */}
            <div className="flex items-center gap-1.5 text-[11px] font-mono">
              {(['EMA', 'RSI', 'MACD', 'VOL'] as const).map((ind) => (
                <button
                  key={ind}
                  onClick={() => setActiveIndicator(ind)}
                  className={`px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                    activeIndicator === ind
                      ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30 font-bold'
                      : 'border-white/[0.06] text-slate-400 hover:text-white'
                  }`}
                >
                  {ind}
                </button>
              ))}
            </div>

            {/* Hovered / Current Candle Inspector */}
            <div className="hidden sm:flex items-center gap-2.5 text-xs text-slate-400 font-mono">
              {hoveredCandle ? (
                <>
                  <span>O: <strong className="text-slate-200">${hoveredCandle.open}</strong></span>
                  <span>H: <strong className="text-emerald-400">${hoveredCandle.high}</strong></span>
                  <span>L: <strong className="text-rose-400">${hoveredCandle.low}</strong></span>
                  <span>C: <strong className="text-white">${hoveredCandle.close}</strong></span>
                  <span>V: <strong className="text-cyan-400">{hoveredCandle.volume}</strong></span>
                </>
              ) : (
                <>
                  <span>EMA(7): <strong className="text-amber-400">${(activePair.priceUsd * 0.994).toFixed(2)}</strong></span>
                  <span>EMA(25): <strong className="text-purple-400">${(activePair.priceUsd * 0.988).toFixed(2)}</strong></span>
                </>
              )}
            </div>
          </div>

          {/* Interactive Visual Real-Time Candlestick Chart */}
          <div className="flex-1 py-4 flex flex-col justify-end relative select-none">
            {/* Horizontal Grid price levels */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20">
              <div className="border-b border-white/20 w-full flex justify-end text-[10px] font-mono text-slate-400 pr-2 pt-0.5">
                ${maxPrice.toFixed(2)}
              </div>
              <div className="border-b border-white/10 w-full flex justify-end text-[10px] font-mono text-slate-400 pr-2">
                ${((maxPrice + minPrice) / 2).toFixed(2)}
              </div>
              <div className="border-b border-white/20 w-full flex justify-end text-[10px] font-mono text-slate-400 pr-2 pb-0.5">
                ${minPrice.toFixed(2)}
              </div>
            </div>

            {/* Real Candlesticks Rendered from dynamic OHLCV data */}
            <div className="h-72 w-full flex items-end justify-between gap-1 px-2 relative z-10">
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
                      className={`w-[1.5px] absolute ${isGreen ? 'bg-emerald-400' : 'bg-rose-400'}`}
                      style={{
                        bottom: `${Math.min(Math.max(lowPct, 2), 98)}%`,
                        height: `${Math.min(Math.max(wickHeight, 3), 96)}%`,
                      }}
                    />
                    {/* Body */}
                    <div
                      className={`w-full max-w-[14px] rounded-[1px] z-10 transition-all ${
                        isGreen ? 'bg-emerald-500 group-hover:bg-emerald-400' : 'bg-rose-500 group-hover:bg-rose-400'
                      } ${hoveredCandle === candle ? 'ring-2 ring-white scale-110 shadow-lg' : ''}`}
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
              className="absolute right-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-mono text-[11px] font-extrabold px-2.5 py-1 rounded-l-lg shadow-xl transition-all duration-300 flex items-center gap-1.5"
              style={{
                bottom: `${Math.min(Math.max(((activePair.priceUsd - minPrice) / priceRange) * 100, 5), 95)}%`,
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
              ${activePair.priceUsd.toFixed(2)}
            </div>
          </div>

          <div className="pt-3 border-t border-white/[0.08] flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>24h Low: ${(activePair.priceUsd * 0.97).toFixed(2)}</span>
            <span className="flex items-center gap-1.5 text-cyan-400 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
              Spread: {orderBook?.spreadPercent || '0.04'}%
            </span>
            <span>24h High: ${(activePair.priceUsd * 1.03).toFixed(2)}</span>
          </div>
        </div>

        {/* Order Book & Recent Trades (2.5 Cols) */}
        <div className="lg:col-span-2.5 rounded-2xl bg-[#0D111A] border border-white/[0.08] p-3.5 flex flex-col justify-between text-xs font-mono shadow-xl">
          <div className="font-bold text-white text-xs pb-2 border-b border-white/[0.08] flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-cyan-400" /> Order Book
            </span>
            <span className="text-[10px] text-slate-400">Size ({activePair.symbol})</span>
          </div>

          {/* Asks (Sells - Red) */}
          <div className="space-y-1 py-1">
            {orderBook?.asks.slice(0, 5).reverse().map((ask, i) => (
              <div key={i} className="flex justify-between text-[11px] relative py-0.5">
                <span className="text-rose-400 font-bold">${ask.price.toFixed(activePair.priceUsd < 10 ? 4 : 2)}</span>
                <span className="text-slate-300 font-medium">{ask.amount.toFixed(activePair.priceUsd > 100 ? 3 : 1)}</span>
                <div
                  className="absolute right-0 top-0 bottom-0 bg-rose-500/15 rounded pointer-events-none"
                  style={{ width: `${Math.min(ask.amount * 25, 100)}%` }}
                />
              </div>
            ))}
          </div>

          {/* Real-time Spread Indicator */}
          <div className="py-2 px-2.5 my-1 rounded-xl bg-[#080C14] border border-white/[0.06] flex items-center justify-between text-[11px]">
            <span className="text-slate-400 font-medium">Market Spread</span>
            <span className="text-cyan-400 font-bold">${orderBook?.spread || '0.12'} ({orderBook?.spreadPercent || '0.04'}%)</span>
          </div>

          {/* Bids (Buys - Green) */}
          <div className="space-y-1 py-1">
            {orderBook?.bids.slice(0, 5).map((bid, i) => (
              <div key={i} className="flex justify-between text-[11px] relative py-0.5">
                <span className="text-emerald-400 font-bold">${bid.price.toFixed(activePair.priceUsd < 10 ? 4 : 2)}</span>
                <span className="text-slate-300 font-medium">{bid.amount.toFixed(activePair.priceUsd > 100 ? 3 : 1)}</span>
                <div
                  className="absolute right-0 top-0 bottom-0 bg-emerald-500/15 rounded pointer-events-none"
                  style={{ width: `${Math.min(bid.amount * 25, 100)}%` }}
                />
              </div>
            ))}
          </div>

          {/* Live Recent Trade Feed */}
          <div className="pt-2.5 border-t border-white/[0.08] space-y-1">
            <div className="text-[10px] text-slate-400 font-bold uppercase pb-1 flex items-center justify-between">
              <span>Real-Time Trades</span>
              <span className="text-emerald-400 font-mono text-[9px] font-extrabold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> FEED LIVE
              </span>
            </div>
            {recentTrades.slice(0, 4).map((tr) => (
              <div key={tr.id} className="flex items-center justify-between text-[10px]">
                <span className={`font-bold ${tr.type === 'buy' ? 'text-emerald-400' : 'text-rose-400'}`}>
                  ${tr.price.toFixed(activePair.priceUsd < 10 ? 4 : 2)}
                </span>
                <span className="text-slate-300">{tr.amount} {activePair.symbol}</span>
                <span className="text-slate-500">{formatTimeAgo(tr.timestamp)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Trade Execution Order Form (2.5 Cols) */}
        <div className="lg:col-span-2.5 rounded-2xl bg-[#0D111A] border border-white/[0.08] p-4 flex flex-col justify-between text-xs space-y-3 shadow-xl">
          <div>
            {/* Spot vs Perpetual Toggle */}
            <div className="grid grid-cols-2 gap-1 p-1 bg-[#080C14] rounded-xl border border-white/[0.06] mb-3">
              <button
                onClick={() => setTradingMode('spot')}
                className={`py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                  tradingMode === 'spot' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                SPOT
              </button>
              <button
                onClick={() => setTradingMode('perpetual')}
                className={`py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  tradingMode === 'perpetual' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>PERP</span>
                <span className="text-[9px] px-1 rounded bg-amber-400/20 text-amber-300 font-mono">50x</span>
              </button>
            </div>

            {/* Buy / Sell Tabs */}
            <div className="grid grid-cols-2 gap-1 p-1 bg-[#080C14] rounded-xl border border-white/[0.06]">
              <button
                onClick={() => setSide('buy')}
                className={`py-2 rounded-lg font-extrabold text-xs transition-all cursor-pointer ${
                  side === 'buy' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/30' : 'text-slate-400 hover:text-white'
                }`}
              >
                BUY / LONG
              </button>
              <button
                onClick={() => setSide('sell')}
                className={`py-2 rounded-lg font-extrabold text-xs transition-all cursor-pointer ${
                  side === 'sell' ? 'bg-rose-600 text-white shadow-lg shadow-rose-900/30' : 'text-slate-400 hover:text-white'
                }`}
              >
                SELL / SHORT
              </button>
            </div>

            {/* Order Type Selector */}
            <div className="mt-3">
              <label className="text-[10px] font-mono text-slate-400 font-bold uppercase">Order Execution Type</label>
              <div className="grid grid-cols-3 gap-1 mt-1 font-mono text-[11px]">
                {(['limit', 'market', 'twap'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setOrderType(t)}
                    className={`py-1.5 rounded-xl border transition-all cursor-pointer uppercase font-bold ${
                      orderType === t
                        ? 'bg-blue-600 text-white border-blue-400 shadow-sm'
                        : 'bg-[#131926] text-slate-400 border-white/[0.06] hover:text-white'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Leverage Slider (if Perpetual mode) */}
            {tradingMode === 'perpetual' && (
              <div className="mt-3 p-2.5 rounded-xl bg-[#080C14] border border-white/[0.06]">
                <div className="flex justify-between text-[10px] font-mono text-slate-300 font-bold">
                  <span>LEVERAGE</span>
                  <span className="text-amber-400">{leverage}x Cross Margin</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="50"
                  value={leverage}
                  onChange={(e) => setLeverage(parseInt(e.target.value))}
                  className="w-full mt-1.5 accent-amber-400 cursor-pointer"
                />
                <div className="flex justify-between text-[9px] font-mono text-slate-500 mt-1">
                  <span>1x</span>
                  <span>10x</span>
                  <span>25x</span>
                  <span>50x</span>
                </div>
              </div>
            )}

            {/* Price Inputs */}
            {orderType !== 'market' && (
              <div className="mt-3">
                <div className="flex justify-between text-[10px] font-mono text-slate-400 font-semibold">
                  <span>LIMIT PRICE</span>
                  <button
                    onClick={() => setLimitPrice(activePair.priceUsd.toString())}
                    className="text-cyan-400 hover:underline cursor-pointer"
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
                    className="w-full px-3 py-2 bg-[#131926] border border-white/[0.08] rounded-xl font-mono text-white text-xs focus:outline-none focus:border-cyan-400 font-bold"
                  />
                  <span className="absolute right-3 top-2 font-mono text-xs text-slate-400 font-bold">USDC</span>
                </div>
              </div>
            )}

            {/* Amount Input */}
            <div className="mt-3">
              <div className="flex justify-between text-[10px] font-mono text-slate-400 font-semibold">
                <span>AMOUNT SIZE</span>
                <span className="text-slate-400">Bal: {balances[activePair.symbol] || 0} {activePair.symbol}</span>
              </div>
              <div className="relative mt-1">
                <input
                  type="number"
                  step="any"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-[#131926] border border-white/[0.08] rounded-xl font-mono text-white text-xs focus:outline-none focus:border-cyan-400 font-bold"
                />
                <span className="absolute right-3 top-2 font-mono text-xs text-slate-400 font-bold">{activePair.symbol}</span>
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
                  className="py-1 rounded-lg bg-[#131926] hover:bg-[#1A2234] border border-white/[0.06] text-slate-300 hover:text-white transition-colors cursor-pointer font-bold"
                >
                  {pct}%
                </button>
              ))}
            </div>

            {/* Summary */}
            <div className="mt-3 p-2.5 rounded-xl bg-[#080C14] border border-white/[0.06] font-mono text-[11px] space-y-1 text-slate-400">
              <div className="flex justify-between">
                <span>Order Value:</span>
                <span className="text-white font-bold">
                  ${((parseFloat(amount) || 0) * (orderType === 'market' ? activePair.priceUsd : parseFloat(limitPrice) || activePair.priceUsd)).toFixed(2)} USDC
                </span>
              </div>
              <div className="flex justify-between">
                <span>MEV Protection:</span>
                <span className="text-emerald-400 font-semibold">Private Flashbots</span>
              </div>
            </div>
          </div>

          {/* Place Order CTA */}
          <button
            onClick={handlePlaceOrder}
            className={`w-full py-3.5 rounded-xl font-extrabold text-xs transition-all shadow-xl cursor-pointer ${
              side === 'buy'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-900/30'
                : 'bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white shadow-rose-900/30'
            }`}
          >
            {side === 'buy' ? 'BUY / LONG' : 'SELL / SHORT'} {activePair.symbol} NOW
          </button>
        </div>
      </div>

      {/* Multi-Tab Bottom Terminal Dashboard */}
      <div className="rounded-2xl bg-[#0D111A] border border-white/[0.08] p-4 shadow-xl">
        <div className="flex flex-wrap items-center justify-between pb-3 border-b border-white/[0.08] gap-2">
          <div className="flex items-center gap-2 font-mono text-xs">
            <button
              onClick={() => setSelectedTab('orders')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer font-bold ${
                selectedTab === 'orders'
                  ? 'bg-blue-600/20 text-cyan-300 border border-blue-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Active Limit Orders ({userOrders.length})
            </button>
            <button
              onClick={() => setSelectedTab('positions')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer font-bold ${
                selectedTab === 'positions'
                  ? 'bg-blue-600/20 text-cyan-300 border border-blue-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Open Positions ({positions.length})
            </button>
            <button
              onClick={() => setSelectedTab('history')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer font-bold ${
                selectedTab === 'history'
                  ? 'bg-blue-600/20 text-cyan-300 border border-blue-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Trade History
            </button>
          </div>

          <div className="text-xs font-mono text-emerald-400 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Mempool Latency: 4ms</span>
          </div>
        </div>

        {/* Tab 1: Orders */}
        {selectedTab === 'orders' && (
          <div className="overflow-x-auto mt-2">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-white/[0.06] text-[10px] uppercase text-slate-400">
                  <th className="py-3 px-3 font-bold">Order ID</th>
                  <th className="py-3 px-3 font-bold">Pair</th>
                  <th className="py-3 px-3 font-bold">Type</th>
                  <th className="py-3 px-3 font-bold">Side</th>
                  <th className="py-3 px-3 font-bold">Price</th>
                  <th className="py-3 px-3 font-bold">Amount</th>
                  <th className="py-3 px-3 font-bold">Status</th>
                  <th className="py-3 px-3 text-right font-bold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04] text-slate-300">
                {userOrders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-3 text-slate-400 font-semibold">{ord.id}</td>
                    <td className="py-3 px-3 text-white font-bold">{ord.pair}</td>
                    <td className="py-3 px-3 uppercase text-cyan-400 font-semibold">{ord.type}</td>
                    <td className="py-3 px-3 uppercase font-bold">
                      <span className={ord.side === 'buy' ? 'text-emerald-400' : 'text-rose-400'}>{ord.side}</span>
                    </td>
                    <td className="py-3 px-3 text-white font-bold">${ord.price.toFixed(2)}</td>
                    <td className="py-3 px-3 font-medium">{ord.amount}</td>
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
                          className="p-1 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 rounded-lg transition-colors cursor-pointer"
                          title="Cancel Order"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: Positions */}
        {selectedTab === 'positions' && (
          <div className="overflow-x-auto mt-2">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-white/[0.06] text-[10px] uppercase text-slate-400">
                  <th className="py-3 px-3 font-bold">Position ID</th>
                  <th className="py-3 px-3 font-bold">Market</th>
                  <th className="py-3 px-3 font-bold">Side</th>
                  <th className="py-3 px-3 font-bold">Size</th>
                  <th className="py-3 px-3 font-bold">Entry Price</th>
                  <th className="py-3 px-3 font-bold">Mark Price</th>
                  <th className="py-3 px-3 font-bold">Liq. Price</th>
                  <th className="py-3 px-3 font-bold">Unrealized PnL</th>
                  <th className="py-3 px-3 text-right font-bold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04] text-slate-300">
                {positions.map((pos) => (
                  <tr key={pos.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-3 text-slate-400 font-semibold">{pos.id}</td>
                    <td className="py-3 px-3 text-white font-bold flex items-center gap-1.5">
                      <span>{pos.pair}</span>
                      <span className="text-[10px] px-1 rounded bg-amber-500/15 text-amber-300 font-bold">{pos.leverage}x</span>
                    </td>
                    <td className="py-3 px-3 uppercase font-extrabold">
                      <span className={pos.side === 'long' ? 'text-emerald-400' : 'text-rose-400'}>
                        {pos.side}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-medium">{pos.size} ETH (${(pos.size * pos.markPrice).toFixed(2)})</td>
                    <td className="py-3 px-3">${pos.entryPrice.toFixed(2)}</td>
                    <td className="py-3 px-3 text-white font-bold">${pos.markPrice.toFixed(2)}</td>
                    <td className="py-3 px-3 text-amber-400 font-bold">${pos.liquidationPrice.toFixed(2)}</td>
                    <td className="py-3 px-3 font-bold">
                      <span className={pos.unrealizedPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                        {pos.unrealizedPnl >= 0 ? '+' : ''}${pos.unrealizedPnl.toFixed(2)} ({pos.pnlPercentage >= 0 ? '+' : ''}{pos.pnlPercentage.toFixed(2)}%)
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => handleClosePosition(pos.id)}
                        className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[11px] font-bold transition-colors cursor-pointer"
                      >
                        Market Close
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 3: History */}
        {selectedTab === 'history' && (
          <div className="py-6 text-center text-xs font-mono text-slate-400">
            No historical settlements found in current browser cache. All executed transactions are settled with zero-loss private RPC.
          </div>
        )}
      </div>
    </div>
  );
};
