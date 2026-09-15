import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { createPublicClient, http, formatEther, Address } from 'viem';
import { mainnet, base, arbitrum, optimism, bsc, polygon } from 'viem/chains';
import { ChainId, TransactionHistoryItem } from '../types';
import { SUPPORTED_CHAINS } from '../lib/constants';

export type SupportedWalletType = 'metamask' | 'coinbase' | 'walletconnect' | 'phantom' | 'injected' | 'sandbox' | null;

interface WalletContextType {
  isConnected: boolean;
  address: string;
  chainId: ChainId;
  walletType: SupportedWalletType;
  balances: Record<string, number>;
  isDemoMode: boolean;
  transactions: TransactionHistoryItem[];
  slippage: number;
  mevProtected: boolean;
  gasSpeed: 'standard' | 'fast' | 'instant';
  isConnectModalOpen: boolean;
  isAccountModalOpen: boolean;
  isSiweAuthenticated: boolean;
  siweSession: { address: string; nonce: string; verifiedAt: number } | null;
  openConnectModal: () => void;
  closeConnectModal: () => void;
  openAccountModal: () => void;
  closeAccountModal: () => void;
  connectWallet: (type?: SupportedWalletType | 'demo') => Promise<void>;
  disconnectWallet: () => void;
  switchChain: (newChainId: ChainId) => Promise<void>;
  authenticateSiwe: () => Promise<boolean>;
  requestFaucetFunds: (tokenSymbol: string, amount: number) => void;
  resetBalances: () => void;
  setSlippage: (slippage: number) => void;
  setMevProtected: (enabled: boolean) => void;
  setGasSpeed: (speed: 'standard' | 'fast' | 'instant') => void;
  toggleDemoMode: () => void;
  executeTransaction: (
    tx: Omit<TransactionHistoryItem, 'id' | 'timestamp' | 'status' | 'txHash' | 'blockNumber' | 'correlationId'>
  ) => Promise<TransactionHistoryItem>;
  revokeApproval: (tokenSymbol: string) => Promise<void>;
  tokenApprovals: Record<string, boolean>;
  refreshBalances: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

const CHAIN_MAP = {
  ethereum: mainnet,
  base,
  arbitrum,
  optimism,
  bsc,
  polygon,
};

const HEX_CHAIN_TO_ID: Record<string, ChainId> = {
  '0x1': 'ethereum',
  '0x2105': 'base',
  '0xa4b1': 'arbitrum',
  '0xa': 'optimism',
  '0x38': 'bsc',
  '0x89': 'polygon',
};

const INITIAL_BALANCES: Record<string, number> = {
  ETH: 4.85,
  USDC: 14250.0,
  USDT: 5600.0,
  WBTC: 0.38,
  UNI: 240.0,
  HYPR: 2500.0,
  AETH: 2500.0,
  LINK: 120.0,
  AAVE: 15.0,
  ARB: 850.0,
  OP: 420.0,
  BNB: 3.5,
  POL: 1200.0,
};

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('hyperon_wallet_connected') === 'true';
    }
    return false;
  });
  const [address, setAddress] = useState<string>(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('hyperon_wallet_connected') === 'true') {
      return localStorage.getItem('hyperon_wallet_address') || '0x71C28B932F99B52EDb3C0257B4393608F79E9E42';
    }
    return '';
  });
  const [chainId, setChainId] = useState<ChainId>('ethereum');
  const [walletType, setWalletType] = useState<SupportedWalletType>(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('hyperon_wallet_connected') === 'true') {
      return (localStorage.getItem('hyperon_wallet_type') as SupportedWalletType) || 'sandbox';
    }
    return null;
  });
  const [isDemoMode, setIsDemoMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('hyperon_wallet_type') === 'sandbox';
    }
    return false;
  });
  const [slippage, setSlippage] = useState<number>(0.5);
  const [mevProtected, setMevProtected] = useState<boolean>(true);
  const [gasSpeed, setGasSpeed] = useState<'standard' | 'fast' | 'instant'>('fast');
  const [isConnectModalOpen, setIsConnectModalOpen] = useState<boolean>(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState<boolean>(false);
  const [isSiweAuthenticated, setIsSiweAuthenticated] = useState<boolean>(false);
  const [siweSession, setSiweSession] = useState<{ address: string; nonce: string; verifiedAt: number } | null>(null);

  const [balances, setBalances] = useState<Record<string, number>>({ ...INITIAL_BALANCES });

  const [tokenApprovals, setTokenApprovals] = useState<Record<string, boolean>>({
    USDC: true,
    USDT: true,
    UNI: true,
    HYPR: true,
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
      toToken: 'HYPR',
      fromAmount: 1.5,
      toAmount: 1062.5,
      gasSpentGwei: 18,
      gasSpentUsd: 3.85,
      timestamp: Date.now() - 3600000 * 2,
      blockNumber: 21948200,
      correlationId: 'CORR-9921-HYPR',
    },
  ]);

  const openConnectModal = useCallback(() => setIsConnectModalOpen(true), []);
  const closeConnectModal = useCallback(() => setIsConnectModalOpen(false), []);
  const openAccountModal = useCallback(() => setIsAccountModalOpen(true), []);
  const closeAccountModal = useCallback(() => setIsAccountModalOpen(false), []);

  // Query live on-chain balance when an injected wallet is connected
  const refreshBalances = useCallback(async () => {
    if (!address || !address.startsWith('0x') || address.length !== 42) return;

    try {
      const targetChain = CHAIN_MAP[chainId] || mainnet;
      const client = createPublicClient({
        chain: targetChain,
        transport: http(),
      });

      const nativeBalance = await client.getBalance({ address: address as Address });
      const ethVal = parseFloat(formatEther(nativeBalance));

      if (!isNaN(ethVal) && ethVal > 0) {
        setBalances((prev) => ({
          ...prev,
          ETH: ethVal,
        }));
      }
    } catch {
      // In sandbox mode or RPC failover, retain initialized balances
    }
  }, [address, chainId]);

  useEffect(() => {
    refreshBalances();
  }, [refreshBalances]);

  // Subscribe to EIP-1193 Web3 provider events (accountsChanged, chainChanged, disconnect)
  useEffect(() => {
    if (typeof window === 'undefined' || !(window as any).ethereum) return;
    const provider = (window as any).ethereum;

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts && accounts.length > 0) {
        setAddress(accounts[0]);
        setIsConnected(true);
        setIsSiweAuthenticated(false);
        setSiweSession(null);
        refreshBalances();
      } else {
        // User locked or disconnected their wallet
        setIsConnected(false);
        setWalletType(null);
        setIsSiweAuthenticated(false);
        setSiweSession(null);
      }
    };

    const handleChainChanged = (chainHex: string) => {
      const detectedChainId = HEX_CHAIN_TO_ID[chainHex.toLowerCase()];
      if (detectedChainId) {
        setChainId(detectedChainId);
        refreshBalances();
      }
    };

    const handleDisconnect = () => {
      setIsConnected(false);
      setWalletType(null);
      setIsSiweAuthenticated(false);
      setSiweSession(null);
    };

    try {
      provider.on?.('accountsChanged', handleAccountsChanged);
      provider.on?.('chainChanged', handleChainChanged);
      provider.on?.('disconnect', handleDisconnect);

      // Check initially connected accounts
      provider
        .request({ method: 'eth_accounts' })
        .then((accounts: string[]) => {
          if (accounts && accounts.length > 0) {
            setAddress(accounts[0]);
            setIsConnected(true);
            setWalletType('injected');
            setIsDemoMode(false);
          }
        })
        .catch(() => {});
    } catch {
      // Ignore provider initialization errors
    }

    return () => {
      try {
        provider.removeListener?.('accountsChanged', handleAccountsChanged);
        provider.removeListener?.('chainChanged', handleChainChanged);
        provider.removeListener?.('disconnect', handleDisconnect);
      } catch {
        // Ignore teardown errors
      }
    };
  }, [refreshBalances]);

  const connectWallet = async (type: SupportedWalletType | 'demo' = 'injected') => {
    if (type === 'sandbox' || type === 'demo') {
      setWalletType('sandbox');
      setIsConnected(true);
      setAddress('0x71C28B932F99B52EDb3C0257B4393608F79E9E42');
      setIsDemoMode(true);
      if (typeof window !== 'undefined') {
        localStorage.setItem('hyperon_wallet_connected', 'true');
        localStorage.setItem('hyperon_wallet_address', '0x71C28B932F99B52EDb3C0257B4393608F79E9E42');
        localStorage.setItem('hyperon_wallet_type', 'sandbox');
      }
      closeConnectModal();
      return;
    }

    if (typeof window !== 'undefined' && (window as any).ethereum) {
      try {
        const accounts = await (window as any).ethereum.request({
          method: 'eth_requestAccounts',
        });
        if (accounts && accounts[0]) {
          setAddress(accounts[0]);
          setIsConnected(true);
          const resolvedType: SupportedWalletType = type === 'metamask' 
            ? 'metamask' 
            : type === 'coinbase' 
            ? 'coinbase' 
            : type === 'phantom' 
            ? 'phantom' 
            : 'injected';
          setWalletType(resolvedType);
          setIsDemoMode(false);
          if (typeof window !== 'undefined') {
            localStorage.setItem('hyperon_wallet_connected', 'true');
            localStorage.setItem('hyperon_wallet_address', accounts[0]);
            localStorage.setItem('hyperon_wallet_type', resolvedType);
          }
          closeConnectModal();
          await refreshBalances();
          return;
        }
      } catch (err: any) {
        console.warn('User rejected injected Web3 connection, falling back to sandbox mode:', err);
        throw new Error(err?.message || 'Connection request rejected by user');
      }
    }

    // Explicit fallback to non-custodial institutional sandbox
    setWalletType('sandbox');
    setIsConnected(true);
    setAddress('0x71C28B932F99B52EDb3C0257B4393608F79E9E42');
    if (typeof window !== 'undefined') {
      localStorage.setItem('hyperon_wallet_connected', 'true');
      localStorage.setItem('hyperon_wallet_address', '0x71C28B932F99B52EDb3C0257B4393608F79E9E42');
      localStorage.setItem('hyperon_wallet_type', 'sandbox');
    }
    closeConnectModal();
  };

  const disconnectWallet = () => {
    setIsConnected(false);
    setWalletType(null);
    setAddress('');
    setIsSiweAuthenticated(false);
    setSiweSession(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('hyperon_wallet_connected');
      localStorage.removeItem('hyperon_wallet_address');
      localStorage.removeItem('hyperon_wallet_type');
    }
    closeAccountModal();
  };

  const switchChain = async (newChainId: ChainId) => {
    setChainId(newChainId);
    if (typeof window !== 'undefined' && (window as any).ethereum && walletType !== 'sandbox') {
      const chainConfig = SUPPORTED_CHAINS[newChainId];
      const chainHex = `0x${(newChainId === 'ethereum' ? 1 : newChainId === 'base' ? 8453 : newChainId === 'arbitrum' ? 42161 : newChainId === 'optimism' ? 10 : newChainId === 'bsc' ? 56 : 137).toString(16)}`;
      try {
        await (window as any).ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: chainHex }],
        });
      } catch (switchError: any) {
        if (switchError.code === 4902 && chainConfig) {
          try {
            await (window as any).ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [
                {
                  chainId: chainHex,
                  chainName: chainConfig.name,
                  nativeCurrency: chainConfig.nativeCurrency,
                  rpcUrls: [chainConfig.rpcUrl],
                  blockExplorerUrls: [chainConfig.explorerUrl],
                },
              ],
            });
          } catch (addError) {
            console.warn('Failed to add chain to wallet:', addError);
          }
        }
      }
    }
  };

  const authenticateSiwe = async (): Promise<boolean> => {
    try {
      // Step 1: Request fresh cryptographic nonce from backend
      const nonceRes = await fetch(`/api/auth/nonce?address=${address}&chainId=1`);
      let nonce = '';
      if (nonceRes.ok) {
        const data = await nonceRes.json();
        nonce = data.nonce;
      }
      if (!nonce) {
        nonce = `0x${Date.now().toString(16)}${Math.random().toString(16).substring(2, 10)}`;
      }

      const domain = typeof window !== 'undefined' ? window.location.host : 'hyperon.dex';
      const issuedAt = new Date().toISOString();
      const siweMessage = `${domain} wants you to sign in with your Ethereum account:\n${address}\n\nSign in with Ethereum to authenticate with HYPERON-DEX Non-Custodial Engine.\n\nURI: https://${domain}\nVersion: 1\nChain ID: 1\nNonce: ${nonce}\nIssued At: ${issuedAt}`;

      if (typeof window !== 'undefined' && (window as any).ethereum && walletType !== 'sandbox') {
        await (window as any).ethereum.request({
          method: 'personal_sign',
          params: [siweMessage, address],
        });
      }

      setIsSiweAuthenticated(true);
      setSiweSession({
        address,
        nonce,
        verifiedAt: Date.now(),
      });
      return true;
    } catch (err) {
      console.warn('SIWE Authentication failed:', err);
      return false;
    }
  };

  const requestFaucetFunds = (tokenSymbol: string, amount: number) => {
    setBalances((prev) => ({
      ...prev,
      [tokenSymbol]: (prev[tokenSymbol] || 0) + amount,
    }));
  };

  const resetBalances = () => {
    setBalances({ ...INITIAL_BALANCES });
  };

  const toggleDemoMode = () => {
    setIsDemoMode((prev) => !prev);
  };

  const executeTransaction = async (
    txData: Omit<TransactionHistoryItem, 'id' | 'timestamp' | 'status' | 'txHash' | 'blockNumber' | 'correlationId'>
  ): Promise<TransactionHistoryItem> => {
    const randomHex = typeof crypto !== 'undefined' && crypto.getRandomValues
      ? Array.from(crypto.getRandomValues(new Uint8Array(4))).map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase()
      : Date.now().toString(16).toUpperCase();
    const correlationId = `CORR-${randomHex}`;

    let txHash = '';
    if (typeof window !== 'undefined' && (window as any).ethereum && walletType !== 'sandbox') {
      try {
        const hash = await (window as any).ethereum.request({
          method: 'eth_sendTransaction',
          params: [
            {
              from: address,
              to: txData.targetAddress || '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
              value: txData.valueHex || '0x0',
              data: txData.calldata || '0x',
            },
          ],
        });
        if (hash) {
          txHash = hash;
        }
      } catch (err: any) {
        if (err?.code === 4001) {
          throw new Error('User rejected the transaction signature request.');
        }
        throw new Error(err?.message || 'Transaction submission failed on injected wallet.');
      }
    }

    if (!txHash) {
      if (walletType !== 'sandbox') {
        throw new Error('Transaction submission failed: no valid transaction hash returned by wallet provider.');
      }
      txHash = `0x${Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')}`;
    }

    let currentBlock = 0;
    try {
      if (typeof window !== 'undefined' && (window as any).ethereum) {
        const blockHex = await (window as any).ethereum.request({ method: 'eth_blockNumber' });
        currentBlock = parseInt(blockHex, 16);
      }
      if (!currentBlock) {
        const healthRes = await fetch('/api/health');
        if (healthRes.ok) {
          const hData = await healthRes.json();
          currentBlock = hData.latestBlock || 0;
        }
      }
    } catch {
      currentBlock = 0;
    }

    // Deduct / credit state balances
    if ((txData.type === 'SWAP' || txData.type === 'BRIDGE') && txData.fromToken && txData.toToken && txData.fromAmount && txData.toAmount) {
      setBalances((prev) => ({
        ...prev,
        [txData.fromToken!]: Math.max(0, (prev[txData.fromToken!] || 0) - txData.fromAmount!),
        [txData.toToken!]: (prev[txData.toToken!] || 0) + txData.toAmount!,
      }));
    } else if ((txData.type === 'SUPPLY' || txData.type === 'STAKE' || txData.type === 'REPAY') && txData.fromToken && txData.fromAmount) {
      setBalances((prev) => ({
        ...prev,
        [txData.fromToken!]: Math.max(0, (prev[txData.fromToken!] || 0) - txData.fromAmount!),
      }));
    } else if ((txData.type === 'BORROW' || txData.type === 'WITHDRAW_LENDING' || txData.type === 'CLAIM_REWARDS') && txData.toToken && txData.toAmount) {
      setBalances((prev) => ({
        ...prev,
        [txData.toToken!]: (prev[txData.toToken!] || 0) + txData.toAmount!,
      }));
    } else if (txData.type === 'RESTAKE' && txData.fromToken && txData.toToken && txData.fromAmount && txData.toAmount) {
      setBalances((prev) => ({
        ...prev,
        [txData.fromToken!]: Math.max(0, (prev[txData.fromToken!] || 0) - txData.fromAmount!),
        [txData.toToken!]: (prev[txData.toToken!] || 0) + txData.toAmount!,
      }));
    }

    const newTx: TransactionHistoryItem = {
      ...txData,
      id: `tx-${Date.now()}`,
      txHash,
      timestamp: Date.now(),
      status: 'confirmed',
      blockNumber: currentBlock > 0 ? currentBlock : undefined,
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
        isConnectModalOpen,
        isAccountModalOpen,
        isSiweAuthenticated,
        siweSession,
        openConnectModal,
        closeConnectModal,
        openAccountModal,
        closeAccountModal,
        connectWallet,
        disconnectWallet,
        switchChain,
        authenticateSiwe,
        requestFaucetFunds,
        resetBalances,
        setSlippage,
        setMevProtected,
        setGasSpeed,
        toggleDemoMode,
        executeTransaction,
        revokeApproval,
        tokenApprovals,
        refreshBalances,
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
