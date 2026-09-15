import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { createPublicClient, http, formatEther, Address } from 'viem';
import { mainnet, base, arbitrum, optimism, bsc, polygon } from 'viem/chains';
import { ChainId, TransactionHistoryItem } from '../types';
import { SUPPORTED_CHAINS } from '../lib/constants';

export type SupportedWalletType =
  | 'metamask'
  | 'coinbase'
  | 'rabby'
  | 'phantom'
  | 'okx'
  | 'trust'
  | 'rainbow'
  | 'bitget'
  | 'walletconnect'
  | 'injected'
  | 'sandbox'
  | null;

export interface EIP6963ProviderInfo {
  uuid: string;
  name: string;
  icon: string;
  rdns: string;
}

export interface EIP6963ProviderDetail {
  info: EIP6963ProviderInfo;
  provider: any;
}

export interface SandboxAccount {
  address: string;
  name: string;
  tag: string;
  balances: Record<string, number>;
}

export interface RecentWalletAccount {
  type: SupportedWalletType;
  address: string;
  name?: string;
  lastConnected: number;
}

interface WalletContextType {
  isConnected: boolean;
  address: string;
  chainId: ChainId;
  walletType: SupportedWalletType;
  balances: Record<string, number>;
  isDemoMode: boolean;
  isWatchOnly: boolean;
  transactions: TransactionHistoryItem[];
  slippage: number;
  mevProtected: boolean;
  gasSpeed: 'standard' | 'fast' | 'instant';
  isConnectModalOpen: boolean;
  isAccountModalOpen: boolean;
  isSiweAuthenticated: boolean;
  siweSession: { address: string; nonce: string; verifiedAt: number } | null;
  discoveredProviders: EIP6963ProviderDetail[];
  sandboxAccounts: SandboxAccount[];
  activeSandboxIndex: number;
  recentAccounts: RecentWalletAccount[];
  switchSandboxAccount: (index: number) => void;
  openConnectModal: () => void;
  closeConnectModal: () => void;
  openAccountModal: () => void;
  closeAccountModal: () => void;
  connectWallet: (type?: SupportedWalletType | 'demo', customProvider?: any) => Promise<void>;
  switchWallet: (type: SupportedWalletType | 'demo', customProvider?: any) => Promise<void>;
  disconnectWallet: (options?: { zeroTrust?: boolean }) => Promise<void>;
  impersonateAddress: (address: string, label?: string) => void;
  removeRecentAccount: (address: string) => void;
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
  approveToken: (tokenSymbol: string) => Promise<void>;
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

export const SANDBOX_PROFILES: SandboxAccount[] = [
  {
    address: '0x71C28B932F99B52EDb3C0257B4393608F79E9E42',
    name: 'Whale Institutional Account',
    tag: 'Primary Vault',
    balances: {
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
    },
  },
  {
    address: '0x3bF98b2512F9882Fe79870A92b8F6fFf4d92415A',
    name: 'Arbitrage Strategy Fund',
    tag: 'High-Frequency Trader',
    balances: {
      ETH: 12.50,
      USDC: 50000.0,
      USDT: 35000.0,
      WBTC: 1.25,
      UNI: 1200.0,
      HYPR: 10000.0,
      AETH: 5000.0,
      LINK: 500.0,
      AAVE: 85.0,
      ARB: 4500.0,
      OP: 2500.0,
      BNB: 15.0,
      POL: 8000.0,
    },
  },
  {
    address: '0xA82136eF73b64E1A9D490E00cEb22Ec944520786',
    name: 'Fresh Testnet Deployer',
    tag: 'Clean Slate Wallet',
    balances: {
      ETH: 0.50,
      USDC: 250.0,
      USDT: 100.0,
      WBTC: 0.0,
      UNI: 0.0,
      HYPR: 100.0,
      AETH: 0.0,
      LINK: 10.0,
      AAVE: 0.0,
      ARB: 50.0,
      OP: 25.0,
      BNB: 0.1,
      POL: 50.0,
    },
  },
];

const INITIAL_BALANCES: Record<string, number> = { ...SANDBOX_PROFILES[0].balances };

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeSandboxIndex, setActiveSandboxIndex] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('hyperon_wallet_sandbox_idx');
      return saved ? parseInt(saved, 10) || 0 : 0;
    }
    return 0;
  });

  const [isConnected, setIsConnected] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('hyperon_wallet_connected') === 'true';
    }
    return false;
  });

  const [address, setAddress] = useState<string>(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('hyperon_wallet_connected') === 'true') {
      return localStorage.getItem('hyperon_wallet_address') || SANDBOX_PROFILES[0].address;
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

  const [isWatchOnly, setIsWatchOnly] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('hyperon_wallet_type') === 'watch_only';
    }
    return false;
  });

  const [recentAccounts, setRecentAccounts] = useState<RecentWalletAccount[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('hyperon_recent_accounts');
        if (saved) return JSON.parse(saved);
      } catch {
        // Fallback
      }
    }
    return [
      {
        type: 'sandbox',
        address: '0x853d955aCEf9923D26924490B60824b4231E7938',
        name: 'Institutional Whale (5.85 ETH)',
        lastConnected: Date.now() - 3600000 * 5,
      },
      {
        type: 'sandbox',
        address: '0x43a8B966A068b556D6c167d4Fec7fa833190E7A6',
        name: 'Arbitrage HFT Strategy',
        lastConnected: Date.now() - 3600000 * 24,
      },
    ];
  });

  const [slippage, setSlippage] = useState<number>(0.5);
  const [mevProtected, setMevProtected] = useState<boolean>(true);
  const [gasSpeed, setGasSpeed] = useState<'standard' | 'fast' | 'instant'>('fast');
  const [isConnectModalOpen, setIsConnectModalOpen] = useState<boolean>(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState<boolean>(false);
  const [isSiweAuthenticated, setIsSiweAuthenticated] = useState<boolean>(false);
  const [siweSession, setSiweSession] = useState<{ address: string; nonce: string; verifiedAt: number } | null>(null);

  const [balances, setBalances] = useState<Record<string, number>>(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('hyperon_wallet_type') === 'sandbox') {
      const idx = parseInt(localStorage.getItem('hyperon_wallet_sandbox_idx') || '0', 10);
      return { ...(SANDBOX_PROFILES[idx] || SANDBOX_PROFILES[0]).balances };
    }
    return { ...INITIAL_BALANCES };
  });

  const [discoveredProviders, setDiscoveredProviders] = useState<EIP6963ProviderDetail[]>([]);
  const [activeCustomProvider, setActiveCustomProvider] = useState<any>(null);

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

  // EIP-6963: Discover multi-injected Web3 providers
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleProviderAnnouncement = (event: any) => {
      const detail = event.detail as EIP6963ProviderDetail;
      if (!detail?.info?.uuid || !detail.provider) return;

      setDiscoveredProviders((prev) => {
        const exists = prev.some((p) => p.info.uuid === detail.info.uuid || p.info.rdns === detail.info.rdns);
        if (exists) return prev;
        return [...prev, detail];
      });
    };

    window.addEventListener('eip6963:announceProvider', handleProviderAnnouncement);
    window.dispatchEvent(new Event('eip6963:requestProvider'));

    return () => {
      window.removeEventListener('eip6963:announceProvider', handleProviderAnnouncement);
    };
  }, []);

  const recordRecentAccount = (wType: SupportedWalletType, addr: string, name?: string) => {
    if (!addr) return;
    setRecentAccounts((prev) => {
      const filtered = prev.filter((a) => a.address.toLowerCase() !== addr.toLowerCase());
      const updated: RecentWalletAccount[] = [
        {
          type: wType,
          address: addr,
          name: name || (wType === 'sandbox' ? 'Institutional Sandbox' : `${wType?.toUpperCase() || 'EVM'} (${addr.slice(0, 6)}...${addr.slice(-4)})`),
          lastConnected: Date.now(),
        },
        ...filtered,
      ].slice(0, 8);
      if (typeof window !== 'undefined') {
        localStorage.setItem('hyperon_recent_accounts', JSON.stringify(updated));
      }
      return updated;
    });
  };

  const removeRecentAccount = (addr: string) => {
    setRecentAccounts((prev) => {
      const updated = prev.filter((a) => a.address.toLowerCase() !== addr.toLowerCase());
      if (typeof window !== 'undefined') {
        localStorage.setItem('hyperon_recent_accounts', JSON.stringify(updated));
      }
      return updated;
    });
  };

  // Switch sandbox profile
  const switchSandboxAccount = (index: number) => {
    if (index < 0 || index >= SANDBOX_PROFILES.length) return;
    const profile = SANDBOX_PROFILES[index];
    setActiveSandboxIndex(index);
    setAddress(profile.address);
    setBalances(profile.balances);
    setWalletType('sandbox');
    setIsDemoMode(true);
    setIsWatchOnly(false);
    setIsConnected(true);
    recordRecentAccount('sandbox', profile.address, `${profile.name} (${profile.tag})`);
    if (typeof window !== 'undefined') {
      localStorage.setItem('hyperon_wallet_connected', 'true');
      localStorage.setItem('hyperon_wallet_address', profile.address);
      localStorage.setItem('hyperon_wallet_type', 'sandbox');
      localStorage.setItem('hyperon_wallet_sandbox_idx', String(index));
    }
  };

  // Helper to safely get the provider for a wallet type
  const getInjectedProvider = (type?: SupportedWalletType, customProvider?: any) => {
    if (customProvider) return customProvider;
    if (typeof window === 'undefined') return null;

    const win = window as any;

    if (type === 'rabby') {
      return win.rabby || (win.ethereum?.isRabby ? win.ethereum : null);
    }
    if (type === 'coinbase') {
      return win.coinbaseWalletExtension || (win.ethereum?.isCoinbaseWallet ? win.ethereum : null);
    }
    if (type === 'phantom') {
      return win.phantom?.ethereum || (win.ethereum?.isPhantom ? win.ethereum : null);
    }
    if (type === 'okx') {
      return win.okxwallet || (win.ethereum?.isOkxWallet ? win.ethereum : null);
    }
    if (type === 'trust') {
      return win.trustwallet || (win.ethereum?.isTrust ? win.ethereum : null);
    }
    if (type === 'rainbow') {
      return win.rainbow || (win.ethereum?.isRainbow ? win.ethereum : null);
    }
    if (type === 'bitget') {
      return win.bitkeep?.ethereum || win.binancew3w || null;
    }
    if (type === 'metamask') {
      if (win.ethereum?.providers && Array.isArray(win.ethereum.providers)) {
        const mm = win.ethereum.providers.find((p: any) => p.isMetaMask && !p.isRabby);
        if (mm) return mm;
      }
      if (win.ethereum?.isMetaMask) return win.ethereum;
    }

    return win.ethereum || null;
  };

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

  // Subscribe to EIP-1193 Web3 provider events
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const provider = activeCustomProvider || (window as any).ethereum;
    if (!provider) return;

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts && accounts.length > 0) {
        setAddress(accounts[0]);
        setIsConnected(true);
        setIsSiweAuthenticated(false);
        setSiweSession(null);
        if (typeof window !== 'undefined') {
          localStorage.setItem('hyperon_wallet_connected', 'true');
          localStorage.setItem('hyperon_wallet_address', accounts[0]);
        }
        refreshBalances();
      } else {
        // User locked or disconnected their wallet
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
      setAddress('');
      setIsSiweAuthenticated(false);
      setSiweSession(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('hyperon_wallet_connected');
        localStorage.removeItem('hyperon_wallet_address');
        localStorage.removeItem('hyperon_wallet_type');
      }
    };

    try {
      provider.on?.('accountsChanged', handleAccountsChanged);
      provider.on?.('chainChanged', handleChainChanged);
      provider.on?.('disconnect', handleDisconnect);

      // Verify connected accounts if previously saved
      if (localStorage.getItem('hyperon_wallet_connected') === 'true' && localStorage.getItem('hyperon_wallet_type') !== 'sandbox') {
        provider
          .request({ method: 'eth_accounts' })
          .then((accounts: string[]) => {
            if (accounts && accounts.length > 0) {
              setAddress(accounts[0]);
              setIsConnected(true);
            }
          })
          .catch(() => {});
      }
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
  }, [activeCustomProvider, refreshBalances]);

  const connectWallet = async (type: SupportedWalletType | 'demo' = 'injected', customProvider?: any) => {
    if (type === 'sandbox' || type === 'demo') {
      setWalletType('sandbox');
      setIsConnected(true);
      setIsWatchOnly(false);
      const profile = SANDBOX_PROFILES[activeSandboxIndex] || SANDBOX_PROFILES[0];
      setAddress(profile.address);
      setBalances({ ...profile.balances });
      setIsDemoMode(true);
      setActiveCustomProvider(null);
      recordRecentAccount('sandbox', profile.address, `${profile.name} (${profile.tag})`);
      if (typeof window !== 'undefined') {
        localStorage.setItem('hyperon_wallet_connected', 'true');
        localStorage.setItem('hyperon_wallet_address', profile.address);
        localStorage.setItem('hyperon_wallet_type', 'sandbox');
        localStorage.setItem('hyperon_wallet_sandbox_idx', String(activeSandboxIndex));
      }
      closeConnectModal();
      return;
    }

    const provider = getInjectedProvider(type, customProvider);
    if (!provider) {
      // If provider not found, let caller handle error
      const walletName = type === 'rabby' ? 'Rabby' : type === 'metamask' ? 'MetaMask' : type === 'coinbase' ? 'Coinbase' : type === 'phantom' ? 'Phantom' : type === 'okx' ? 'OKX' : type === 'trust' ? 'Trust Wallet' : type === 'rainbow' ? 'Rainbow' : 'Web3';
      throw new Error(`Ví ${walletName} chưa được cài đặt trong trình duyệt này. Vui lòng cài đặt tiện ích hoặc quét QR di động.`);
    }

    try {
      const accounts = await provider.request({
        method: 'eth_requestAccounts',
      });
      if (accounts && accounts[0]) {
        setAddress(accounts[0]);
        setIsConnected(true);
        setIsWatchOnly(false);
        setActiveCustomProvider(provider);
        const resolvedType: SupportedWalletType = type || 'injected';
        setWalletType(resolvedType);
        setIsDemoMode(false);
        const wLabel = (type?.toUpperCase() || 'EVM') + ' Wallet';
        recordRecentAccount(resolvedType, accounts[0], wLabel);
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
      if (err?.code === 4001) {
        throw new Error('Yêu cầu kết nối đã bị hủy bởi người dùng.');
      }
      if (err?.code === -32002) {
        throw new Error('Yêu cầu kết nối đang chờ phê duyệt. Vui lòng mở tiện ích ví của bạn để xác nhận.');
      }
      throw new Error(err?.message || 'Không thể kết nối ví. Vui lòng kiểm tra và mở khóa ví.');
    }
  };

  const switchWallet = async (type: SupportedWalletType | 'demo', customProvider?: any) => {
    // If switching to sandbox
    if (type === 'sandbox' || type === 'demo') {
      setIsWatchOnly(false);
      await connectWallet('sandbox');
      return;
    }

    // Unbind listeners from previous provider safely
    if (activeCustomProvider?.removeAllListeners) {
      try {
        activeCustomProvider.removeAllListeners();
      } catch {
        // Safe failover
      }
    }

    setIsWatchOnly(false);
    await connectWallet(type, customProvider);
  };

  const impersonateAddress = (targetAddress: string, label?: string) => {
    const cleanAddr = targetAddress.trim();
    if (!cleanAddr.startsWith('0x') || cleanAddr.length !== 42) {
      throw new Error('Địa chỉ ví EVM không hợp lệ (phải bắt đầu bằng 0x và dài 42 ký tự).');
    }
    setAddress(cleanAddr);
    setIsConnected(true);
    setIsWatchOnly(true);
    setWalletType('injected');
    setIsDemoMode(false);
    setActiveCustomProvider(null);

    // Provide whale portfolio allocation for viewing and routing simulations
    setBalances({
      ETH: 5.48,
      USDC: 24500,
      HYPR: 18200,
      WBTC: 0.65,
      USDT: 10000,
      UNI: 850,
      AETH: 4.2,
      LINK: 550,
    });

    const accountLabel = label || `Watch-Only (${cleanAddr.slice(0, 6)}...${cleanAddr.slice(-4)})`;
    recordRecentAccount('injected', cleanAddr, accountLabel);

    if (typeof window !== 'undefined') {
      localStorage.setItem('hyperon_wallet_connected', 'true');
      localStorage.setItem('hyperon_wallet_address', cleanAddr);
      localStorage.setItem('hyperon_wallet_type', 'watch_only');
    }
    closeConnectModal();
    closeAccountModal();
  };

  const disconnectWallet = async (options?: { zeroTrust?: boolean }) => {
    try {
      const provider = activeCustomProvider || (typeof window !== 'undefined' ? (window as any).ethereum : null);
      if (provider && provider.request && walletType !== 'sandbox') {
        try {
          await provider.request({
            method: 'wallet_revokePermissions',
            params: [{ eth_accounts: {} }],
          });
        } catch {
          // Fallback if revoke not supported
        }
      }
    } catch {
      // Ignore disconnect errors
    }

    if (options?.zeroTrust) {
      // Revoke all token approvals in state
      setTokenApprovals({
        USDC: false,
        USDT: false,
        UNI: false,
        HYPR: false,
        AETH: false,
        WBTC: false,
        LINK: false,
      });
      setBalances({ ...INITIAL_BALANCES });
    }

    setIsConnected(false);
    setIsWatchOnly(false);
    setWalletType(null);
    setAddress('');
    setIsSiweAuthenticated(false);
    setSiweSession(null);
    setActiveCustomProvider(null);

    if (typeof window !== 'undefined') {
      localStorage.removeItem('hyperon_wallet_connected');
      localStorage.removeItem('hyperon_wallet_address');
      localStorage.removeItem('hyperon_wallet_type');
      localStorage.removeItem('hyperon_wallet_sandbox_idx');
      localStorage.removeItem('hyperon_siwe_session');
      window.dispatchEvent(
        new CustomEvent(options?.zeroTrust ? 'hyperon:zero_trust_disconnect' : 'hyperon:wallet_disconnected')
      );
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

  const approveToken = async (tokenSymbol: string) => {
    setTokenApprovals((prev) => ({
      ...prev,
      [tokenSymbol]: true,
    }));
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
        isWatchOnly,
        transactions,
        slippage,
        mevProtected,
        gasSpeed,
        isConnectModalOpen,
        isAccountModalOpen,
        isSiweAuthenticated,
        siweSession,
        discoveredProviders,
        sandboxAccounts: SANDBOX_PROFILES,
        activeSandboxIndex,
        recentAccounts,
        switchSandboxAccount,
        openConnectModal,
        closeConnectModal,
        openAccountModal,
        closeAccountModal,
        connectWallet,
        switchWallet,
        disconnectWallet,
        impersonateAddress,
        removeRecentAccount,
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
        approveToken,
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
