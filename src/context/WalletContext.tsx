import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { createPublicClient, http, formatEther, formatUnits, encodeFunctionData, Address } from 'viem';
import { mainnet, base, arbitrum, optimism, bsc, polygon } from 'viem/chains';
import { ChainId, TransactionHistoryItem } from '../types';
import { SUPPORTED_CHAINS, VERIFIED_TOKENS } from '../lib/constants';
import { ReceiptVerifier } from '../lib/execution/ReceiptVerifier';
import { ERC20_ABI } from '../lib/execution/TransactionBuilder';
import { validateChainId, getChainConfig, isSupportedChain } from '../lib/chainConfig';
import { BalanceEngine, TokenBalanceDetail } from '../lib/balanceEngine';
import { ApprovalEngine } from '../lib/approvalEngine';
import { TransactionSyncEngine } from '../lib/transactionSync';

export type WalletLifecycleState =
  | 'DISCONNECTED'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'RECONNECTING'
  | 'CHAIN_SWITCHING'
  | 'WRONG_CHAIN'
  | 'ERROR';

export type SupportedWalletType =
  | 'metamask'
  | 'coinbase'
  | 'rabby'
  | 'phantom'
  | 'okx'
  | 'trust'
  | 'rainbow'
  | 'bitget'
  | 'zerion'
  | 'brave'
  | 'safe'
  | 'binance'
  | 'kraken'
  | 'exodus'
  | 'backpack'
  | 'uniswap'
  | 'onekey'
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
  lifecycleState: WalletLifecycleState;
  isWrongChain: boolean;
  address: string;
  chainId: ChainId;
  walletType: SupportedWalletType;
  balances: Record<string, number>;
  tokenBalances: Record<string, TokenBalanceDetail>;
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
  connectWallet: (
    type?: SupportedWalletType | 'demo', 
    customProvider?: any,
    options?: { isSimulated?: boolean; address?: string; name?: string }
  ) => Promise<void>;
  switchWallet: (
    type: SupportedWalletType | 'demo', 
    customProvider?: any,
    options?: { isSimulated?: boolean; address?: string; name?: string }
  ) => Promise<void>;
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
  activeCustomProvider: any;
  checkAllowance: (tokenAddress: string, ownerAddress: string, spenderAddress: string) => Promise<bigint>;
  approveTokenOnChain: (tokenAddress: string, spenderAddress: string, amountRaw?: bigint) => Promise<string>;
  addTokenToWallet: (token: { address: string; symbol: string; decimals: number; image?: string }) => Promise<boolean>;
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

export const ZERO_BALANCES: Record<string, number> = {
  ETH: 0,
  USDC: 0,
  USDT: 0,
  WBTC: 0,
  UNI: 0,
  HYPR: 0,
  AETH: 0,
  LINK: 0,
  AAVE: 0,
  ARB: 0,
  OP: 0,
  BNB: 0,
  POL: 0,
  MATIC: 0,
  SOL: 0,
  PEPE: 0,
  SHIB: 0,
  DAI: 0,
  AVAX: 0,
  SUI: 0,
  NEAR: 0,
};

