import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Token, SwapQuote, TransactionSimulation, LivePriceData, AITradingSignal } from '../types';
import { VERIFIED_TOKENS } from '../lib/constants';

export type ProductView =
  | 'dashboard'
  | 'ai-signals'
  | 'swap'
  | 'perpetuals'
  | 'trade'
  | 'markets'
  | 'token-details'
  | 'portfolio'
  | 'launchpad'
  | 'onchain-radar'
  | 'wallet'
  | 'liquidity'
  | 'staking'
  | 'payments'
  | 'ai-intelligence'
  | 'ai-risk-scanner'
  | 'ai-copilot'
  | 'ai-agent'
  | 'cross-chain'
  | 'transactions'
  | 'watchlist'
  | 'alerts'
  | 'security-center'
  | 'developer-api'
  | 'admin-console'
  | 'settings';

export interface ToastMessage {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'warning' | 'error' | 'info';
  timestamp: number;
}

interface ExchangeContextType {
  activeView: ProductView;
  setActiveView: (view: ProductView) => void;
  selectedToken: Token;
  setSelectedToken: (token: Token) => void;
  selectedPair: { base: Token; quote: Token };
  setSelectedPair: (pair: { base: Token; quote: Token }) => void;
  selectedSignal: AITradingSignal | null;
  setSelectedSignal: (signal: AITradingSignal | null) => void;
  watchlist: string[]; // token symbols
  toggleWatchlist: (symbol: string) => void;
  toasts: ToastMessage[];
  addToast: (toast: Omit<ToastMessage, 'id' | 'timestamp'>) => void;
  removeToast: (id: string) => void;
  activeSimulation: TransactionSimulation | null;
  setActiveSimulation: (sim: TransactionSimulation | null) => void;
  activeQuote: SwapQuote | null;
  setActiveQuote: (quote: SwapQuote | null) => void;
  openSwapWithTokens: (fromSymbol: string, toSymbol: string) => void;
  openTokenScannerWithAddress: (address: string, symbol: string) => void;
  openPerpetualsWithSignal: (signal: AITradingSignal) => void;
  openSwapWithSignal: (signal: AITradingSignal) => void;
  // Real-time price oracle state
  livePrices: Record<string, LivePriceData>;
  liveTokens: Token[];
  getLiveToken: (symbol: string) => Token;
  getLivePrice: (symbol: string) => number;
  lastPriceUpdate: number;
  isPriceLive: boolean;
  tickDirections: Record<string, 'up' | 'down' | 'same'>;
}

const ExchangeContext = createContext<ExchangeContextType | undefined>(undefined);

