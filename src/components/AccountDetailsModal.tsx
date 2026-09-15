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
} from 'lucide-react';

export const AccountDetailsModal: React.FC = () => {
  const {
    isAccountModalOpen,
    closeAccountModal,
    address,
    chainId,
    walletType,
    balances,
    isSiweAuthenticated,
    authenticateSiwe,
    disconnectWallet,
    requestFaucetFunds,
    resetBalances,
  } = useWallet();
  const { addToast } = useExchange();

  const [copied, setCopied] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [faucetLoading, setFaucetLoading] = useState(false);

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
      } else {
        addToast({
          title: 'SIWE Signature Cancelled',
          message: 'Authentication signature rejected by wallet.',
          type: 'warning',
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150"
      onClick={closeAccountModal}
    >
      <div
        className="w-full max-w-md rounded-3xl bg-[#0B0F17] border border-white/10 shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-[#070A10]">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <h2 className="text-sm font-bold text-white tracking-wide uppercase font-mono">Connected Account</h2>
          </div>
          <button
            onClick={closeAccountModal}
            className="p-1.5 rounded-xl hover:bg-white/5 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Address & Network Card */}
          <div className="p-4 rounded-2xl bg-[#0F1420] border border-white/[0.06] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-mono">PROVIDER & NETWORK</span>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                <ChainLogo chainId={currentChain.id} className="w-3.5 h-3.5" />
                <span>{currentChain.name}</span>
              </div>
            </div>

            <div className="flex items-center justify-between bg-black/40 p-3 rounded-xl border border-white/5">
              <span className="font-mono text-xs font-bold text-white tracking-wide">
                {shortenAddress(address, 8)}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleCopy}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
                  title="Copy Full Address"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                <a
                  href={explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
                  title="View on Explorer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            {/* SIWE Status */}
            <div className="flex items-center justify-between pt-1 text-xs">
              <div className="flex items-center gap-1.5">
                {isSiweAuthenticated ? (
                  <span className="flex items-center gap-1 text-emerald-400 font-medium">
                    <ShieldCheck className="w-4 h-4" /> EIP-4361 SIWE Verified
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-amber-400 font-medium">
                    <ShieldAlert className="w-4 h-4" /> Unsigned Session
                  </span>
                )}
              </div>
              {!isSiweAuthenticated && (
                <button
                  onClick={handleSiweAuth}
                  disabled={isAuthenticating}
                  className="px-2.5 py-1 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 text-cyan-400 border border-blue-500/30 text-[11px] font-bold transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1"
                >
                  {isAuthenticating ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                  <span>Sign SIWE</span>
                </button>
              )}
            </div>
          </div>

          {/* Balances List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
              <span>TOKEN BALANCES ({currentChain.shortName})</span>
              <span className="text-cyan-400">LIVE RPC SYNCED</span>
            </div>
            <div className="grid grid-cols-2 gap-2 font-mono text-xs">
              <div className="p-2.5 rounded-xl bg-[#0F1420] border border-white/5 flex justify-between items-center">
                <span className="text-slate-400">ETH</span>
                <span className="font-bold text-white">{(balances.ETH || 0).toFixed(4)}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-[#0F1420] border border-white/5 flex justify-between items-center">
                <span className="text-slate-400">USDC</span>
                <span className="font-bold text-white">${(balances.USDC || 0).toLocaleString()}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-[#0F1420] border border-white/5 flex justify-between items-center">
                <span className="text-slate-400">HYPR</span>
                <span className="font-bold text-cyan-400">{(balances.HYPR || 2500).toLocaleString()}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-[#0F1420] border border-white/5 flex justify-between items-center">
                <span className="text-slate-400">WBTC</span>
                <span className="font-bold text-white">{(balances.WBTC || 0).toFixed(3)}</span>
              </div>
            </div>
          </div>

          {/* Testnet / Sandbox Faucet */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-950/40 to-indigo-950/40 border border-blue-500/20 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-bold text-white">
              <span className="flex items-center gap-1.5 text-cyan-300">
                <Droplets className="w-3.5 h-3.5 text-cyan-400" /> Instant Test Capital Faucet
              </span>
              <span className="text-[10px] text-slate-400 font-mono">Zero Fee</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleClaimFaucet('ETH', 1.0)}
                disabled={faucetLoading}
                className="flex-1 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold border border-white/10 transition-colors cursor-pointer"
              >
                +1.0 ETH
              </button>
              <button
                onClick={() => handleClaimFaucet('USDC', 2500)}
                disabled={faucetLoading}
                className="flex-1 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold border border-white/10 transition-colors cursor-pointer"
              >
                +2.5k USDC
              </button>
              <button
                onClick={() => handleClaimFaucet('HYPR', 1000)}
                disabled={faucetLoading}
                className="flex-1 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-cyan-300 text-xs font-semibold border border-cyan-500/30 transition-colors cursor-pointer"
              >
                +1k HYPR
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => {
                resetBalances();
                addToast({
                  title: 'Balances Reset',
                  message: 'Default sandbox allocations restored.',
                  type: 'info',
                });
              }}
              className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Balances</span>
            </button>
            <button
              onClick={disconnectWallet}
              className="flex-1 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Disconnect</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