// Deprecated mock profiles kept as empty array for interface backward-compatibility
export const SANDBOX_PROFILES: SandboxAccount[] = [];

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeSandboxIndex, setActiveSandboxIndex] = useState<number>(0);

  // FAIL CLOSED: Never assume wallet is connected on startup from localStorage without provider verification
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [address, setAddress] = useState<string>('');
  const [chainId, setChainId] = useState<ChainId>('ethereum');
  const [walletType, setWalletType] = useState<SupportedWalletType>(null);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);
  const [isWatchOnly, setIsWatchOnly] = useState<boolean>(false);

  const [recentAccounts, setRecentAccounts] = useState<RecentWalletAccount[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('hyperon_recent_accounts');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            return parsed.filter((acc) => acc.type !== 'sandbox' && acc.address?.startsWith('0x'));
          }
        }
      } catch {
        // Fallback
      }
    }
    return [];
  });

  const [slippage, setSlippage] = useState<number>(0.5);
  const [mevProtected, setMevProtected] = useState<boolean>(true);
  const [gasSpeed, setGasSpeed] = useState<'standard' | 'fast' | 'instant'>('fast');
  const [isConnectModalOpen, setIsConnectModalOpen] = useState<boolean>(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState<boolean>(false);
  const [isSiweAuthenticated, setIsSiweAuthenticated] = useState<boolean>(false);
  const [siweSession, setSiweSession] = useState<{ address: string; nonce: string; verifiedAt: number } | null>(null);

  const [balances, setBalances] = useState<Record<string, number>>(() => ({
    ...ZERO_BALANCES,
  }));
  const [lifecycleState, setLifecycleState] = useState<WalletLifecycleState>('DISCONNECTED');
  const [isWrongChain, setIsWrongChain] = useState<boolean>(false);
  const [tokenBalances, setTokenBalances] = useState<Record<string, TokenBalanceDetail>>({});

  const [discoveredProviders, setDiscoveredProviders] = useState<EIP6963ProviderDetail[]>([]);
  const [activeCustomProvider, setActiveCustomProvider] = useState<any>(null);

  const [tokenApprovals, setTokenApprovals] = useState<Record<string, boolean>>({
    USDC: false,
    USDT: false,
    UNI: false,
    HYPR: false,
    AETH: false,
    WBTC: false,
    LINK: false,
  });

  const [transactions, setTransactions] = useState<TransactionHistoryItem[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('hyperon_tx_history');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) return parsed;
        }
      } catch {
        // Fallback
      }
    }
    return [];
  });

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

  // Synchronize server-side SIWE session state (Zero-Trust)
  useEffect(() => {
    let mounted = true;
    const verifySession = async () => {
      if (!address) {
        setIsSiweAuthenticated(false);
        setSiweSession(null);
        return;
      }
      try {
        const res = await fetch('/api/auth/session', { credentials: 'include' });
        if (!mounted) return;
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated && data.session && data.session.walletAddress.toLowerCase() === address.toLowerCase()) {
            setIsSiweAuthenticated(true);
            setSiweSession({
              address: data.session.walletAddress,
              nonce: 'server_session',
              verifiedAt: data.session.issuedAt,
            });
            return;
          }
        }
        setIsSiweAuthenticated(false);
        setSiweSession(null);
      } catch {
        if (mounted) {
          setIsSiweAuthenticated(false);
          setSiweSession(null);
        }
      }
    };
    verifySession();
    return () => {
      mounted = false;
    };
  }, [address]);

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

  // Switch sandbox profile (Deprecated in production)
  const switchSandboxAccount = (_index: number) => {
    // Production mode operates strictly on real Web3 connections and on-chain addresses
  };

  // Helper to safely get the provider for a wallet type
  const getInjectedProvider = useCallback((type?: SupportedWalletType, customProvider?: any) => {
    if (customProvider) return customProvider;
    if (typeof window === 'undefined') return null;

    const win = window as any;

    // 1. Check EIP-6963 discovered providers first if type matches rdns or name
    if (type && discoveredProviders.length > 0) {
      const match = discoveredProviders.find((dp) => {
        const rdns = (dp.info.rdns || '').toLowerCase();
        const name = (dp.info.name || '').toLowerCase();
        if (type === 'metamask' && (rdns.includes('io.metamask') || name.includes('metamask'))) return true;
        if (type === 'rabby' && (rdns.includes('io.rabby') || name.includes('rabby'))) return true;
        if (type === 'coinbase' && (rdns.includes('coinbase') || name.includes('coinbase'))) return true;
        if (type === 'phantom' && (rdns.includes('phantom') || name.includes('phantom'))) return true;
        if (type === 'okx' && (rdns.includes('okx') || rdns.includes('okex') || name.includes('okx'))) return true;
        if (type === 'trust' && (rdns.includes('trust') || rdns.includes('com.trustwallet.app') || name.includes('trust'))) return true;
        if (type === 'binance' && (rdns.includes('binance') || name.includes('binance'))) return true;
        if (type === 'kraken' && (rdns.includes('kraken') || name.includes('kraken'))) return true;
        if (type === 'exodus' && (rdns.includes('exodus') || name.includes('exodus'))) return true;
        if (type === 'backpack' && (rdns.includes('backpack') || name.includes('backpack'))) return true;
        if (type === 'uniswap' && (rdns.includes('uniswap') || name.includes('uniswap'))) return true;
        if (type === 'onekey' && (rdns.includes('onekey') || name.includes('onekey'))) return true;
        if (type === 'rainbow' && (rdns.includes('rainbow') || name.includes('rainbow'))) return true;
        if (type === 'bitget' && (rdns.includes('bitget') || rdns.includes('bitkeep') || name.includes('bitget'))) return true;
        if (type === 'zerion' && (rdns.includes('zerion') || name.includes('zerion'))) return true;
        if (type === 'brave' && (rdns.includes('brave') || name.includes('brave'))) return true;
        if (type === 'safe' && (rdns.includes('safe') || name.includes('safe'))) return true;
        return false;
      });
      if (match?.provider) return match.provider;
    }

    // 2. Check multi-provider array on window.ethereum.providers
    if (win.ethereum?.providers && Array.isArray(win.ethereum.providers)) {
      if (type === 'metamask') {
        const mm = win.ethereum.providers.find((p: any) => p.isMetaMask && !p.isRabby && !p.isBraveWallet && !p.isPhantom);
        if (mm) return mm;
      }
      if (type === 'rabby') {
        const rb = win.ethereum.providers.find((p: any) => p.isRabby);
        if (rb) return rb;
      }
      if (type === 'coinbase') {
        const cb = win.ethereum.providers.find((p: any) => p.isCoinbaseWallet);
        if (cb) return cb;
      }
      if (type === 'phantom') {
        const ph = win.ethereum.providers.find((p: any) => p.isPhantom);
        if (ph) return ph;
      }
      if (type === 'okx') {
        const ok = win.ethereum.providers.find((p: any) => p.isOkxWallet);
        if (ok) return ok;
      }
      if (type === 'trust') {
        const tr = win.ethereum.providers.find((p: any) => p.isTrust || p.isTrustWallet || p.isTrustWalletExtension);
        if (tr) return tr;
      }
      if (type === 'binance') {
        const bn = win.ethereum.providers.find((p: any) => p.isBinance || p.isBinanceW3W || p.isBinanceWallet);
        if (bn) return bn;
      }
      if (type === 'kraken') {
        const kr = win.ethereum.providers.find((p: any) => p.isKraken);
        if (kr) return kr;
      }
      if (type === 'exodus') {
        const ex = win.ethereum.providers.find((p: any) => p.isExodus);
        if (ex) return ex;
      }
      if (type === 'backpack') {
        const bp = win.ethereum.providers.find((p: any) => p.isBackpack);
        if (bp) return bp;
      }
      if (type === 'rainbow') {
        const rn = win.ethereum.providers.find((p: any) => p.isRainbow);
        if (rn) return rn;
      }
      if (type === 'bitget') {
        const bg = win.ethereum.providers.find((p: any) => p.isBitKeep || p.isBitget);
        if (bg) return bg;
      }
      if (type === 'zerion') {
        const zr = win.ethereum.providers.find((p: any) => p.isZerion);
        if (zr) return zr;
      }
      if (type === 'brave') {
        const br = win.ethereum.providers.find((p: any) => p.isBraveWallet);
        if (br) return br;
      }
    }

    // 3. Dedicated window globals
    if (type === 'trust') {
      return win.trustwallet || win.trustWallet || (win.ethereum?.isTrust || win.ethereum?.isTrustWallet ? win.ethereum : null) || null;
    }
    if (type === 'binance') {
      return win.binancew3w?.ethereum || win.BinanceChain || win.binance || (win.ethereum?.isBinance ? win.ethereum : null);
    }
    if (type === 'kraken') {
      return win.kraken?.ethereum || win.kraken || null;
    }
    if (type === 'exodus') {
      return win.exodus?.ethereum || win.exodus || null;
    }
    if (type === 'backpack') {
      return win.backpack?.ethereum || win.backpack || null;
    }
    if (type === 'uniswap') {
      return win.uniswap?.ethereum || win.uniswap || null;
    }
    if (type === 'onekey') {
      return win.$onekey?.ethereum || win.onekey || null;
    }
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
    if (type === 'rainbow') {
      return win.rainbow || (win.ethereum?.isRainbow ? win.ethereum : null);
    }
    if (type === 'bitget') {
      return win.bitkeep?.ethereum || win.binancew3w || null;
    }
    if (type === 'zerion') {
      return win.zerionWallet || (win.ethereum?.isZerion ? win.ethereum : null);
    }
    if (type === 'brave') {
      return win.braveEthereum || (win.ethereum?.isBraveWallet ? win.ethereum : null);
    }
    if (type === 'safe') {
      return win.safe || (win.ethereum?.isSafe ? win.ethereum : null);
    }
    if (type === 'metamask') {
      if (win.ethereum?.isMetaMask && !win.ethereum?.isRabby) return win.ethereum;
      return win.ethereum || null;
    }

    return win.ethereum || null;
  }, [discoveredProviders]);

  // Query live on-chain balance via RPC using Precision BalanceEngine
  const refreshBalances = useCallback(async () => {
    if (!address || !address.startsWith('0x') || address.length !== 42) {
      setBalances({ ...ZERO_BALANCES });
      setTokenBalances({});
      return;
    }

    try {
      const targetChain = CHAIN_MAP[chainId];
      if (!targetChain) {
        setIsWrongChain(true);
        setLifecycleState('WRONG_CHAIN');
        return;
      }

      const client = createPublicClient({
        chain: targetChain,
        transport: http(),
      }) as any;

      const chainTokens = VERIFIED_TOKENS.filter((t) => t.chainId === chainId).map((t) => ({
        address: t.address,
        symbol: t.symbol,
        decimals: t.decimals || 18,
        isNative: t.isNative,
      }));

      const portfolio = await BalanceEngine.fetchPortfolioBalances(
        client,
        address as Address,
        chainId,
        chainTokens
      );

      setTokenBalances(portfolio);

      const numericMap: Record<string, number> = { ...ZERO_BALANCES };
      for (const [sym, detail] of Object.entries(portfolio)) {
        numericMap[sym] = detail.numericBalance;
      }
      setBalances(numericMap);
    } catch (err) {
      console.warn('[WalletContext] Live on-chain balance sync:', err);
    }
  }, [address, chainId]);

  useEffect(() => {
    refreshBalances();
  }, [refreshBalances]);

  // Automatic reconciliation of pending transactions on mount / address change
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const provider = activeCustomProvider || (window as any).ethereum;
    if (provider && provider.request) {
      TransactionSyncEngine.reconcileAllPending(provider, address, (updated) => {
        setTransactions(updated);
      });
    }
  }, [activeCustomProvider, address]);

  // Subscribe to EIP-1193 Web3 provider events
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const provider = activeCustomProvider || (window as any).ethereum;
    if (!provider) return;

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts && accounts.length > 0) {
        const newAddress = accounts[0];
        setAddress(newAddress);
        setIsConnected(true);
        setLifecycleState('CONNECTED');
        setIsSiweAuthenticated(false);
        setSiweSession(null);
        setTokenApprovals({});
        window.dispatchEvent(
          new CustomEvent('hyperon:account_changed', { detail: { newAddress } })
        );
        if (typeof window !== 'undefined') {
          localStorage.setItem('hyperon_wallet_connected', 'true');
          localStorage.setItem('hyperon_wallet_address', newAddress);
        }
        refreshBalances();
      } else {
        // User locked or disconnected their wallet
        setIsConnected(false);
        setLifecycleState('DISCONNECTED');
        setWalletType(null);
        setAddress('');
        setIsSiweAuthenticated(false);
        setSiweSession(null);
        setTokenApprovals({});
        window.dispatchEvent(
          new CustomEvent('hyperon:account_changed', { detail: { newAddress: '' } })
        );
        if (typeof window !== 'undefined') {
          localStorage.removeItem('hyperon_wallet_connected');
          localStorage.removeItem('hyperon_wallet_address');
          localStorage.removeItem('hyperon_wallet_type');
        }
      }
    };

    const handleChainChanged = (chainHex: string) => {
      const hexLower = (chainHex || '').toLowerCase();
      const detectedChainId = HEX_CHAIN_TO_ID[hexLower];
      if (detectedChainId) {
        setChainId(detectedChainId);
        setIsWrongChain(false);
        setLifecycleState('CONNECTED');
        setTokenApprovals({});
        window.dispatchEvent(
          new CustomEvent('hyperon:chain_changed', {
            detail: { newChainId: detectedChainId, isUnsupported: false },
          })
        );
        refreshBalances();
      } else {
        // Unsupported chain -> WRONG_CHAIN -> FAIL CLOSED!
        setIsWrongChain(true);
        setLifecycleState('WRONG_CHAIN');
        setTokenApprovals({});
        window.dispatchEvent(
          new CustomEvent('hyperon:chain_changed', {
            detail: { newChainId: null, isUnsupported: true, rawChainHex: chainHex },
          })
        );
      }
    };

    const handleDisconnect = () => {
      setIsConnected(false);
      setLifecycleState('DISCONNECTED');
      setWalletType(null);
      setAddress('');
      setIsSiweAuthenticated(false);
      setSiweSession(null);
      setTokenApprovals({});
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

      // Verify connected accounts directly from real provider (Fail Closed)
      const savedType = typeof window !== 'undefined' ? localStorage.getItem('hyperon_wallet_type') : null;
      if (savedType && savedType !== 'sandbox' && savedType !== 'demo') {
        Promise.all([
          provider.request({ method: 'eth_accounts' }),
          provider.request({ method: 'eth_chainId' }).catch(() => null),
        ])
          .then(([accounts, chainHex]: [string[], string | null]) => {
            if (accounts && accounts.length > 0 && accounts[0].startsWith('0x')) {
              const liveAddr = accounts[0];
              setAddress(liveAddr);
              setIsConnected(true);
              setWalletType(savedType as SupportedWalletType);

              if (chainHex) {
                const detectedChain = HEX_CHAIN_TO_ID[chainHex.toLowerCase()];
                if (detectedChain) {
                  setChainId(detectedChain);
                  setIsWrongChain(false);
                  setLifecycleState('CONNECTED');
                } else {
                  setIsWrongChain(true);
                  setLifecycleState('WRONG_CHAIN');
                }
              } else {
                setLifecycleState('CONNECTED');
              }
              if (typeof window !== 'undefined') {
                localStorage.setItem('hyperon_wallet_connected', 'true');
                localStorage.setItem('hyperon_wallet_address', liveAddr);
              }
              refreshBalances();
            } else {
              // Provider returned no accounts -> user locked wallet or disconnected
              setIsConnected(false);
              setLifecycleState('DISCONNECTED');
              setAddress('');
              setWalletType(null);
              if (typeof window !== 'undefined') {
                localStorage.removeItem('hyperon_wallet_connected');
                localStorage.removeItem('hyperon_wallet_address');
                localStorage.removeItem('hyperon_wallet_type');
              }
            }
          })
          .catch(() => {
            setIsConnected(false);
            setLifecycleState('DISCONNECTED');
            setAddress('');
            setWalletType(null);
            if (typeof window !== 'undefined') {
              localStorage.removeItem('hyperon_wallet_connected');
              localStorage.removeItem('hyperon_wallet_address');
              localStorage.removeItem('hyperon_wallet_type');
            }
          });
      } else {
        setIsConnected(false);
        setLifecycleState('DISCONNECTED');
        setAddress('');
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

  const connectWallet = async (
    type: SupportedWalletType | 'demo' = 'injected', 
    customProvider?: any,
    options?: { isSimulated?: boolean; address?: string; name?: string }
  ) => {
    // 1. If explicit address provided for on-chain verification & sync
    if (options?.address) {
      const cleanAddr = options.address.trim();
      if (!cleanAddr.startsWith('0x') || cleanAddr.length !== 42) {
        throw new Error('Địa chỉ ví EVM không hợp lệ (phải bắt đầu bằng 0x và dài 42 ký tự).');
      }
      setAddress(cleanAddr);
      setIsConnected(true);
      setIsWatchOnly(true);
      const resolvedType: SupportedWalletType = (type as SupportedWalletType) || 'injected';
      setWalletType(resolvedType);
      setIsDemoMode(false);
      setActiveCustomProvider(null);
      setBalances({ ...ZERO_BALANCES });

      const wLabel = options?.name || `Ví On-Chain (${cleanAddr.slice(0, 6)}...${cleanAddr.slice(-4)})`;
      recordRecentAccount(resolvedType, cleanAddr, wLabel);

      if (typeof window !== 'undefined') {
        localStorage.setItem('hyperon_wallet_connected', 'true');
        localStorage.setItem('hyperon_wallet_address', cleanAddr);
        localStorage.setItem('hyperon_wallet_type', resolvedType);
      }
      closeConnectModal();
      await refreshBalances();
      return;
    }

    // 2. Real Web3 injected provider connection
    const provider = getInjectedProvider(type as SupportedWalletType, customProvider);
    if (!provider) {
      const walletName = type === 'rabby' ? 'Rabby' : type === 'metamask' ? 'MetaMask' : type === 'coinbase' ? 'Coinbase' : type === 'phantom' ? 'Phantom' : type === 'okx' ? 'OKX' : type === 'trust' ? 'Trust Wallet' : type === 'binance' ? 'Binance Web3' : type === 'rainbow' ? 'Rainbow' : 'Web3';
      throw new Error(`Ví ${walletName} chưa được kích hoạt hoặc cài đặt trong trình duyệt này. Vui lòng mở tiện ích ví hoặc quét mã QR di động.`);
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
        const resolvedType: SupportedWalletType = (type as SupportedWalletType) || 'injected';
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

  const switchWallet = async (
    type: SupportedWalletType | 'demo', 
    customProvider?: any,
    options?: { isSimulated?: boolean; address?: string; name?: string }
  ) => {
    // Unbind listeners from previous provider safely
    if (activeCustomProvider?.removeAllListeners) {
      try {
        activeCustomProvider.removeAllListeners();
      } catch {
        // Safe failover
      }
    }

    setIsWatchOnly(false);
    await connectWallet(type, customProvider, options);
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

    // Initialize to genuine zero balances and immediately query real blockchain state
    setBalances({ ...ZERO_BALANCES });

    const accountLabel = label || `Ví On-Chain (${cleanAddr.slice(0, 6)}...${cleanAddr.slice(-4)})`;
    recordRecentAccount('injected', cleanAddr, accountLabel);

    if (typeof window !== 'undefined') {
      localStorage.setItem('hyperon_wallet_connected', 'true');
      localStorage.setItem('hyperon_wallet_address', cleanAddr);
      localStorage.setItem('hyperon_wallet_type', 'watch_only');
    }
    closeConnectModal();
    closeAccountModal();
    refreshBalances();
  };

  const disconnectWallet = async (options?: { zeroTrust?: boolean }) => {
    try {
      const provider = activeCustomProvider || (typeof window !== 'undefined' ? (window as any).ethereum : null);
      if (provider && provider.request) {
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
    }

    setBalances({ ...ZERO_BALANCES });
    setIsConnected(false);
    setIsWatchOnly(false);
    setWalletType(null);
    setAddress('');
    setIsSiweAuthenticated(false);
    setSiweSession(null);
    setActiveCustomProvider(null);

    // Invalidate server session
    fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => {});

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
    const validated = validateChainId(newChainId);
    setLifecycleState('CHAIN_SWITCHING');
    setChainId(validated);
    setIsWrongChain(false);
    setTokenApprovals({});
    window.dispatchEvent(
      new CustomEvent('hyperon:chain_changed', { detail: { newChainId: validated, isUnsupported: false } })
    );

    const provider = activeCustomProvider || getInjectedProvider(walletType) || (typeof window !== 'undefined' ? (window as any).ethereum : null);
    if (provider && provider.request && walletType !== 'sandbox') {
      const chainConfig = getChainConfig(validated);
      const chainHex = chainConfig.hexChainId;
      try {
        await provider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: chainHex }],
        });
      } catch (switchError: any) {
        if (switchError.code === 4902 && chainConfig) {
          try {
            await provider.request({
              method: 'wallet_addEthereumChain',
              params: [
                {
                  chainId: chainHex,
                  chainName: chainConfig.name,
                  nativeCurrency: chainConfig.nativeCurrency,
                  rpcUrls: chainConfig.rpcUrls,
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
    setLifecycleState('CONNECTED');
    await refreshBalances();
  };

  const authenticateSiwe = async (): Promise<boolean> => {
    try {
      if (!address) {
        throw new Error('WALLET_NOT_CONNECTED: An active wallet connection is required to authenticate.');
      }

      const chainNumericId =
        chainId === 'ethereum'
          ? '1'
          : chainId === 'base'
          ? '8453'
          : chainId === 'arbitrum'
          ? '42161'
          : chainId === 'optimism'
          ? '10'
          : chainId === 'bsc'
          ? '56'
          : chainId === 'polygon'
          ? '137'
          : '1';

      // Step 1: Request fresh single-use cryptographic nonce and message from backend with dynamic chainId
      const nonceRes = await fetch(`/api/auth/nonce?address=${address}&chainId=${chainNumericId}`);
      if (!nonceRes.ok) {
        throw new Error('NONCE_UNAVAILABLE: Failed to obtain authenticated cryptographic nonce from server.');
      }
      const data = await nonceRes.json();
      const nonce = data.nonce;
      const authMessage = data.authMessage;

      if (!nonce || !authMessage) {
        throw new Error('INVALID_NONCE_RESPONSE: Backend did not return a valid auth message or nonce.');
      }

      let signature = '';
      if (typeof window !== 'undefined' && (window as any).ethereum && walletType !== 'sandbox') {
        signature = await (window as any).ethereum.request({
          method: 'personal_sign',
          params: [authMessage, address],
        });
      } else {
        throw new Error('SIGNATURE_UNAVAILABLE: Ethereum provider not available for personal_sign.');
      }

      // Step 2: Cryptographically verify signature on backend, create server session and store HttpOnly cookie
      const verifyRes = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          address,
          signature,
          authMessage,
          chainId: chainNumericId,
        }),
      });

      if (!verifyRes.ok) {
        const errJson = await verifyRes.json();
        throw new Error(errJson.reason || errJson.error || 'Cryptographic verification failed.');
      }

      const verifyData = await verifyRes.json();
      if (!verifyData.success) {
        throw new Error('Authentication verification failed.');
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
      setIsSiweAuthenticated(false);
      setSiweSession(null);
      return false;
    }
  };

  const requestFaucetFunds = (_tokenSymbol: string, _amount: number) => {
    // Invariant: Zero synthetic balances. Balances must reflect on-chain RPC state only.
    refreshBalances();
  };

  const resetBalances = () => {
    setBalances({ ...ZERO_BALANCES });
    refreshBalances();
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
    const provider = activeCustomProvider || getInjectedProvider(walletType) || (typeof window !== 'undefined' ? (window as any).ethereum : null);
    if (!provider || !provider.request) {
      throw new Error('Chưa kết nối ví Web3. Vui lòng kết nối ví Trust Wallet, MetaMask hoặc ví EVM tương thích để ký giao dịch thật.');
    }

    if (!txData.targetAddress || !txData.targetAddress.startsWith('0x') || txData.targetAddress.length !== 42) {
      throw new Error('INVALID_EXECUTION_TARGET: Địa chỉ hợp đồng router on-chain không hợp lệ.');
    }
    if (!txData.calldata || txData.calldata === '0x' || !txData.calldata.startsWith('0x')) {
      throw new Error('INVALID_EXECUTION_CALLDATA: Cần có calldata ABI hợp lệ để thực thi giao dịch on-chain.');
    }

    try {
      const hash = await provider.request({
        method: 'eth_sendTransaction',
        params: [
          {
            from: address,
            to: txData.targetAddress,
            value: txData.valueHex || '0x0',
            data: txData.calldata,
          },
        ],
      });
      if (hash) {
        txHash = hash;
      }
    } catch (err: any) {
      if (err?.code === 4001) {
        throw new Error('Người dùng đã hủy yêu cầu ký giao dịch trên ví.');
      }
      throw new Error(err?.message || 'Giao dịch bị từ chối hoặc thất bại trên ví Web3.');
    }

    if (!txHash) {
      throw new Error('Giao dịch chưa được ký hoặc ví Web3 không trả về mã băm (txHash).');
    }

    let currentBlock = 0;
    let submittedNonce: number | undefined;
    try {
      if (provider && provider.request) {
        const [blockHex, txObj, countHex] = await Promise.all([
          provider.request({ method: 'eth_blockNumber' }).catch(() => null),
          provider.request({ method: 'eth_getTransactionByHash', params: [txHash] }).catch(() => null),
          provider.request({ method: 'eth_getTransactionCount', params: [address, 'latest'] }).catch(() => null),
        ]);
        if (blockHex) currentBlock = parseInt(blockHex, 16);
        if (txObj?.nonce) {
          submittedNonce = parseInt(txObj.nonce, 16);
        } else if (countHex) {
          submittedNonce = Math.max(0, parseInt(countHex, 16) - 1);
        }
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

    const newTx: TransactionHistoryItem = {
      ...txData,
      id: `tx-${Date.now()}`,
      txHash,
      timestamp: Date.now(),
      status: 'pending',
      correlationId,
      blockNumber: currentBlock || 0,
      submittedNonce,
      walletAddress: address,
    };

    setTransactions((prev) => [newTx, ...prev]);
    TransactionSyncEngine.recordTransaction(newTx);

    // Background receipt tracker: polling on-chain receipt from node
    (async () => {
      try {
        if (provider && provider.request) {
          let attempts = 0;
          const maxAttempts = 35;
          while (attempts < maxAttempts) {
            await new Promise((resolve) => setTimeout(resolve, 2500));
            attempts++;
            const receipt = await provider.request({
              method: 'eth_getTransactionReceipt',
              params: [txHash],
            });
            if (receipt) {
              const isStatusSuccess = receipt.status === '0x1' || receipt.status === 1;
              let isFullyVerified = isStatusSuccess;
              let actualAmountOutRaw: string | undefined;

              if (isStatusSuccess && txData.targetAddress) {
                try {
                  const verification = ReceiptVerifier.verifyReceipt({
                    receipt,
                    expectedRecipient: (address || '') as Address,
                    expectedTokenOut: (txData.toTokenAddress || '0x0000000000000000000000000000000000000000') as Address,
                    amountOutMinimum: txData.minimumReceivedRaw ? BigInt(txData.minimumReceivedRaw) : 0n,
                    expectedRouter: txData.targetAddress as Address,
                    expectedSender: (address || '') as Address,
                    chainId: txData.chainId,
                  });
                  if (!verification.verified) {
                    isFullyVerified = false;
                    console.warn('[ReceiptVerifier] Criteria check:', verification.reason);
                  } else {
                    actualAmountOutRaw = verification.actualAmountOut?.toString();
                  }
                } catch (vErr) {
                  isFullyVerified = false;
                  console.warn('[ReceiptVerifier] Check error:', vErr);
                }
              }

              const minedBlock = receipt.blockNumber ? parseInt(receipt.blockNumber, 16) : currentBlock;
              const minedBlockHash = receipt.blockHash;
              const finalStatus = isFullyVerified ? 'confirmed' : 'failed';

              setTransactions((prev) =>
                prev.map((item) =>
                  item.txHash === txHash
                    ? {
                        ...item,
                        status: finalStatus,
                        blockNumber: minedBlock > 0 ? minedBlock : item.blockNumber,
                        blockHash: minedBlockHash || item.blockHash,
                        actualAmountOutRaw: actualAmountOutRaw || item.actualAmountOutRaw,
                      }
                    : item
                )
              );

              const updatedTxRecord: TransactionHistoryItem = {
                ...newTx,
                status: finalStatus,
                blockNumber: minedBlock > 0 ? minedBlock : newTx.blockNumber,
                blockHash: minedBlockHash,
                actualAmountOutRaw,
              };
              TransactionSyncEngine.recordTransaction(updatedTxRecord);

              window.dispatchEvent(
                new CustomEvent('hyperon:transaction_confirmed', {
                  detail: { txHash, status: finalStatus, blockNumber: minedBlock },
                })
              );

              if (isFullyVerified) {
                await refreshBalances();
              }
              break;
            }
          }
        }
      } catch (receiptErr) {
        console.warn('On-chain receipt tracking error:', receiptErr);
      }
    })();

    return newTx;
  };

  const checkAllowance = useCallback(
    async (tokenAddress: string, ownerAddress: string, spenderAddress: string): Promise<bigint> => {
      try {
        if (!tokenAddress || !ownerAddress || !spenderAddress) return 0n;
        if (!tokenAddress.startsWith('0x') || !ownerAddress.startsWith('0x') || !spenderAddress.startsWith('0x')) return 0n;
        const targetChain = CHAIN_MAP[chainId];
        if (!targetChain) return 0n;
        const client = createPublicClient({
          chain: targetChain,
          transport: http(),
        });
        const allowance = await client.readContract({
          address: tokenAddress as Address,
          abi: ERC20_ABI,
          functionName: 'allowance',
          args: [ownerAddress as Address, spenderAddress as Address],
        } as any);
        return BigInt(allowance?.toString() || '0');
      } catch (err) {
        console.warn('Failed to read on-chain token allowance:', err);
        return 0n;
      }
    },
    [chainId]
  );

  const approveTokenOnChain = useCallback(
    async (tokenAddress: string, spenderAddress: string, amountRaw?: bigint): Promise<string> => {
      const provider =
        activeCustomProvider ||
        getInjectedProvider(walletType) ||
        (typeof window !== 'undefined' ? (window as any).ethereum : null);
      if (!provider) {
        throw new Error('Không tìm thấy ví Web3 đã kết nối để gửi giao dịch phê duyệt.');
      }
      if (!address) {
        throw new Error('Chưa có địa chỉ ví kết nối.');
      }
      const targetChain = CHAIN_MAP[chainId];
      if (!targetChain) {
        throw new Error(`INVALID_CHAIN: Chuỗi ${chainId} không được hỗ trợ.`);
      }
      const client = createPublicClient({
        chain: targetChain,
        transport: http(),
      }) as any;

      const maxUint256 = 115792089237316195423570985008687907853269984665640564039457584007913129639935n;
      const amountToApprove = amountRaw || maxUint256;

      const result = await ApprovalEngine.executeApproval({
        client,
        provider,
        tokenAddress: tokenAddress as Address,
        owner: address as Address,
        spender: spenderAddress as Address,
        amountIn: amountToApprove,
        exactAmount: amountRaw !== undefined,
        chainId,
      });

      setTokenApprovals((prev) => ({
        ...prev,
        [tokenAddress.toLowerCase()]: true,
      }));

      return result.approvalTxHash;
    },
    [address, chainId, activeCustomProvider, walletType, getInjectedProvider]
  );

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

  const addTokenToWallet = useCallback(
    async (token: { address: string; symbol: string; decimals: number; image?: string }): Promise<boolean> => {
      try {
        const provider = activeCustomProvider || (typeof window !== 'undefined' ? (window as any).ethereum : null);
        if (!provider) {
          throw new Error('Chưa phát hiện tiện ích mở rộng ví Web3 trên trình duyệt.');
        }
        const wasAdded = await provider.request({
          method: 'wallet_watchAsset',
          params: {
            type: 'ERC20',
            options: {
              address: token.address,
              symbol: token.symbol,
              decimals: token.decimals,
              image: token.image || undefined,
            },
          },
        });
        return Boolean(wasAdded);
      } catch (err: any) {
        console.warn('[WalletContext] Failed to watchAsset:', err);
        throw err;
      }
    },
    [activeCustomProvider]
  );

  return (
    <WalletContext.Provider
      value={{
        isConnected,
        lifecycleState,
        isWrongChain,
        address,
        chainId,
        walletType,
        balances,
        tokenBalances,
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
        activeCustomProvider,
        checkAllowance,
        approveTokenOnChain,
        addTokenToWallet,
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
