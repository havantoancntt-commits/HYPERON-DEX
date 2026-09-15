import React, { useState } from 'react';
import { useWallet } from '../context/WalletContext';
import { useExchange } from '../context/ExchangeContext';
import { SUPPORTED_CHAINS } from '../lib/constants';
import { shortenAddress } from '../lib/utils';
import { ChainLogo } from './CryptoIcon';
import {
  X,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  Droplets,
  RotateCcw,
  LogOut,
  RefreshCw,
  Zap,
  KeyRound,
  Shield,
  Sliders,
  Wallet,
  ArrowRightLeft,
  QrCode,
  Lock,
  Eye,
  Trash2,
  AlertTriangle,
  History,
  CheckCircle2,
  Radio,
  ArrowUpRight,
  Info,
  ShieldX
} from 'lucide-react';

const WATCH_PRESETS = [
  { label: 'Vitalik Buterin (vitalik.eth)', address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045' },
  { label: 'Wintermute Algorithmic Trading', address: '0x00000000ae347930BD1E7B0F35588b92280f9e75' },
  { label: 'Uniswap Foundation Deployer', address: '0x1a9C8182C09F50C8318d769245beA52c32BE35BC' },
];

const POPULAR_EXTENSIONS = [
  { id: 'metamask', name: 'MetaMask', symbol: 'MM', tag: 'EIP-1193 / Extension' },
  { id: 'rabby', name: 'Rabby Wallet', symbol: 'RB', tag: 'DeFi Security Native' },
  { id: 'coinbase', name: 'Coinbase Wallet', symbol: 'CB', tag: 'Smart Wallet & Extension' },
  { id: 'okx', name: 'OKX Web3', symbol: 'OKX', tag: 'Multi-Chain Pro' },
  { id: 'phantom', name: 'Phantom EVM', symbol: 'PH', tag: 'Solana & Ethereum' },
  { id: 'rainbow', name: 'Rainbow', symbol: 'RBW', tag: 'Mobile & Extension' },
  { id: 'bitget', name: 'Bitget Wallet', symbol: 'BG', tag: 'Binance Web3 Compatible' },
];

export const AccountDetailsModal: React.FC = () => {
  const {
    isAccountModalOpen,
    closeAccountModal,
    openConnectModal,
    address,
    chainId,
    walletType,
    balances,
    isDemoMode,
    isWatchOnly,
    isSiweAuthenticated,
    authenticateSiwe,
    disconnectWallet,
    switchWallet,
    impersonateAddress,
    recentAccounts,
    removeRecentAccount,
    requestFaucetFunds,
    resetBalances,
    sandboxAccounts,
    activeSandboxIndex,
    switchSandboxAccount,
    discoveredProviders,
    tokenApprovals,
    revokeApproval,
    approveToken,
  } = useWallet();
  const { addToast } = useExchange();

  const [copied, setCopied] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [faucetLoading, setFaucetLoading] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'switch' | 'security' | 'faucet'>('overview');
  const [impersonateInput, setImpersonateInput] = useState('');
  const [impersonateError, setImpersonateError] = useState<string | null>(null);
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [switchingTarget, setSwitchingTarget] = useState<string | null>(null);

  if (!isAccountModalOpen || !address) return null;

  const currentChain = SUPPORTED_CHAINS[chainId] || SUPPORTED_CHAINS.ethereum;
  const explorerUrl = `${currentChain.explorerUrl}/address/${address}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    addToast({
      title: 'Address Copied',
      message: `${address} copied to clipboard`,
      type: 'info',
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSiweAuth = async () => {
    setIsAuthenticating(true);
    try {
      const success = await authenticateSiwe();
      if (success) {
        addToast({
          title: 'SIWE Cryptographic Auth Verified',
          message: 'EIP-4361 cryptographic signature validated on HYPERON-DEX.',
          type: 'success',
        });
      }
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleClaimFaucet = (tokenSymbol: string, amount: number) => {
    setFaucetLoading(true);
    setTimeout(() => {
      requestFaucetFunds(tokenSymbol, amount);
      setFaucetLoading(false);
      addToast({
        title: 'Faucet Funds Credited',
        message: `+${amount.toLocaleString()} ${tokenSymbol} added to your active balance!`,
        type: 'success',
      });
    }, 400);
  };

  const handleToggleApproval = async (token: string, currentVal: boolean) => {
    if (currentVal) {
      await revokeApproval(token);
      addToast({
        title: 'Allowance Revoked',
        message: `Unlimited spending allowance for ${token} has been revoked for zero-trust security.`,
        type: 'info',
      });
    } else {
      await approveToken(token);
      addToast({
        title: 'Allowance Approved',
        message: `Permitted router contract to trade ${token}.`,
        type: 'success',
      });
    }
  };

  const handleSwitchToProvider = async (targetType: any, customProvider?: any) => {
    setSwitchingTarget(targetType);
    try {
      await switchWallet(targetType, customProvider);
      addToast({
        title: 'Wallet Switched Successfully',
        message: `Connected active session to ${targetType?.toUpperCase() || 'Web3'} wallet.`,
        type: 'success',
      });
    } catch (err: any) {
      addToast({
        title: 'Switch Failed',
        message: err?.message || 'Failed to switch provider.',
        type: 'error',
      });
    } finally {
      setSwitchingTarget(null);
    }
  };

  const handleSwitchSandbox = (idx: number) => {
    switchSandboxAccount(idx);
    addToast({
      title: 'Sandbox Account Switched',
      message: `Active profile: ${sandboxAccounts[idx]?.name || 'Institutional Sandbox'}`,
      type: 'info',
    });
  };

  const handleImpersonate = (addrToUse?: string, label?: string) => {
    setImpersonateError(null);
    const target = addrToUse || impersonateInput.trim();
    if (!target.startsWith('0x') || target.length !== 42) {
      setImpersonateError('EVM address must start with 0x and have exactly 42 characters.');
      return;
    }
    try {
      impersonateAddress(target, label);
      addToast({
        title: 'Watch-Only Account Activated',
        message: `Now inspecting portfolio for ${shortenAddress(target, 6)} in read-only mode.`,
        type: 'info',
      });
      setImpersonateInput('');
    } catch (err: any) {
      setImpersonateError(err.message);
    }
  };

  const handleStandardDisconnect = async () => {
    setIsDisconnecting(true);
    try {
      await disconnectWallet();
      addToast({
        title: 'Wallet Disconnected',
        message: 'Active Web3 session cleanly terminated.',
        type: 'info',
      });
      setShowDisconnectModal(false);
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handleZeroTrustDisconnect = async () => {
    setIsDisconnecting(true);
    try {
      await disconnectWallet({ zeroTrust: true });
      addToast({
        title: 'Zero-Trust Disconnect Executed',
        message: 'All router token allowances revoked, cryptographic nonce purged, and local cached state cleared.',
        type: 'warning',
      });
      setShowDisconnectModal(false);
    } finally {
      setIsDisconnecting(false);
    }
  };

  const getWalletDisplayName = () => {
    if (isWatchOnly) return 'Watch-Only (Read-Only Mode)';
    switch (walletType) {
      case 'metamask':
        return 'MetaMask Extension';
      case 'rabby':
        return 'Rabby DeFi Wallet';
      case 'coinbase':
        return 'Coinbase Smart Wallet';
      case 'okx':
        return 'OKX Web3 Wallet';
      case 'phantom':
        return 'Phantom EVM';
      case 'trust':
        return 'Trust Wallet';
      case 'rainbow':
        return 'Rainbow Wallet';
      case 'bitget':
        return 'Bitget / Binance Web3';
      case 'walletconnect':
        return 'WalletConnect v2';
      case 'sandbox':
        return 'Institutional Sandbox';
      default:
        return 'Browser Web3 Provider';
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150"
      onClick={closeAccountModal}
    >
      <div
        className="w-full max-w-xl rounded-3xl bg-[#090D14] border border-white/10 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-white/[0.08] bg-[#06090F]">
          <div className="flex items-center gap-3">
            <div className="relative">
              <span
                className={`w-3 h-3 rounded-full block ${
                  isWatchOnly ? 'bg-amber-400' : isDemoMode ? 'bg-cyan-400' : 'bg-emerald-400'
                }`}
              />
              <span
                className={`w-3 h-3 rounded-full absolute inset-0 animate-ping opacity-75 ${
                  isWatchOnly ? 'bg-amber-400' : isDemoMode ? 'bg-cyan-400' : 'bg-emerald-400'
                }`}
              />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide uppercase font-mono">
                Web3 Account & Wallet Manager
              </h2>
              <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                <span>{getWalletDisplayName()}</span>
                <span>•</span>
                <span
                  className={`font-mono font-bold ${
                    isWatchOnly ? 'text-amber-400' : isDemoMode ? 'text-cyan-400' : 'text-emerald-400'
                  }`}
                >
                  {isWatchOnly ? 'WATCH-ONLY' : isDemoMode ? 'DEMO SANDBOX' : 'LIVE ON-CHAIN'}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={closeAccountModal}
            className="p-2 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-white/[0.06] bg-[#070B12] px-6 pt-2 gap-1 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 pb-3 px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'overview'
                ? 'border-cyan-400 text-cyan-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Wallet className="w-3.5 h-3.5" /> Overview & Balances
          </button>
          <button
            onClick={() => setActiveTab('switch')}
            className={`flex items-center gap-2 pb-3 px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'switch'
                ? 'border-cyan-400 text-cyan-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ArrowRightLeft className="w-3.5 h-3.5" /> Switch Wallet & Accounts
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`flex items-center gap-2 pb-3 px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'security'
                ? 'border-cyan-400 text-cyan-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Shield className="w-3.5 h-3.5" /> Security & Approvals
          </button>
          <button
            onClick={() => setActiveTab('faucet')}
            className={`flex items-center gap-2 pb-3 px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'faucet'
                ? 'border-cyan-400 text-cyan-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Droplets className="w-3.5 h-3.5" /> Capital Faucet
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
          {/* Active Address Bar (Shown across all tabs) */}
          <div className="p-4 rounded-2xl bg-[#0F1422] border border-white/[0.08] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-400 font-mono font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Radio className="w-3 h-3 text-emerald-400 animate-pulse" /> Active Connection
              </span>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-white">
                <ChainLogo chainId={currentChain.id} className="w-3.5 h-3.5" />
                <span>{currentChain.name}</span>
              </div>
            </div>

            <div className="flex items-center justify-between bg-black/50 p-3 rounded-xl border border-white/5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center font-bold text-white text-xs font-mono shadow-inner shrink-0">
                  {address.slice(2, 4).toUpperCase()}
                </div>
                <div>
                  <div className="font-mono text-xs font-bold text-white tracking-wide flex items-center gap-2">
                    <span>{shortenAddress(address, 8)}</span>
                    {isWatchOnly && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-sans font-bold">
                        WATCH-ONLY
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    {address.slice(0, 14)}...{address.slice(-12)}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleCopy}
                  className="p-2 rounded-lg bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white transition-colors cursor-pointer"
                  title="Copy Full Address"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => setShowQr(!showQr)}
                  className="p-2 rounded-lg bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white transition-colors cursor-pointer"
                  title="Show QR Code"
                >
                  <QrCode className="w-4 h-4" />
                </button>
                <a
                  href={explorerUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 rounded-lg bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white transition-colors cursor-pointer"
                  title="View on Explorer"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>

            {showQr && (
              <div className="p-4 bg-white rounded-xl flex flex-col items-center justify-center space-y-2 text-black animate-in fade-in">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(address)}`}
                  alt="Address QR Code"
                  className="w-36 h-36 border border-slate-200 rounded-lg p-1"
                />
                <span className="font-mono text-[10px] text-slate-700 font-bold break-all text-center px-4">
                  {address}
                </span>
              </div>
            )}
          </div>

          {/* TAB 1: Overview & Balances */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-[#0F1422] border border-white/[0.08] space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-400 font-mono font-bold uppercase tracking-wider">
                  <span>Available Liquidity Ledger</span>
                  <span className="text-cyan-400">Audited State</span>
                </div>

                <div className="space-y-1.5 font-mono text-xs">
                  {Object.entries(balances).map(([token, amount]) => (
                    <div
                      key={token}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-black/40 border border-white/5 hover:border-white/10 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold text-white">
                          {token.slice(0, 3)}
                        </span>
                        <span className="font-bold text-white">{token}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-slate-200">
                          {typeof amount === 'number'
                            ? amount.toLocaleString(undefined, { maximumFractionDigits: 4 })
                            : amount}
                        </span>
                        <span className="text-slate-500 ml-1.5 text-[11px]">{token}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Switch Wallet & Accounts */}
          {activeTab === 'switch' && (
            <div className="space-y-4">
              {/* Quick Switch: Installed Browser Extensions */}
              <div className="p-4 rounded-2xl bg-[#0F1422] border border-white/[0.08] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-white">
                    <ArrowRightLeft className="w-4 h-4 text-cyan-400" />
                    <span>Switch to Installed Extension</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">EIP-6963 Auto-Detect</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {POPULAR_EXTENSIONS.map((wallet) => {
                    const isCurrent = walletType === wallet.id && !isWatchOnly;
                    return (
                      <div
                        key={wallet.id}
                        className={`p-3 rounded-xl border transition-all flex items-center justify-between ${
                          isCurrent
                            ? 'bg-cyan-500/10 border-cyan-500/40'
                            : 'bg-black/40 border-white/5 hover:border-white/15'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-[10px] font-mono ${
                              isCurrent ? 'bg-cyan-500 text-black' : 'bg-white/10 text-white'
                            }`}
                          >
                            {wallet.symbol}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-white">{wallet.name}</div>
                            <div className="text-[9px] text-slate-400 font-mono">{wallet.tag}</div>
                          </div>
                        </div>

                        {isCurrent ? (
                          <span className="text-[10px] font-bold text-cyan-400 flex items-center gap-1 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/30">
                            <CheckCircle2 className="w-3 h-3" /> Active
                          </span>
                        ) : (
                          <button
                            onClick={() => handleSwitchToProvider(wallet.id)}
                            disabled={switchingTarget === wallet.id}
                            className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white text-[11px] font-semibold border border-white/10 transition-colors cursor-pointer flex items-center gap-1"
                          >
                            {switchingTarget === wallet.id ? (
                              <RefreshCw className="w-3 h-3 animate-spin" />
                            ) : (
                              <span>Switch</span>
                            )}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Quick Switch: Institutional Sandbox Profiles */}
              <div className="p-4 rounded-2xl bg-[#0F1422] border border-white/[0.08] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-white">
                    <Sliders className="w-4 h-4 text-indigo-400" />
                    <span>Switch Institutional Sandbox Profile</span>
                  </div>
                  <span className="text-[10px] text-amber-400 font-mono font-bold">SIMULATION</span>
                </div>

                <div className="space-y-2">
                  {sandboxAccounts.map((profile, idx) => {
                    const isCurrent = walletType === 'sandbox' && activeSandboxIndex === idx && !isWatchOnly;
                    return (
                      <div
                        key={profile.address}
                        className={`p-3 rounded-xl border transition-all flex items-center justify-between ${
                          isCurrent
                            ? 'bg-indigo-500/15 border-indigo-500/40'
                            : 'bg-black/40 border-white/5 hover:border-white/15'
                        }`}
                      >
                        <div>
                          <div className="text-xs font-bold text-white flex items-center gap-2">
                            <span>{profile.name}</span>
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-slate-300 font-mono">
                              {profile.tag}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            {shortenAddress(profile.address, 6)} • {profile.balances.ETH} ETH • ${profile.balances.USDC.toLocaleString()} USDC
                          </div>
                        </div>

                        {isCurrent ? (
                          <span className="text-[10px] font-bold text-indigo-300 flex items-center gap-1 bg-indigo-500/20 px-2 py-0.5 rounded-full border border-indigo-500/30">
                            <CheckCircle2 className="w-3 h-3" /> Active
                          </span>
                        ) : (
                          <button
                            onClick={() => handleSwitchSandbox(idx)}
                            className="px-3 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 text-[11px] font-semibold border border-indigo-500/30 transition-colors cursor-pointer"
                          >
                            Switch Profile
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Watch-Only / Impersonate Any Address */}
              <div className="p-4 rounded-2xl bg-[#0F1422] border border-white/[0.08] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-white">
                    <Eye className="w-4 h-4 text-amber-400" />
                    <span>Watch-Only / Impersonate EVM Address</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">Read-Only Safe</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Enter any public Ethereum or L2 address to test swap routes, review portfolio breakdown, and simulate trades without exposing private keys.
                </p>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="0x... paste any EVM address"
                    value={impersonateInput}
                    onChange={(e) => setImpersonateInput(e.target.value)}
                    className="flex-1 bg-black/50 border border-white/10 focus:border-amber-500/50 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 font-mono outline-none"
                  />
                  <button
                    onClick={() => handleImpersonate()}
                    className="px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-bold rounded-xl cursor-pointer transition-colors"
                  >
                    Inspect
                  </button>
                </div>

                {impersonateError && (
                  <div className="text-[11px] text-rose-400 flex items-center gap-1.5 font-mono">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>{impersonateError}</span>
                  </div>
                )}

                {/* Quick Presets */}
                <div className="pt-1">
                  <div className="text-[10px] text-slate-400 font-mono uppercase tracking-wider mb-1.5">
                    Quick Whales:
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {WATCH_PRESETS.map((preset) => (
                      <button
                        key={preset.address}
                        onClick={() => handleImpersonate(preset.address, preset.label)}
                        className="text-[10px] px-2.5 py-1 rounded-lg bg-white/5 hover:bg-amber-500/15 text-slate-300 hover:text-amber-300 border border-white/10 hover:border-amber-500/30 transition-colors font-mono cursor-pointer"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Recent Accounts History */}
              {recentAccounts && recentAccounts.length > 0 && (
                <div className="p-4 rounded-2xl bg-[#0F1422] border border-white/[0.08] space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-white">
                      <History className="w-4 h-4 text-cyan-400" />
                      <span>Recent Connected Accounts</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">{recentAccounts.length} saved</span>
                  </div>

                  <div className="space-y-1.5">
                    {recentAccounts.map((acc) => {
                      const isCurrent = acc.address.toLowerCase() === address.toLowerCase();
                      return (
                        <div
                          key={acc.address}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-black/40 border border-white/5 text-xs font-mono"
                        >
                          <div>
                            <div className="font-bold text-white">{shortenAddress(acc.address, 6)}</div>
                            <div className="text-[10px] text-slate-400">{acc.name || acc.type.toUpperCase()}</div>
                          </div>

                          <div className="flex items-center gap-2">
                            {isCurrent ? (
                              <span className="text-[10px] text-emerald-400 font-bold">Active</span>
                            ) : (
                              <button
                                onClick={() => {
                                  if (acc.type === 'sandbox') {
                                    handleSwitchSandbox(0);
                                  } else {
                                    handleSwitchToProvider(acc.type);
                                  }
                                }}
                                className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white text-[10px] font-bold cursor-pointer"
                              >
                                Connect
                              </button>
                            )}
                            <button
                              onClick={() => removeRecentAccount(acc.address)}
                              className="p-1 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                              title="Remove from history"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Security, SIWE & Token Approvals */}
          {activeTab === 'security' && (
            <div className="space-y-4">
              {/* EIP-4361 SIWE Signature Card */}
              <div className="p-4 rounded-2xl bg-[#0F1420] border border-white/[0.08] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-white">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>EIP-4361 Sign-In With Ethereum (SIWE)</span>
                  </div>
                  {isSiweAuthenticated ? (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold">
                      VERIFIED
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold">
                      UNSIGNED
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Cryptographic authentication binds your session nonce to prevent man-in-the-middle attacks and ensure 100% genuine message provenance.
                </p>
                {!isSiweAuthenticated && (
                  <button
                    onClick={handleSiweAuth}
                    disabled={isAuthenticating}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isAuthenticating ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Zap className="w-3.5 h-3.5" />
                    )}
                    <span>Sign Cryptographic SIWE Handshake</span>
                  </button>
                )}
              </div>

              {/* Zero-Trust Allowance Revoke Manager */}
              <div className="p-4 rounded-2xl bg-[#0F1420] border border-white/[0.08] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-white">
                    <Sliders className="w-4 h-4 text-cyan-400" />
                    <span>Smart Contract Allowance Manager</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">Zero-Trust</span>
                </div>
                <p className="text-xs text-slate-400">
                  Manage token spending limits for Hyperon Swap Router. Revoke approvals anytime to protect stored tokens from unauthorized drains:
                </p>

                <div className="space-y-2">
                  {Object.entries(tokenApprovals).map(([token, isApproved]) => (
                    <div
                      key={token}
                      className="p-2.5 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white font-mono">{token}</span>
                        <span
                          className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                            isApproved
                              ? 'bg-emerald-500/15 text-emerald-400'
                              : 'bg-slate-500/15 text-slate-400'
                          }`}
                        >
                          {isApproved ? 'Approved' : 'Revoked'}
                        </span>
                      </div>

                      <button
                        onClick={() => handleToggleApproval(token, isApproved)}
                        className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                          isApproved
                            ? 'bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30'
                            : 'bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30'
                        }`}
                      >
                        {isApproved ? 'Revoke Approval' : 'Permit Token'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Emergency Zero-Trust Disconnect Card */}
              <div className="p-4 rounded-2xl bg-rose-950/20 border border-rose-500/30 space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-bold text-rose-400">
                  <ShieldAlert className="w-4 h-4" />
                  <span>Emergency Zero-Trust Disconnect</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Immediately revokes all router token allowances, clears cryptographic credentials from browser storage, resets memory, and breaks active provider connections.
                </p>
                <button
                  onClick={handleZeroTrustDisconnect}
                  disabled={isDisconnecting}
                  className="w-full py-2.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  <ShieldX className="w-4 h-4" />
                  <span>Execute Zero-Trust Emergency Purge</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: Testnet Faucet */}
          {activeTab === 'faucet' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-950/40 to-indigo-950/40 border border-blue-500/25 space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-white">
                  <span className="flex items-center gap-2 text-cyan-300">
                    <Droplets className="w-4 h-4 text-cyan-400" /> Instant Test Capital Faucet
                  </span>
                  <span className="text-[10px] text-emerald-400 font-mono font-bold">UNLIMITED FREE</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Request immediate test funds directly into your active session to test swaps, add liquidity to AMM pools, or execute cross-chain bridging:
                </p>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={() => handleClaimFaucet('ETH', 1.0)}
                    disabled={faucetLoading}
                    className="py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-bold border border-white/10 transition-colors cursor-pointer flex items-center justify-between"
                  >
                    <span>+1.0 Native ETH</span>
                    <span className="text-[10px] text-slate-400">Gas & Swap</span>
                  </button>
                  <button
                    onClick={() => handleClaimFaucet('USDC', 2500)}
                    disabled={faucetLoading}
                    className="py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-bold border border-white/10 transition-colors cursor-pointer flex items-center justify-between"
                  >
                    <span>+2,500 USDC</span>
                    <span className="text-[10px] text-emerald-400">Stablecoin</span>
                  </button>
                  <button
                    onClick={() => handleClaimFaucet('HYPR', 1000)}
                    disabled={faucetLoading}
                    className="py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-cyan-300 text-xs font-bold border border-cyan-500/30 transition-colors cursor-pointer flex items-center justify-between"
                  >
                    <span>+1,000 HYPR</span>
                    <span className="text-[10px] text-cyan-400">Governance</span>
                  </button>
                  <button
                    onClick={() => handleClaimFaucet('WBTC', 0.1)}
                    disabled={faucetLoading}
                    className="py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-amber-300 text-xs font-bold border border-amber-500/30 transition-colors cursor-pointer flex items-center justify-between"
                  >
                    <span>+0.10 WBTC</span>
                    <span className="text-[10px] text-amber-400">Wrapped BTC</span>
                  </button>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-black/30 border border-white/5 text-[11px] text-slate-400 flex items-center justify-between">
                <span>Reset all token allocations to default state</span>
                <button
                  onClick={() => {
                    resetBalances();
                    addToast({
                      title: 'Balances Restored',
                      message: 'Default portfolio allocations restored.',
                      type: 'info',
                    });
                  }}
                  className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset Balances</span>
                </button>
              </div>
            </div>
          )}

          {/* Action Buttons: Switch Wallet & Disconnect */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setActiveTab('switch')}
              className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <ArrowRightLeft className="w-3.5 h-3.5 text-cyan-400" />
              <span>Switch Wallet / Profile</span>
            </button>
            <button
              onClick={() => setShowDisconnectModal(true)}
              className="flex-1 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/25 text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Disconnect Session</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-[#06090F] border-t border-white/[0.08] flex items-center justify-between text-[11px] text-slate-400 font-mono">
          <div className="flex items-center gap-1.5 text-emerald-400">
            <ShieldCheck className="w-4 h-4" />
            <span>Audited Smart Contract Layer</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-500">
            <Lock className="w-3 h-3" />
            <span>Non-Custodial DEX</span>
          </div>
        </div>
      </div>

      {/* Disconnect Options Confirmation Modal */}
      {showDisconnectModal && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in"
          onClick={() => setShowDisconnectModal(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl bg-[#0C101A] border border-white/15 p-6 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-white font-bold text-sm">
                <LogOut className="w-4 h-4 text-rose-400" />
                <span>Disconnect Web3 Session</span>
              </div>
              <button
                onClick={() => setShowDisconnectModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Select your preferred security level for terminating this session with address{' '}
              <span className="font-mono text-cyan-300 font-bold">{shortenAddress(address, 6)}</span>:
            </p>

            <div className="space-y-2.5">
              {/* Option 1: Standard Disconnect */}
              <button
                onClick={handleStandardDisconnect}
                disabled={isDisconnecting}
                className="w-full p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-left transition-all cursor-pointer group flex items-start justify-between"
              >
                <div>
                  <div className="text-xs font-bold text-white group-hover:text-cyan-300 flex items-center gap-1.5">
                    <LogOut className="w-3.5 h-3.5 text-slate-400" /> Standard Disconnect
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1 leading-snug">
                    Cleans session and disconnects provider. Keeps recent accounts history for fast 1-click reconnect.
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 shrink-0 ml-2" />
              </button>

              {/* Option 2: Zero-Trust Disconnect */}
              <button
                onClick={handleZeroTrustDisconnect}
                disabled={isDisconnecting}
                className="w-full p-3.5 rounded-2xl bg-rose-950/20 hover:bg-rose-950/40 border border-rose-500/30 text-left transition-all cursor-pointer group flex items-start justify-between"
              >
                <div>
                  <div className="text-xs font-bold text-rose-300 group-hover:text-rose-200 flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-rose-400" /> Zero-Trust Security Purge
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1 leading-snug">
                    Revokes all DEX router token approvals, destroys cryptographic SIWE keys, and purges all local cache.
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-rose-400 shrink-0 ml-2" />
              </button>
            </div>

            <button
              onClick={() => setShowDisconnectModal(false)}
              className="w-full py-2 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer text-center"
            >
              Cancel & Keep Connected
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
