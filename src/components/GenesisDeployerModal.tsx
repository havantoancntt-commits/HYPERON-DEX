import React, { useState, useEffect } from 'react';
import { useWallet } from '../context/WalletContext';
import { useExchange } from '../context/ExchangeContext';
import { soundManager } from '../lib/sound';
import { shortenAddress, formatCurrency } from '../lib/utils';
import {
  HYPERON_TOKEN_ABI,
  HYPERON_TOKEN_BYTECODE,
  HYPERON_TOKEN_FLATTENED_SOURCE,
} from '../contracts/HyperonTokenArtifact';
import {
  recordDeployment,
  getHyprContractAddress,
  DEFAULT_HYPR_ADDRESS,
  resetHyprContractAddress,
  getStoredDeployments,
  DeployedContractRecord,
} from '../lib/hyprConfig';
import { encodeDeployData, createPublicClient, http } from 'viem';
import {
  sepolia,
  mainnet,
  arbitrum,
  base,
  optimism,
  polygon,
  bsc,
} from 'viem/chains';
import {
  Rocket,
  ShieldCheck,
  CheckCircle2,
  Copy,
  Check,
  ExternalLink,
  Plus,
  Flame,
  Layers,
  Code2,
  AlertTriangle,
  RefreshCw,
  X,
  FileCode,
  Globe,
  Coins,
  ChevronRight,
  Info,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface GenesisDeployerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NetworkOption {
  chainId: number;
  hexChainId: string;
  chainKey: string;
  name: string;
  type: 'testnet' | 'mainnet';
  costEst: string;
  recommended?: boolean;
  faucetUrl?: string;
  explorerUrl: string;
  chainObj: any;
}

const SUPPORTED_NETWORKS: NetworkOption[] = [
  {
    chainId: 11155111,
    hexChainId: '0xaa36a7',
    chainKey: 'sepolia',
    name: 'Ethereum Sepolia Testnet',
    type: 'testnet',
    costEst: '0 USD (Free Testnet ETH)',
    recommended: true,
    faucetUrl: 'https://cloud.google.com/application/web3/faucet/ethereum/sepolia',
    explorerUrl: 'https://sepolia.etherscan.io',
    chainObj: sepolia,
  },
  {
    chainId: 8453,
    hexChainId: '0x2105',
    chainKey: 'base',
    name: 'Base (Coinbase L2)',
    type: 'mainnet',
    costEst: '~$0.08 - $0.20 USD',
    recommended: true,
    explorerUrl: 'https://basescan.org',
    chainObj: base,
  },
  {
    chainId: 42161,
    hexChainId: '0xa4b1',
    chainKey: 'arbitrum',
    name: 'Arbitrum One',
    type: 'mainnet',
    costEst: '~$0.10 - $0.25 USD',
    recommended: true,
    explorerUrl: 'https://arbiscan.io',
    chainObj: arbitrum,
  },
  {
    chainId: 137,
    hexChainId: '0x89',
    chainKey: 'polygon',
    name: 'Polygon PoS',
    type: 'mainnet',
    costEst: '~$0.02 - $0.05 USD',
    explorerUrl: 'https://polygonscan.com',
    chainObj: polygon,
  },
  {
    chainId: 56,
    hexChainId: '0x38',
    chainKey: 'bsc',
    name: 'BNB Smart Chain',
    type: 'mainnet',
    costEst: '~$0.15 - $0.35 USD',
    explorerUrl: 'https://bscscan.com',
    chainObj: bsc,
  },
  {
    chainId: 10,
    hexChainId: '0xa',
    chainKey: 'optimism',
    name: 'Optimism (OP Mainnet)',
    type: 'mainnet',
    costEst: '~$0.12 - $0.25 USD',
    explorerUrl: 'https://optimistic.etherscan.io',
    chainObj: optimism,
  },
  {
    chainId: 1,
    hexChainId: '0x1',
    chainKey: 'ethereum',
    name: 'Ethereum Mainnet',
    type: 'mainnet',
    costEst: '~$15 - $35 USD (Gas phụ thuộc mạng)',
    explorerUrl: 'https://etherscan.io',
    chainObj: mainnet,
  },
];

export const GenesisDeployerModal: React.FC<GenesisDeployerModalProps> = ({ isOpen, onClose }) => {
  const {
    address,
    isConnected,
    openConnectModal,
    chainId: activeChainId,
    activeCustomProvider,
    addTokenToWallet,
  } = useWallet();
  const { addToast } = useExchange();

  const [activeTab, setActiveTab] = useState<'1click' | 'source' | 'remix' | 'guide'>('1click');
  const [selectedNetwork, setSelectedNetwork] = useState<NetworkOption>(SUPPORTED_NETWORKS[0]);
  const [deployStep, setDeployStep] = useState<'IDLE' | 'SWITCHING_CHAIN' | 'PREPARING' | 'AWAITING_SIGN' | 'BROADCASTING' | 'CONFIRMING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [deployedContractAddress, setDeployedContractAddress] = useState<string | null>(null);
  const [deploymentTxHash, setDeploymentTxHash] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedSource, setCopiedSource] = useState(false);
  const [copiedAddr, setCopiedAddr] = useState(false);
  const [recentDeployments, setRecentDeployments] = useState<DeployedContractRecord[]>([]);

  useEffect(() => {
    if (isOpen) {
      setRecentDeployments(getStoredDeployments());
      // Match current chain if possible
      const match = SUPPORTED_NETWORKS.find(
        (n) => n.chainKey === String(activeChainId).toLowerCase() || n.chainId.toString() === String(activeChainId)
      );
      if (match) {
        setSelectedNetwork(match);
      }
    }
  }, [isOpen, activeChainId]);

  if (!isOpen) return null;

  const currentActiveHyprAddress = getHyprContractAddress();

  const switchOrAddNetwork = async (target: NetworkOption): Promise<boolean> => {
    const provider = activeCustomProvider || (typeof window !== 'undefined' ? (window as any).ethereum : null);
    if (!provider) {
      throw new Error('Không phát hiện tiện ích ví Web3 trên trình duyệt.');
    }
    try {
      await provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: target.hexChainId }],
      });
      return true;
    } catch (switchError: any) {
      // Chain not added (error code 4902)
      if (switchError?.code === 4902 || switchError?.message?.includes('4902')) {
        try {
          await provider.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: target.hexChainId,
                chainName: target.name,
                rpcUrls: target.chainObj.rpcUrls.default.http,
                nativeCurrency: target.chainObj.nativeCurrency,
                blockExplorerUrls: [target.explorerUrl],
              },
            ],
          });
          return true;
        } catch (addError: any) {
          throw new Error(`Không thể thêm mạng ${target.name} vào ví: ${addError.message}`);
        }
      }
      throw switchError;
    }
  };

  const handle1ClickDeploy = async () => {
    if (!isConnected || !address) {
      openConnectModal();
      return;
    }

    setDeployStep('PREPARING');
    setErrorMessage(null);
    setDeployedContractAddress(null);
    setDeploymentTxHash(null);
    soundManager.playTick();

    const provider = activeCustomProvider || (typeof window !== 'undefined' ? (window as any).ethereum : null);
    if (!provider) {
      setErrorMessage('Không tìm thấy tiện ích ví Web3 (MetaMask, Rabby, OKX...). Vui lòng cài đặt ví để triển khai.');
      setDeployStep('ERROR');
      return;
    }

    try {
      // 1. Ensure correct chain
      if (activeChainId !== selectedNetwork.chainId) {
        setDeployStep('SWITCHING_CHAIN');
        await switchOrAddNetwork(selectedNetwork);
      }

      // 2. Encode constructor with initialOwner = connected address
      setDeployStep('PREPARING');
      const deployData = encodeDeployData({
        abi: HYPERON_TOKEN_ABI,
        bytecode: HYPERON_TOKEN_BYTECODE,
        args: [address as `0x${string}`],
      });

      // 3. Awaiting signature
      setDeployStep('AWAITING_SIGN');
      const txHash = await provider.request({
        method: 'eth_sendTransaction',
        params: [
          {
            from: address,
            data: deployData,
          },
        ],
      });

      setDeploymentTxHash(txHash);
      setDeployStep('BROADCASTING');
      soundManager.playTick();

      // 4. Poll for receipt
      setDeployStep('CONFIRMING');
      const publicClient = createPublicClient({
        chain: selectedNetwork.chainObj,
        transport: http(),
      });

      const receipt = await publicClient.waitForTransactionReceipt({
        hash: txHash as `0x${string}`,
        timeout: 120_000,
      });

      if (!receipt.contractAddress) {
        throw new Error('Giao dịch đã được xác nhận nhưng không tìm thấy địa chỉ hợp đồng.');
      }

      const newAddress = receipt.contractAddress;
      setDeployedContractAddress(newAddress);
      setDeployStep('SUCCESS');
      soundManager.playSuccess();

      // Trigger Celebration Confetti!
      try {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 },
        });
      } catch {
        // ignore confetti error
      }

      // Record deployment in storage & set as active
      recordDeployment({
        address: newAddress,
        chainId: selectedNetwork.chainId,
        chainName: selectedNetwork.name,
        txHash,
        deployedAt: Date.now(),
        deployerAddress: address,
        initialSupply: '1,000,000,000 HYPR',
      });
      setRecentDeployments(getStoredDeployments());

      addToast({
        title: 'Đồng Coin HYPR Thật Đã Triển Khai Thành Công!',
        message: `Hợp đồng on-chain: ${shortenAddress(newAddress, 8)}. Bạn sở hữu 1,000,000,000 HYPR!`,
        type: 'success',
      });
    } catch (err: any) {
      console.error('Genesis Deploy Error:', err);
      soundManager.playError();
      setDeployStep('ERROR');
      setErrorMessage(
        err?.message ||
          'Giao dịch bị từ chối hoặc mạng bị nghẽn. Đảm bảo bạn có đủ phí gas ETH/BNB/MATIC trong ví để triển khai.'
      );
    }
  };

  const handleCopySource = () => {
    navigator.clipboard.writeText(HYPERON_TOKEN_FLATTENED_SOURCE);
    setCopiedSource(true);
    soundManager.playTick();
    addToast({
      title: 'Đã Sao Chép Toàn Bộ Mã Nguồn Solidity!',
      message: 'Sẵn sàng dán vào Etherscan/Basescan hoặc Remix IDE.',
      type: 'success',
    });
    setTimeout(() => setCopiedSource(false), 2500);
  };

  const handleCopyAddress = (addr: string) => {
    navigator.clipboard.writeText(addr);
    setCopiedAddr(true);
    soundManager.playTick();
    addToast({
      title: 'Đã Sao Chép Địa Chỉ',
      message: `${shortenAddress(addr, 8)} đã lưu vào khay nhớ tạm.`,
      type: 'success',
    });
    setTimeout(() => setCopiedAddr(false), 2000);
  };

  const handleAddToWallet = async (contractAddr: string) => {
    soundManager.playTick();
    try {
      await addTokenToWallet({
        address: contractAddr,
        symbol: 'HYPR',
        decimals: 18,
        image: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0/logo.png',
      });
      addToast({
        title: 'Thành Công',
        message: 'Đã yêu cầu thêm đồng HYPR vừa deploy vào ví của bạn.',
        type: 'success',
      });
    } catch (err: any) {
      addToast({
        title: 'Thông Báo',
        message: err?.message || 'Không thể tự động thêm vào ví.',
        type: 'info',
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-4xl rounded-3xl bg-[#090D18] border border-cyan-500/30 shadow-2xl overflow-hidden my-auto">
        {/* Glow Header */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600" />
        <div className="p-5 sm:p-7 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-cyan-500/20 via-blue-600/30 to-purple-600/20 border border-cyan-400/40 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Rocket className="w-6 h-6 text-cyan-400 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                  Xưởng Triển Khai On-Chain HYPR (Genesis Deployer)
                </h2>
                <span className="px-2 py-0.5 rounded-md bg-cyan-500/15 border border-cyan-400/30 text-cyan-300 font-mono text-[10px] font-bold">
                  MAINNET & TESTNET READY
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Tạo đồng coin <strong>HYPR</strong> thật 100% trên blockchain. Bạn là Deployer và toàn quyền sở hữu 1,000,000,000 HYPR.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-5 sm:px-7 pt-4 border-b border-white/[0.06] overflow-x-auto text-xs font-bold">
          <button
            onClick={() => setActiveTab('1click')}
            className={`pb-3 border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === '1click'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Rocket className="w-4 h-4" /> 1-Click Deploy Trực Tiếp
          </button>
          <button
            onClick={() => setActiveTab('source')}
            className={`pb-3 border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'source'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Code2 className="w-4 h-4" /> Mã Nguồn Solidity & Xác Minh Etherscan
          </button>
          <button
            onClick={() => setActiveTab('remix')}
            className={`pb-3 border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'remix'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <FileCode className="w-4 h-4" /> Mở Trên Remix IDE
          </button>
          <button
            onClick={() => setActiveTab('guide')}
            className={`pb-3 border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'guide'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Coins className="w-4 h-4" /> Tạo Bể Thanh Khoản Sàn DEX (Uniswap)
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-7 max-h-[70vh] overflow-y-auto space-y-6">
          {/* TAB 1: 1-CLICK DIRECT DEPLOY */}
          {activeTab === '1click' && (
            <div className="space-y-6">
              {/* Token Parameters Info Box */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-black/40 border border-white/10 text-xs font-mono">
                <div>
                  <div className="text-slate-400 text-[11px]">TÊN TOKEN</div>
                  <div className="text-white font-bold mt-0.5 font-sans">Hyperon</div>
                </div>
                <div>
                  <div className="text-slate-400 text-[11px]">KÝ HIỆU (SYMBOL)</div>
                  <div className="text-cyan-300 font-bold mt-0.5">$HYPR</div>
                </div>
                <div>
                  <div className="text-slate-400 text-[11px]">TỔNG CUNG KHỞI ĐIỂM</div>
                  <div className="text-white font-bold mt-0.5">1,000,000,000 (1 Tỷ)</div>
                </div>
                <div>
                  <div className="text-slate-400 text-[11px]">TIÊU CHUẨN</div>
                  <div className="text-emerald-400 font-bold mt-0.5">ERC-20 + Permit + Burn</div>
                </div>
              </div>

              {/* Network Picker */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
                    <Globe className="w-4 h-4 text-cyan-400" /> Chọn Mạng Lưới Triển Khai Blockchain
                  </label>
                  <span className="text-[11px] text-slate-400">
                    Khuyến nghị: <span className="text-cyan-300 font-semibold">Sepolia (Miễn phí)</span> hoặc{' '}
                    <span className="text-cyan-300 font-semibold">Base / Arbitrum (Gas cực rẻ)</span>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {SUPPORTED_NETWORKS.map((net) => {
                    const isSelected = selectedNetwork.chainId === net.chainId;
                    return (
                      <div
                        key={net.chainId}
                        onClick={() => {
                          setSelectedNetwork(net);
                          soundManager.playTick();
                        }}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                          isSelected
                            ? 'bg-cyan-500/10 border-cyan-400 shadow-md shadow-cyan-500/10'
                            : 'bg-black/30 border-white/[0.07] hover:border-white/20'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white flex items-center gap-1.5">
                            {net.name}
                          </span>
                          {net.type === 'testnet' ? (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[9px] font-mono font-bold">
                              TESTNET
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 text-[9px] font-mono font-bold">
                              MAINNET
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between text-[11px] font-mono">
                          <span className="text-slate-400">Phí Gas:</span>
                          <span className={net.type === 'testnet' ? 'text-emerald-400 font-bold' : 'text-slate-300'}>
                            {net.costEst}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {selectedNetwork.faucetUrl && (
                  <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-between text-xs">
                    <span className="text-cyan-300 flex items-center gap-1.5">
                      <Info className="w-4 h-4 text-cyan-400" /> Chưa có Sepolia ETH để trả phí testnet?
                    </span>
                    <a
                      href={selectedNetwork.faucetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-[11px] flex items-center gap-1 transition-colors"
                    >
                      Lấy ETH Miễn Phí <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>

              {/* Status Stepper during deployment */}
              {deployStep !== 'IDLE' && (
                <div className="p-4 rounded-2xl bg-black/50 border border-cyan-500/30 space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold font-mono">
                    <span className="text-cyan-300 flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
                      {deployStep === 'SWITCHING_CHAIN' && `Đang chuyển sang mạng ${selectedNetwork.name}...`}
                      {deployStep === 'PREPARING' && 'Đang chuẩn bị Bytecode & ABI OpenZeppelin 5.6.1...'}
                      {deployStep === 'AWAITING_SIGN' && 'Vui lòng xác nhận giao dịch triển khai trên ví của bạn...'}
                      {deployStep === 'BROADCASTING' && 'Đang phát giao dịch lên mempool blockchain...'}
                      {deployStep === 'CONFIRMING' && 'Đang chờ thợ đào xác nhận khối & khởi tạo hợp đồng...'}
                      {deployStep === 'SUCCESS' && 'Triển khai thành công 100%!'}
                      {deployStep === 'ERROR' && 'Thất bại'}
                    </span>
                    {deploymentTxHash && (
                      <a
                        href={`${selectedNetwork.explorerUrl}/tx/${deploymentTxHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:underline flex items-center gap-1 text-[11px]"
                      >
                        Tx: {shortenAddress(deploymentTxHash, 6)} <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>

                  {errorMessage && (
                    <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      <span>{errorMessage}</span>
                    </div>
                  )}

                  {deployStep === 'SUCCESS' && deployedContractAddress && (
                    <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-3">
                      <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        Chúc mừng! Đồng coin HYPR thật đã ra đời on-chain!
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg bg-black/40 border border-white/10 font-mono text-xs">
                        <div className="space-y-0.5">
                          <div className="text-[10px] text-slate-400">ĐỊA CHỈ HỢP ĐỒNG ON-CHAIN:</div>
                          <div className="text-cyan-300 font-bold break-all">{deployedContractAddress}</div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleCopyAddress(deployedContractAddress)}
                            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                            title="Sao chép địa chỉ"
                          >
                            {copiedAddr ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                          </button>
                          <a
                            href={`${selectedNetwork.explorerUrl}/token/${deployedContractAddress}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors flex items-center gap-1 cursor-pointer"
                            title="Xem trên Block Explorer"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <button
                          onClick={() => handleAddToWallet(deployedContractAddress)}
                          className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-extrabold text-xs flex items-center gap-1.5 shadow-md shadow-cyan-500/20 cursor-pointer"
                        >
                          <Plus className="w-4 h-4" /> Thêm Vào Ví Web3
                        </button>
                        <button
                          onClick={() => setActiveTab('source')}
                          className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                        >
                          <Code2 className="w-4 h-4" /> Lấy Mã Nguồn Để Verify Trên Explorer
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Action Button */}
              {deployStep !== 'SUCCESS' && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                  <div className="text-xs text-slate-400">
                    {isConnected ? (
                      <span>
                        Ví Deployer: <strong className="text-cyan-300 font-mono">{shortenAddress(address || '', 8)}</strong>
                      </span>
                    ) : (
                      <span className="text-amber-400 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" /> Kết nối ví Web3 để bắt đầu triển khai
                      </span>
                    )}
                  </div>

                  <button
                    onClick={handle1ClickDeploy}
                    disabled={deployStep === 'PREPARING' || deployStep === 'AWAITING_SIGN' || deployStep === 'BROADCASTING' || deployStep === 'CONFIRMING'}
                    className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 hover:from-cyan-300 hover:to-indigo-400 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-cyan-500/20 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Rocket className="w-4 h-4" />
                    Triển Khai HYPR Lên {selectedNetwork.name} Ngay
                  </button>
                </div>
              )}

              {/* Recent Deployments Table */}
              {recentDeployments.length > 0 && (
                <div className="pt-4 border-t border-white/[0.08] space-y-3">
                  <div className="text-xs font-bold text-white font-mono uppercase">
                    LỊCH SỬ HỢP ĐỒNG HYPR BẠN ĐÃ TRIỂN KHAI TRÊN MẠNG
                  </div>
                  <div className="space-y-2">
                    {recentDeployments.map((dep) => {
                      const isActive = dep.address.toLowerCase() === currentActiveHyprAddress.toLowerCase();
                      return (
                        <div
                          key={dep.address}
                          className={`p-3 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs font-mono ${
                            isActive
                              ? 'bg-cyan-500/10 border-cyan-400/50'
                              : 'bg-black/30 border-white/5 hover:border-white/10'
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-white font-bold">{dep.chainName}</span>
                              {isActive && (
                                <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 text-[10px] font-bold">
                                  ĐANG DÙNG TRÊN ỨNG DỤNG
                                </span>
                              )}
                            </div>
                            <div className="text-cyan-300 text-[11px] mt-0.5 flex items-center gap-1.5">
                              <span>{dep.address}</span>
                              <button
                                onClick={() => handleCopyAddress(dep.address)}
                                className="hover:text-white"
                                title="Copy"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleAddToWallet(dep.address)}
                              className="px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 text-white text-[11px] flex items-center gap-1"
                            >
                              <Plus className="w-3 h-3" /> Thêm Vào Ví
                            </button>
                            {dep.txHash && (
                              <a
                                href={`https://etherscan.io/tx/${dep.txHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1 rounded bg-white/5 hover:bg-white/10 text-blue-400"
                                title="Xem Tx"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: SOLIDITY SOURCE & ETHERSCAN VERIFICATION */}
          {activeTab === 'source' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" /> Mã Nguồn Solidity Đã Flatten Chuẩn Xác Minh
                  </h3>
                  <p className="text-xs text-slate-400">
                    Sử dụng mã nguồn này để verify hợp đồng trên Etherscan, Basescan, Arbiscan nhằm nhận tích xanh 100% verified.
                  </p>
                </div>

                <button
                  onClick={handleCopySource}
                  className="px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-md"
                >
                  {copiedSource ? <Check className="w-4 h-4 text-black" /> : <Copy className="w-4 h-4" />}
                  {copiedSource ? 'Đã Copy Toàn Bộ!' : 'Sao Chép Mã Nguồn'}
                </button>
              </div>

              {/* Compiler parameters info pill */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-xl bg-black/40 border border-white/10 text-xs font-mono">
                <div>
                  <span className="text-slate-400 text-[10px]">COMPILER VERSION:</span>
                  <div className="text-cyan-300 font-bold">v0.8.24+ / v0.8.28</div>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px]">OPEN SOURCE LICENSE:</span>
                  <div className="text-white font-bold">MIT License</div>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px]">OPTIMIZATION:</span>
                  <div className="text-emerald-400 font-bold">Enabled (200 runs)</div>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px]">EVM VERSION:</span>
                  <div className="text-white font-bold">Default (Cancun / Paris)</div>
                </div>
              </div>

              <div className="relative rounded-2xl bg-black/80 border border-white/10 p-4 font-mono text-[11px] text-slate-300 max-h-80 overflow-y-auto leading-relaxed">
                <pre>{HYPERON_TOKEN_FLATTENED_SOURCE}</pre>
              </div>
            </div>
          )}

          {/* TAB 3: REMIX IDE ONE-CLICK */}
          {activeTab === 'remix' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-blue-500/30 space-y-2">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-cyan-400" /> Triển Khai Qua Ethereum Remix IDE
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Remix IDE là môi trường lập trình và biên dịch Solidity chính thức của Ethereum Foundation. Bạn có thể mở Remix, dán mã nguồn và deploy trực tiếp bằng MetaMask trong 60 giây.
                </p>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-black/30 border border-white/5">
                  <span className="w-6 h-6 rounded-full bg-cyan-500 text-black font-bold flex items-center justify-center shrink-0">
                    1
                  </span>
                  <div>
                    <strong className="text-white">Sao chép mã nguồn:</strong> Bấm nút <strong>"Sao Chép Mã Nguồn"</strong> ở tab trước.
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-black/30 border border-white/5">
                  <span className="w-6 h-6 rounded-full bg-cyan-500 text-black font-bold flex items-center justify-center shrink-0">
                    2
                  </span>
                  <div>
                    <strong className="text-white">Mở Remix IDE:</strong> Tạo tệp mới có tên <code>HyperonToken.sol</code> và dán mã nguồn vào.
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-black/30 border border-white/5">
                  <span className="w-6 h-6 rounded-full bg-cyan-500 text-black font-bold flex items-center justify-center shrink-0">
                    3
                  </span>
                  <div>
                    <strong className="text-white">Biên dịch (Compile):</strong> Chọn phiên bản compiler <code>0.8.24</code> hoặc <code>0.8.28</code>, bật Optimizer 200 runs.
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-black/30 border border-white/5">
                  <span className="w-6 h-6 rounded-full bg-cyan-500 text-black font-bold flex items-center justify-center shrink-0">
                    4
                  </span>
                  <div>
                    <strong className="text-white">Triển khai (Deploy):</strong> Ở tab <em>Deploy & Run Transactions</em>, chọn Environment là <code>Injected Provider - MetaMask</code>, điền địa chỉ ví của bạn vào ô <code>initialOwner</code> và bấm <strong>transact</strong>.
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <a
                  href="https://remix.ethereum.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-blue-900/30 transition-all cursor-pointer"
                >
                  Mở Remix Ethereum IDE Ngay <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          )}

          {/* TAB 4: CREATING LIQUIDITY POOL */}
          {activeTab === 'guide' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-2">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Coins className="w-4 h-4 text-emerald-400" /> Hướng Dẫn Tạo Bể Thanh Khoản Sàn DEX (Uniswap v3 / v2)
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Sau khi deploy hợp đồng thật, 1,000,000,000 HYPR nằm toàn bộ trong ví của bạn. Để người khác có thể mua bán được, bạn cần tạo bể thanh khoản trên sàn DEX.
                </p>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 space-y-1">
                  <div className="text-cyan-300 font-bold font-mono">BƯỚC 1: TRUY CẬP CỔNG TẠO BỂ UNISWAP HOẶC SÀN DEX TƯƠNG ỨNG</div>
                  <p className="text-slate-400">
                    Truy cập <strong>Uniswap Interface</strong> (hoặc SushiSwap / PancakeSwap tùy mạng lưới bạn đã deploy). Chọn mục <strong>Pools</strong> $\rightarrow$ <strong>New Position</strong>.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 space-y-1">
                  <div className="text-cyan-300 font-bold font-mono">BƯỚC 2: CHỌN CẶP TOKEN & ĐIỀN ĐỊA CHỈ HỢP ĐỒNG HYPR</div>
                  <p className="text-slate-400">
                    Dán địa chỉ hợp đồng HYPR vừa deploy vào ô tìm kiếm token. Chọn cặp ghép (ví dụ <code>HYPR / ETH</code> hoặc <code>HYPR / USDC</code>).
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 space-y-1">
                  <div className="text-cyan-300 font-bold font-mono">BƯỚC 3: THIẾT LẬP MỨC GIÁ KHỞI ĐIỂM & NẠP THANH KHOẢN</div>
                  <p className="text-slate-400">
                    Ví dụ muốn định giá 1 HYPR = 4.82 USDC: bạn nạp vào bể ví dụ 482 USDC + 100 HYPR. Kể từ giây phút này, bất kỳ ai kết nối ví trên toàn thế giới đều có thể swap coin HYPR thật!
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-white/10 bg-black/40 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-400 font-mono">
            Địa chỉ HYPR hiện tại: <span className="text-cyan-300 font-bold">{shortenAddress(currentActiveHyprAddress, 8)}</span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
