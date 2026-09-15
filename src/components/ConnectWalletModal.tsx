import React, { useState, useEffect } from 'react';
import { useWallet, SupportedWalletType } from '../context/WalletContext';
import { useExchange } from '../context/ExchangeContext';
import {
  X,
  Wallet,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  QrCode,
  Laptop,
  Terminal,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Lock,
} from 'lucide-react';

interface WalletOption {
  id: SupportedWalletType;
  name: string;
  description: string;
  badge?: string;
  iconUrl: string;
  isInstalled: boolean;
  category: 'injected' | 'mobile' | 'sandbox';
}

export const ConnectWalletModal: React.FC = () => {
  const { isConnectModalOpen, closeConnectModal, connectWallet, isConnected } = useWallet();
  const { addToast } = useExchange();

  const [activeTab, setActiveTab] = useState<'wallets' | 'qr' | 'sandbox'>('wallets');
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Check browser extension presence
  const [hasMetaMask, setHasMetaMask] = useState(false);
  const [hasCoinbase, setHasCoinbase] = useState(false);
  const [hasPhantom, setHasPhantom] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const eth = (window as any).ethereum;
      setHasMetaMask(Boolean(eth?.isMetaMask));
      setHasCoinbase(Boolean(eth?.isCoinbaseWallet || (window as any).coinbaseWalletExtension));
      setHasPhantom(Boolean((window as any).phantom?.ethereum));
    }
  }, [isConnectModalOpen]);

  if (!isConnectModalOpen) return null;

  const walletOptions: WalletOption[] = [
    {
      id: 'metamask',
      name: 'MetaMask',
      description: 'Desktop browser extension & mobile app',
      badge: hasMetaMask ? 'DETECTED' : 'POPULAR',
      iconUrl: 'https://assets.coingecko.com/markets/images/681/small/metamask.png',
      isInstalled: hasMetaMask,
      category: 'injected',
    },
    {
      id: 'coinbase',
      name: 'Coinbase Wallet',
      description: 'Self-custody crypto wallet & dApp browser',
      badge: hasCoinbase ? 'DETECTED' : undefined,
      iconUrl: 'https://assets.coingecko.com/markets/images/569/small/coinbase.png',
      isInstalled: hasCoinbase,
      category: 'injected',
    },
    {
      id: 'phantom',
      name: 'Phantom EVM',
      description: 'Multi-chain friendly self-custodial wallet',
      badge: hasPhantom ? 'DETECTED' : undefined,
      iconUrl: 'https://assets.coingecko.com/coins/images/21800/small/phantom.png',
      isInstalled: hasPhantom,
      category: 'injected',
    },
    {
      id: 'injected',
      name: 'Browser Injected (EIP-1193)',
      description: 'Brave, Trust Wallet, Rabby, or Rainbow',
      badge: 'UNIVERSAL',
      iconUrl: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
      isInstalled: typeof window !== 'undefined' && Boolean((window as any).ethereum),
      category: 'injected',
    },
    {
      id: 'walletconnect',
      name: 'WalletConnect v2',
      description: 'Scan with 300+ mobile EVM wallets',
      badge: 'QR CODE',
      iconUrl: 'https://assets.coingecko.com/coins/images/23307/small/walletconnect.png',
      isInstalled: true,
      category: 'mobile',
    },
    {
      id: 'sandbox',
      name: 'Institutional Sandbox',
      description: 'Non-custodial test environment with 10k USDC + 5 ETH',
      badge: '1-CLICK TEST',
      iconUrl: 'https://assets.coingecko.com/coins/images/325/small/Tether.png',
      isInstalled: true,
      category: 'sandbox',
    },
  ];

  const handleSelectWallet = async (wallet: WalletOption) => {
    setConnectingId(wallet.id);
    setErrorMessage(null);

    try {
      if (wallet.id === 'walletconnect') {
        setActiveTab('qr');
        setConnectingId(null);
        return;
      }

      await connectWallet(wallet.id);
      addToast({
        title: 'Wallet Connected',
        message: `Successfully connected via ${wallet.name}. Non-custodial session initialized.`,
        type: 'success',
      });
    } catch (err: any) {
      setErrorMessage(err?.message || 'Connection failed. Please unlock your wallet and approve the request.');
    } finally {
      setConnectingId(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150"
      onClick={closeConnectModal}
    >
      <div
        className="w-full max-w-lg rounded-3xl bg-[#0B0F17] border border-white/10 shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-[#070A10]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 text-cyan-400 border border-blue-500/20">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide">Connect Web3 Wallet</h2>
              <p className="text-[11px] text-slate-400 font-mono">Select non-custodial provider or institutional sandbox</p>
            </div>
          </div>
          <button
            onClick={closeConnectModal}
            className="p-2 rounded-xl hover:bg-white/5 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-white/[0.06] bg-[#090D14] px-6 pt-2">
          <button
            onClick={() => setActiveTab('wallets')}
            className={`flex items-center gap-2 pb-3 px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'wallets'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Laptop className="w-3.5 h-3.5" /> Popular Wallets
          </button>
          <button
            onClick={() => setActiveTab('qr')}
            className={`flex items-center gap-2 pb-3 px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'qr'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" /> Mobile QR
          </button>
          <button
            onClick={() => setActiveTab('sandbox')}
            className={`flex items-center gap-2 pb-3 px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'sandbox'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" /> Developer Sandbox
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center justify-between">
              <span>{errorMessage}</span>
              <button
                onClick={() => setErrorMessage(null)}
                className="text-rose-300 hover:text-white font-bold ml-2"
              >
                ✕
              </button>
            </div>
          )}

          {activeTab === 'wallets' && (
            <div className="space-y-2">
              {walletOptions
                .filter((w) => w.category === 'injected' || w.category === 'mobile')
                .map((wallet) => (
                  <button
                    key={wallet.id}
                    onClick={() => handleSelectWallet(wallet)}
                    disabled={connectingId === wallet.id}
                    className="w-full p-3.5 rounded-2xl bg-[#0F1420] hover:bg-[#151D2E] border border-white/[0.06] hover:border-cyan-500/30 transition-all flex items-center justify-between group cursor-pointer text-left"
                  >
                    <div className="flex items-center gap-3.5">
                      <img
                        src={wallet.iconUrl}
                        alt={wallet.name}
                        className="w-9 h-9 rounded-xl object-contain bg-white/5 p-1 shrink-0"
                        onError={(e: any) => {
                          e.target.style.display = 'none';
                        }}
                      />
                      <div>
                        <div className="text-sm font-bold text-white flex items-center gap-2">
                          <span>{wallet.name}</span>
                          {wallet.badge && (
                            <span
                              className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold ${
                                wallet.badge === 'DETECTED'
                                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                  : 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                              }`}
                            >
                              {wallet.badge}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">{wallet.description}</div>
                      </div>
                    </div>

                    <div className="shrink-0 text-slate-500 group-hover:text-cyan-400 transition-colors">
                      {connectingId === wallet.id ? (
                        <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
                      ) : (
                        <ArrowRight className="w-4 h-4" />
                      )}
                    </div>
                  </button>
                ))}
            </div>
          )}

          {activeTab === 'qr' && (
            <div className="p-6 rounded-2xl bg-[#0F1420] border border-white/[0.06] flex flex-col items-center text-center space-y-4">
              <div className="p-4 bg-white rounded-2xl shadow-xl">
                {/* Visual SVG QR Code Matrix */}
                <svg className="w-44 h-44" viewBox="0 0 100 100" fill="none">
                  <rect width="100" height="100" fill="white" />
                  <rect x="10" y="10" width="25" height="25" fill="#000" />
                  <rect x="15" y="15" width="15" height="15" fill="#fff" />
                  <rect x="18" y="18" width="9" height="9" fill="#000" />

                  <rect x="65" y="10" width="25" height="25" fill="#000" />
                  <rect x="70" y="15" width="15" height="15" fill="#fff" />
                  <rect x="73" y="18" width="9" height="9" fill="#000" />

                  <rect x="10" y="65" width="25" height="25" fill="#000" />
                  <rect x="15" y="70" width="15" height="15" fill="#fff" />
                  <rect x="18" y="73" width="9" height="9" fill="#000" />

                  {/* Matrix Dots */}
                  <rect x="42" y="15" width="6" height="6" fill="#000" />
                  <rect x="52" y="15" width="6" height="6" fill="#000" />
                  <rect x="42" y="25" width="6" height="6" fill="#000" />
                  <rect x="52" y="32" width="6" height="6" fill="#000" />
                  <rect x="25" y="42" width="6" height="6" fill="#000" />
                  <rect x="35" y="42" width="6" height="6" fill="#000" />
                  <rect x="48" y="48" width="8" height="8" fill="#0052FF" />
                  <rect x="62" y="42" width="6" height="6" fill="#000" />
                  <rect x="75" y="42" width="6" height="6" fill="#000" />
                  <rect x="42" y="65" width="6" height="6" fill="#000" />
                  <rect x="52" y="75" width="6" height="6" fill="#000" />
                  <rect x="65" y="65" width="6" height="6" fill="#000" />
                  <rect x="75" y="75" width="6" height="6" fill="#000" />
                  <rect x="85" y="65" width="6" height="6" fill="#000" />
                </svg>
              </div>

              <div>
                <div className="text-sm font-bold text-white">Scan with your Mobile Wallet</div>
                <div className="text-xs text-slate-400 mt-1 max-w-xs">
                  Open MetaMask Mobile, Rainbow, or Trust Wallet and tap the QR scanner icon.
                </div>
              </div>

              <button
                onClick={() => {
                  connectWallet('demo');
                  addToast({
                    title: 'Paired with Mobile Wallet',
                    message: 'Simulated WalletConnect v2 session established.',
                    type: 'success',
                  });
                }}
                className="w-full py-2.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/20 text-xs font-bold transition-colors cursor-pointer"
              >
                Instant Pair Simulation
              </button>
            </div>
          )}

          {activeTab === 'sandbox' && (
            <div className="p-5 rounded-2xl bg-[#0F1420] border border-cyan-500/20 space-y-3">
              <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold font-mono">
                <Sparkles className="w-4 h-4" />
                <span>Zero-Friction Institutional Sandbox Mode</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Connect immediately without requiring a browser extension. Comes preloaded with test capital to experience real algorithmic routing, multi-pool swaps, and cross-chain bridging:
              </p>
              <div className="grid grid-cols-3 gap-2 font-mono text-xs">
                <div className="p-2 rounded-xl bg-black/40 border border-white/5 text-center">
                  <div className="text-slate-400 text-[10px]">ETH</div>
                  <div className="font-bold text-white mt-0.5">4.85 ETH</div>
                </div>
                <div className="p-2 rounded-xl bg-black/40 border border-white/5 text-center">
                  <div className="text-slate-400 text-[10px]">USDC</div>
                  <div className="font-bold text-white mt-0.5">$14,250</div>
                </div>
                <div className="p-2 rounded-xl bg-black/40 border border-white/5 text-center">
                  <div className="text-slate-400 text-[10px]">HYPR</div>
                  <div className="font-bold text-cyan-400 mt-0.5">2,500</div>
                </div>
              </div>

              <button
                onClick={() => {
                  connectWallet('sandbox');
                  addToast({
                    title: 'Sandbox Activated',
                    message: 'Non-custodial demo account 0x71C2...9E42 ready.',
                    type: 'info',
                  });
                }}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold text-xs shadow-lg shadow-blue-900/30 transition-all cursor-pointer"
              >
                Launch Sandbox Session Now
              </button>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-[#070A10] border-t border-white/[0.08] flex items-center justify-between text-[11px] text-slate-400 font-mono">
          <div className="flex items-center gap-1.5 text-emerald-400">
            <ShieldCheck className="w-4 h-4" />
            <span>Non-Custodial & EIP-4361 Ready</span>
          </div>
          <a
            href="https://ethereum.org/en/developers/docs/standards/tokens/erc-4361/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 hover:text-white transition-colors"
          >
            <span>SIWE Docs</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
};