export const ExchangeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeView, setActiveView] = useState<ProductView>('dashboard');
  const [selectedToken, setSelectedToken] = useState<Token>(VERIFIED_TOKENS[0]);
  const [selectedPair, setSelectedPair] = useState<{ base: Token; quote: Token }>({
    base: VERIFIED_TOKENS[0], // ETH
    quote: VERIFIED_TOKENS[1], // USDC
  });
  const [watchlist, setWatchlist] = useState<string[]>(['ETH', 'WBTC', 'HYPR', 'UNI', 'LINK']);
  const [toasts, setToasts] = useState<ToastMessage[]>([
    {
      id: 'welcome-toast',
      title: 'HYPERON DEX Connected',
      message: 'Zero-trust security scanner & Flashbots MEV protection active.',
      type: 'info',
      timestamp: Date.now(),
    },
  ]);
  const [activeSimulation, setActiveSimulation] = useState<TransactionSimulation | null>(null);
  const [activeQuote, setActiveQuote] = useState<SwapQuote | null>(null);
  const [selectedSignal, setSelectedSignal] = useState<AITradingSignal | null>(null);

  // Real-time price tracking state
  const [livePrices, setLivePrices] = useState<Record<string, LivePriceData>>({});
  const [lastPriceUpdate, setLastPriceUpdate] = useState<number>(Date.now());
  const [isPriceLive, setIsPriceLive] = useState<boolean>(true);
  const [tickDirections, setTickDirections] = useState<Record<string, 'up' | 'down' | 'same'>>({});

  // Real-time Polling from Server Price Oracle
  const fetchLivePrices = useCallback(async () => {
    try {
      const res = await fetch('/api/prices/realtime');
      if (res.ok) {
        const data = await res.json();
        if (data.prices) {
          setLivePrices(data.prices);
          setLastPriceUpdate(data.timestamp || Date.now());
          setIsPriceLive(true);

          const ticks: Record<string, 'up' | 'down' | 'same'> = {};
          Object.keys(data.prices).forEach((key) => {
            ticks[key] = data.prices[key].tickDirection || 'same';
          });
          setTickDirections(ticks);
        }
      }
    } catch (err) {
      console.warn('Real-time price fetch standby:', err);
      setIsPriceLive(false);
    }
  }, []);

  useEffect(() => {
    fetchLivePrices();
    const interval = setInterval(fetchLivePrices, 3000);
    return () => clearInterval(interval);
  }, [fetchLivePrices]);

  // Derived live tokens with real-time dynamic pricing
  const liveTokens: Token[] = VERIFIED_TOKENS.map((token) => {
    const live = livePrices[token.symbol];
    if (live) {
      return {
        ...token,
        priceUsd: live.priceUsd,
        change24h: live.change24h,
        volume24h: live.volume24h,
        marketCapUsd: live.marketCapUsd,
      };
    }
    return token;
  });

  const getLiveToken = useCallback(
    (symbol: string): Token => {
      const found = liveTokens.find((t) => t.symbol.toUpperCase() === symbol.toUpperCase());
      if (found) return found;
      const staticFound = VERIFIED_TOKENS.find((t) => t.symbol.toUpperCase() === symbol.toUpperCase());
      if (staticFound) return staticFound;
      return {
        address: '0x0000000000000000000000000000000000000000',
        symbol: symbol.toUpperCase(),
        name: symbol.toUpperCase(),
        decimals: 18,
        chainId: 'ethereum',
        priceUsd: 1.0,
        change24h: 0,
        volume24h: 0,
        liquidityUsd: 0,
        marketCapUsd: 0,
        logoUrl: '',
        category: 'DeFi',
        isVerified: false,
      };
    },
    [liveTokens]
  );

  const getLivePrice = useCallback(
    (symbol: string): number => {
      if (livePrices[symbol]) {
        return livePrices[symbol].priceUsd;
      }
      const token = VERIFIED_TOKENS.find((t) => t.symbol.toUpperCase() === symbol.toUpperCase());
      return token ? token.priceUsd : 1.0;
    },
    [livePrices]
  );

  const toggleWatchlist = (symbol: string) => {
    setWatchlist((prev) =>
      prev.includes(symbol) ? prev.filter((s) => s !== symbol) : [...prev, symbol]
    );
  };

  const addToast = (toast: Omit<ToastMessage, 'id' | 'timestamp'>) => {
    const newToast: ToastMessage = {
      ...toast,
      id: `toast-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      timestamp: Date.now(),
    };
    setToasts((prev) => [newToast, ...prev.slice(0, 5)]);

    setTimeout(() => {
      removeToast(newToast.id);
    }, 6000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const openSwapWithTokens = (fromSymbol: string, toSymbol: string) => {
    const from = getLiveToken(fromSymbol);
    const to = getLiveToken(toSymbol);
    setSelectedPair({ base: from, quote: to });
    setActiveView('swap');
  };

  const openTokenScannerWithAddress = (address: string, symbol: string) => {
    const token = getLiveToken(symbol) || {
      ...VERIFIED_TOKENS[0],
      address,
      symbol,
    };
    setSelectedToken(token);
    setActiveView('ai-risk-scanner');
  };

  const openPerpetualsWithSignal = (signal: AITradingSignal) => {
    setSelectedSignal(signal);
    const token = getLiveToken(signal.symbol);
    const quote = getLiveToken('USDC');
    setSelectedPair({ base: token, quote });
    setActiveView('perpetuals');
  };

  const openSwapWithSignal = (signal: AITradingSignal) => {
    setSelectedSignal(signal);
    const token = getLiveToken(signal.symbol);
    const usdc = getLiveToken('USDC');
    if (signal.direction === 'LONG' || signal.direction === 'BUY') {
      setSelectedPair({ base: usdc, quote: token });
    } else {
      setSelectedPair({ base: token, quote: usdc });
    }
    setActiveView('swap');
  };

  return (
    <ExchangeContext.Provider
      value={{
        activeView,
        setActiveView,
        selectedToken,
        setSelectedToken,
        selectedPair,
        setSelectedPair,
        selectedSignal,
        setSelectedSignal,
        watchlist,
        toggleWatchlist,
        toasts,
        addToast,
        removeToast,
        activeSimulation,
        setActiveSimulation,
        activeQuote,
        setActiveQuote,
        openSwapWithTokens,
        openTokenScannerWithAddress,
        openPerpetualsWithSignal,
        openSwapWithSignal,
        livePrices,
        liveTokens,
        getLiveToken,
        getLivePrice,
        lastPriceUpdate,
        isPriceLive,
        tickDirections,
      }}
    >
      {children}
    </ExchangeContext.Provider>
  );
};

export const useExchange = (): ExchangeContextType => {
  const context = useContext(ExchangeContext);
  if (!context) {
    throw new Error('useExchange must be used within an ExchangeProvider');
  }
  return context;
};
