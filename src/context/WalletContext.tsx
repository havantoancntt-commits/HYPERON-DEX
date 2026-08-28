import React, { createContext, useContext, useState, useEffect } from 'react';
import { ChainId, Token, TransactionHistoryItem } from '../types';
import { SUPPORTED_CHAINS, VERIFIED_TOKENS } from '../lib/constants';

interface WalletContextType {
  isConnected: boolean;
  address: string;
  chainId: ChainId;
  walletType: 'metamask' | 'coinbase' | 'walletconnect' | 'demo' | null;
  balances: Record<string, number>; // token symbol -> balance
  isDemoMode: boolean;
  transactions: TransactionHistoryItem[];
  slippage: number;
  mevProtected: boolean;
  gasSpeed: 'standard' | 'fast' | 'instant';
  connectWallet: (type: 'metamask' | 'coinbase' | 'walletconnect' | 'demo') => Promise<void>;
  disconnectWallet: () => void;
  switchChain: (newChainId: ChainId) => Promise<void>;
  setSlippage: (slippage: number) => void;
  setMevProtected: (enabled: boolean) => void;
  setGasSpeed: (speed: 'standard' | 'fast' | 'instant') => void;
  toggleDemoMode: () => void;
  executeTransaction: (tx: Omit<TransactionHistoryItem, 'id' | 'timestamp' | 'status' | 'txHash' | 'blockNumber' | 'correlationId'>) => Promise<TransactionHistoryItem>;
  revokeApproval: (tokenSymbol: string) => Promise<void>;
  tokenApprovals: Record<string, boolean>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [address, setAddress] = useState<string>('0x71C28B...9E42');
  const [chainId, setChainId] = useState<ChainId>('ethereum');
  const [walletType, setWalletType] = useState<'metamask' | 'coinbase' | 'walletconnect' | 'demo' | null>('demo');
  const [isDemoMode, setIsDemoMode] = useState<boolean>(true);
  const [slippage, setSlippage] = useState<number>(0.5);
  const [mevProtected, setMevProtected] = useState<boolean>(true);
  const [gasSpeed, setGasSpeed] = useState<'standard' | 'fast' | 'instant'>('fast');

  const [balances, setBalances] = useState<Record<string, number>>({
    ETH: 4.85,
    USDC: 14250.00,
    USDT: 5600.00,
    WBTC: 0.38,
    UNI: 240.00,
    AETH: 2500.00,
    LINK: 120.00,
    AAVE: 15.00,
    ARB: 850.00,
    OP: 420.00,
    BNB: 3.50,
    POL: 1200.00,
  });

  const [tokenApprovals, setTokenApprovals] = useState<Record<string, boolean>>({
    USDC: true,
    USDT: true,
    UNI: true,
    AETH: true,
    WBTC: false,
    LINK: false,
  });

  const [transactions, setTransactions] = useState<TransactionHistoryItem[]>([
    {
      id: 'tx-init-1',
      txHash: '0x8f7d92c81a5e0b3c4d7f12e9b0a8c4f2e6a3d9b1c7e5a0f8b4c2e6d9a1b3c5e7',
      chainId: 'ethereum',
      type: 'SWAP',
      status: 'confirmed',
      fromToken: 'ETH',
      toToken: 'AETH',
      fromAmount: 1.5,
      toAmount: 1062.5,
      gasSpentGwei: 18,
      gasSpentUsd: 3.85,
      timestamp: Date.now() - 3600000 * 2,
      blockNumber: 19842050,
      correlationId: 'CORR-9921-AETH',
    },
    {
      id: 'tx-init-2',
      txHash: '0x3c5e7a9b1c7e5a0f8b4c2e6d9a1b3c5e78f7d92c81a5e0b3c4d7f12e9b0a8c4f',
      chainId: 'ethereum',
      type: 'STAKE',
      status: 'confirmed',
      fromToken: 'AETH',
      fromAmount: 2500,
      gasSpentGwei: 21,
      gasSpentUsd: 4.40,
      timestamp: Date.now() - 86400000 * 3,
      blockNumber: 19821900,
      correlationId: 'CORR-8812-STAKE',
    },
  ]);

  const connectWallet = async (type: 'metamask' | 'coinbase' | 'walletconnect' | 'demo') => {
    if (type === 'metamask' && typeof window !== 'undefined' && (window as any).ethereum) {
      try {
        const accounts = await (window as any).ethereum.request({ method: 'eth_requestAccounts' });
        if (accounts && accounts[0]) {
          setAddress(accounts[0]);
          setIsConnected(true);
          setWalletType('metamask');
          setIsDemoMode(false);
          return;
        }
      } catch (err) {
        console.warn('Injected wallet connection failed or rejected by user:', err);
      }
    }
    // Demo / Testnet wallet fallback
    setWalletType(type);
    setIsConnected(true);
    setAddress('0x71C28B932F99B52EDb3C0257B4393608F79E9E42');
  };

  const disconnectWallet = () => {
    setIsConnected(false);
    setWalletType(null);
  };

  const switchChain = async (newChainId: ChainId) => {
    setChainId(newChainId);
  };

  const toggleDemoMode = () => {
    setIsDemoMode((prev) => !prev);
  };

  const executeTransaction = async (
    txData: Omit<TransactionHistoryItem, 'id' | 'timestamp' | 'status' | 'txHash' | 'blockNumber' | 'correlationId'>
  ): Promise<TransactionHistoryItem> => {
    const randomHash = `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;
    const correlationId = `CORR-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // Update balances locally for immediate realistic user state
    if (txData.type === 'SWAP' && txData.fromToken && txData.toToken && txData.fromAmount && txData.toAmount) {
      setBalances((prev) => ({
        ...prev,
        [txData.fromToken!]: Math.max(0, (prev[txData.fromToken!] || 0) - txData.fromAmount!),
        [txData.toToken!]: (prev[txData.toToken!] || 0) + txData.toAmount!,
      }));
    }

    const newTx: TransactionHistoryItem = {
      ...txData,
      id: `tx-${Date.now()}`,
      txHash: randomHash,
      timestamp: Date.now(),
      status: 'confirmed',
      blockNumber: Math.floor(Math.random() * 1000) + 19842100,
      correlationId,
    };

    setTransactions((prev) => [newTx, ...prev]);
    return newTx;
  };

  const revokeApproval = async (tokenSymbol: string) => {
    setTokenApprovals((prev) => ({
      ...prev,
      [tokenSymbol]: false,
    }));
  };

  return (
    <WalletContext.Provider
      value={{
        isConnected,
        address,
        chainId,
        walletType,
        balances,
        isDemoMode,
        transactions,
        slippage,
        mevProtected,
        gasSpeed,
        connectWallet,
        disconnectWallet,
        switchChain,
        setSlippage,
        setMevProtected,
        setGasSpeed,
        toggleDemoMode,
        executeTransaction,
        revokeApproval,
        tokenApprovals,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = (): WalletContextType => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};
