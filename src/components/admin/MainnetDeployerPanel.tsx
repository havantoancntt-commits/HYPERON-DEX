import React, { useState, useEffect } from 'react';
import { 
  Rocket, 
  CheckCircle2, 
  AlertTriangle, 
  ExternalLink, 
  Copy, 
  RefreshCw, 
  Cpu, 
  Layers, 
  ShieldCheck, 
  ArrowRight,
  Database,
  Code2,
  Check,
  Fuel,
  Network
} from 'lucide-react';
import { useWallet } from '../../context/WalletContext';
import { useExchange } from '../../context/ExchangeContext';
import { COMPILED_ARTIFACTS } from '../../lib/contracts/compiledArtifacts';
import { setCustomHyprContractAddress, getHyprContractAddress, recordDeployment, getStoredDeployments } from '../../lib/hyprConfig';
import { shortenAddress } from '../../lib/utils';
import { soundManager } from '../../lib/sound';

interface TargetChain {
  id: number;
  slug: string;
  name: string;
  icon: string;
  explorer: string;
  isTestnet?: boolean;
}

const TARGET_CHAINS: TargetChain[] = [
  { id: 1, slug: 'ethereum', name: 'Ethereum Mainnet', icon: '⟠', explorer: 'https://etherscan.io' },
  { id: 8453, slug: 'base', name: 'Base L2', icon: '🔵', explorer: 'https://basescan.org' },
  { id: 42161, slug: 'arbitrum', name: 'Arbitrum One', icon: '🔷', explorer: 'https://arbiscan.io' },
  { id: 10, slug: 'optimism', name: 'Optimism L2', icon: '🔴', explorer: 'https://optimistic.etherscan.io' },
  { id: 56, slug: 'bsc', name: 'BNB Smart Chain', icon: '🟡', explorer: 'https://bscscan.com' },
  { id: 137, slug: 'polygon', name: 'Polygon PoS', icon: '🟣', explorer: 'https://polygonscan.com' },
  { id: 11155111, slug: 'sepolia', name: 'Ethereum Sepolia', icon: '🧪', explorer: 'https://sepolia.etherscan.io', isTestnet: true },
  { id: 84532, slug: 'baseSepolia', name: 'Base Sepolia', icon: '🧪', explorer: 'https://sepolia.basescan.org', isTestnet: true },
];

export const MainnetDeployerPanel: React.FC = () => {
  const { address, isConnected, chainId, switchChain, activeCustomProvider } = useWallet();
  const { addToast } = useExchange();

  const [selectedContract, setSelectedContract] = useState<'HyperonToken' | 'HyperonRouter' | 'HyperonOracleAggregator'>('HyperonToken');
  const [targetChainId, setTargetChainId] = useState<number>(8453); // Default Base
  const [initialOwner, setInitialOwner] = useState<string>('');
  const [uniswapV3RouterAddr, setUniswapV3RouterAddr] = useState<string>('0x2626664c2603336E57B271c5C0b26F421741e481'); // Base V3 Router default
  const [oracleAggregatorAddr, setOracleAggregatorAddr] = useState<string>('0x87743246e8cfBc3760a82dAAD00987b1d971a5A9');

  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState<any>(null);
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployedReceipt, setDeployedReceipt] = useState<any>(null);
  const [deployments, setDeployments] = useState<any[]>([]);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Sync initialOwner with connected wallet if empty
  useEffect(() => {
    if (address && !initialOwner) {
      setInitialOwner(address);
    }
  }, [address]);

  // Load deployment history
  const loadHistory = async () => {
    try {
      const res = await fetch('/api/admin/deploy/history');
      if (res.ok) {
        const data = await res.json();
        if (data.history && data.history.length > 0) {
          setDeployments(data.history);
          return;
        }
      }
    } catch {
      // fallback to localStorage
    }
    const local = getStoredDeployments();
    setDeployments(local);
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    soundManager.playTick();
    setTimeout(() => setCopiedText(null), 2000);
  };

  const handleSimulate = async () => {
    const deployer = address || initialOwner || '0x87743246e8cfBc3760a82dAAD00987b1d971a5A9';
    setIsSimulating(true);
    setSimulationResult(null);

    const constructorArgs: Record<string, any> = {
      initialOwner: initialOwner || deployer,
      uniswapV3Router: uniswapV3RouterAddr,
      oracleAggregator: oracleAggregatorAddr,
    };

    try {
      const res = await fetch('/api/admin/deploy/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractType: selectedContract,
          chainId: targetChainId,
          deployerAddress: deployer,
          constructorArgs,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Mô phỏng triển khai thất bại');

      setSimulationResult(data);
      soundManager.playSuccess();
      addToast({
        title: 'Mô Phỏng Thành Công',
        message: `Đã xác thực bytecode và tính toán địa chỉ dự kiến: ${shortenAddress(data.predictedAddress, 6)}`,
        type: 'success',
      });
    } catch (err: any) {
      soundManager.playError();
      addToast({
        title: 'Lỗi Mô Phỏng Deploy',
        message: err.message || 'Không thể chuẩn bị calldata deployment',
        type: 'error',
      });
    } finally {
      setIsSimulating(false);
    }
  };

  const handleExecuteDeploy = async () => {
    if (!simulationResult) {
      addToast({ title: 'Yêu Cầu Mô Phỏng', message: 'Vui lòng chạy mô phỏng kiểm tra calldata trước khi phát sóng', type: 'warning' });
      return;
    }

    if (!isConnected || !address) {
      addToast({ title: 'Chưa Kết Nối Ví', message: 'Vui lòng kết nối ví quản trị viên để ký giao dịch deploy', type: 'error' });
      return;
    }

    setIsDeploying(true);
    try {
      const provider = activeCustomProvider || (window as any).ethereum;
      if (!provider) {
        throw new Error('Không tìm thấy Web3 Provider (EIP-1193) để phát sóng');
      }

      // Check chain match
      const targetChainObj = TARGET_CHAINS.find((c) => c.id === targetChainId);
      const targetChainHex = `0x${targetChainId.toString(16)}`;
      
      try {
        await provider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: targetChainHex }],
        });
      } catch (switchErr) {
        console.warn('Chain switch warning:', switchErr);
      }

      // Send contract creation transaction (to is empty / null, data is deployData)
      const txHash: string = await provider.request({
        method: 'eth_sendTransaction',
        params: [
          {
            from: address,
            data: simulationResult.deployData,
            gas: `0x${BigInt(simulationResult.estimatedGasUnits).toString(16)}`,
          },
        ],
      });

      const receipt = {
        contractType: selectedContract,
        address: simulationResult.predictedAddress,
        chainId: targetChainId,
        chainName: targetChainObj?.name || `Chain ${targetChainId}`,
        deployerAddress: address,
        txHash,
        deployedAt: Date.now(),
        initialSupply: selectedContract === 'HyperonToken' ? '1,000,000,000 HYPR' : undefined,
      };

      setDeployedReceipt(receipt);
      recordDeployment(receipt);

      // Record to server backend
      await fetch('/api/admin/deploy/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractType: selectedContract,
          address: simulationResult.predictedAddress,
          chainId: targetChainId,
          chainName: targetChainObj?.name,
          deployerAddress: address,
          txHash,
          constructorArgs: simulationResult.constructorArgs,
        }),
      }).catch(() => {});

      soundManager.playSuccess();
      addToast({
        title: 'Triển Khai Thành Công!',
        message: `Hợp đồng ${selectedContract} đã được broadcast lên ${targetChainObj?.name}. Tx: ${shortenAddress(txHash, 6)}`,
        type: 'success',
      });
      loadHistory();
    } catch (err: any) {
      soundManager.playError();
      addToast({
        title: 'Giao Dịch Bị Từ Chối hoặc Thất Bại',
        message: err.message || 'Lỗi khi phát sóng giao dịch deploy',
        type: 'error',
      });
    } finally {
      setIsDeploying(false);
    }
  };

  const handleApplyToProtocol = (deployedAddress: string) => {
    if (selectedContract === 'HyperonToken') {
      setCustomHyprContractAddress(deployedAddress);
      soundManager.playSuccess();
      addToast({
        title: 'Đã Đồng Bộ Địa Chỉ HYPR',
        message: `Giao thức HYPERON-DEX hiện đang sử dụng địa chỉ token mới: ${shortenAddress(deployedAddress, 8)}`,
        type: 'success',
      });
    } else {
      addToast({
        title: 'Đã Ghi Nhận Địa Chỉ',
        message: `Hợp đồng ${selectedContract} đã được lưu vào hệ thống quản trị trung tâm.`,
        type: 'info',
      });
    }
  };

  const targetChainObj = TARGET_CHAINS.find((c) => c.id === targetChainId) || TARGET_CHAINS[0];
  const artifact = COMPILED_ARTIFACTS.contracts[selectedContract];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-[#0B0F19] via-[#0E1526] to-[#0A0D14] border border-cyan-500/30 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                <Rocket className="w-6 h-6" />
              </span>
              <div>
                <h2 className="text-xl font-black text-white flex items-center gap-2">
                  Mainnet Smart Contract Deployer
                  <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-400 font-mono text-[10px] font-bold">
                    PRODUCTION ENGINE
                  </span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Biên dịch, mã hóa constructor arguments, ước lượng gas và phát sóng trực tiếp bytecode EVM lên 8+ mạng lưới on-chain.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadHistory}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Làm mới lịch sử deploy"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Làm mới</span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Deployment Form */}
        <div className="lg:col-span-7 space-y-6">
          <div className="p-6 rounded-2xl bg-[#090D15] border border-white/10 shadow-xl space-y-5">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 pb-3 border-b border-white/5">
              <Layers className="w-4 h-4 text-cyan-400" />
              Bước 1: Lựa Chọn Hợp Đồng & Mạng Mục Tiêu
            </h3>

            {/* Contract Type Tabs */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">Hợp Đồng Cần Triển Khai:</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'HyperonToken', label: 'HyperonToken (HYPR)', desc: 'ERC-20 + Permit + Burn' },
                  { id: 'HyperonRouter', label: 'HyperonRouter', desc: 'Institutional AMM Router' },
                  { id: 'HyperonOracleAggregator', label: 'OracleAggregator', desc: 'ERC-7528 Consensus' },
                ].map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setSelectedContract(c.id as any);
                      setSimulationResult(null);
                    }}
                    className={`p-3 rounded-xl text-left border transition-all cursor-pointer ${
                      selectedContract === c.id
                        ? 'bg-cyan-500/15 border-cyan-500/50 text-white shadow-lg shadow-cyan-500/10'
                        : 'bg-black/30 border-white/5 text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <div className="text-xs font-bold">{c.label}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{c.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Target Chain Selector */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span>Mạng Blockchain On-Chain Mục Tiêu:</span>
                <span className="text-[11px] font-mono text-cyan-400">Chain ID: {targetChainId}</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {TARGET_CHAINS.map((chain) => (
                  <button
                    key={chain.id}
                    onClick={() => {
                      setTargetChainId(chain.id);
                      setSimulationResult(null);
                    }}
                    className={`p-2.5 rounded-xl text-left border flex items-center gap-2 transition-all cursor-pointer ${
                      targetChainId === chain.id
                        ? 'bg-blue-600/20 border-cyan-500/50 text-white'
                        : 'bg-black/30 border-white/5 text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <span className="text-base">{chain.icon}</span>
                    <div className="overflow-hidden">
                      <div className="text-xs font-semibold truncate">{chain.name}</div>
                      {chain.isTestnet && <span className="text-[9px] text-amber-400 font-mono">Testnet</span>}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Constructor Parameters Form */}
            <div className="space-y-4 pt-2 border-t border-white/5">
              <h4 className="text-xs font-bold text-slate-200 flex items-center gap-2">
                <Code2 className="w-3.5 h-3.5 text-cyan-400" />
                Tham Số Constructor (Khởi Tạo Ban Đầu)
              </h4>

              <div className="space-y-1.5">
                <label className="text-xs text-slate-400">Initial Owner (Chủ sở hữu ban đầu / Treasury Multi-Sig):</label>
                <input
                  type="text"
                  value={initialOwner}
                  onChange={(e) => setInitialOwner(e.target.value)}
                  placeholder="0x..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/10 text-white font-mono text-xs focus:border-cyan-400 focus:outline-none"
                />
              </div>

              {selectedContract === 'HyperonRouter' && (
                <>
                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-400">Uniswap V3 SwapRouter Canonical Address:</label>
                    <input
                      type="text"
                      value={uniswapV3RouterAddr}
                      onChange={(e) => setUniswapV3RouterAddr(e.target.value)}
                      placeholder="0x..."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/10 text-white font-mono text-xs focus:border-cyan-400 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-400">HyperonOracleAggregator Address:</label>
                    <input
                      type="text"
                      value={oracleAggregatorAddr}
                      onChange={(e) => setOracleAggregatorAddr(e.target.value)}
                      placeholder="0x..."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/10 text-white font-mono text-xs focus:border-cyan-400 focus:outline-none"
                    />
                  </div>
                </>
              )}

              {selectedContract === 'HyperonToken' && (
                <div className="p-3.5 rounded-xl bg-cyan-950/20 border border-cyan-500/20 text-xs text-cyan-200/90 space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-cyan-300">
                    <ShieldCheck className="w-4 h-4" /> Đặc tính Tokenomics HYPR:
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Tổng cung cố định: <strong>1,000,000,000 HYPR</strong> (1 Tỷ token) được mint toàn bộ cho Initial Owner khi khởi tạo. Không có mint backdoor. Tích hợp sẵn ERC20Burnable và ERC20Permit (EIP-2612).
                  </p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleSimulate}
                disabled={isSimulating}
                className="flex-1 py-3 px-4 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {isSimulating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Cpu className="w-4 h-4" />}
                <span>1. Kiểm Tra & Mã Hóa Calldata</span>
              </button>

              <button
                type="button"
                onClick={handleExecuteDeploy}
                disabled={!simulationResult || isDeploying}
                className={`flex-1 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  simulationResult
                    ? 'bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 text-black hover:from-cyan-300 hover:to-indigo-400 shadow-lg shadow-cyan-500/20'
                    : 'bg-white/5 text-slate-500 border border-white/5 cursor-not-allowed'
                }`}
              >
                {isDeploying ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
                <span>2. Phát Sóng Giao Dịch Deploy</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Pre-Flight Verification & Live Receipt */}
        <div className="lg:col-span-5 space-y-6">
          {/* Pre-flight inspection */}
          <div className="p-5 rounded-2xl bg-[#090D15] border border-white/10 shadow-xl space-y-4 font-mono text-xs">
            <h3 className="text-sm font-bold text-white font-sans flex items-center justify-between pb-3 border-b border-white/5">
              <span>Thông Số Kỹ Thuật Bytecode</span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                Solc 0.8.28 (Verified)
              </span>
            </h3>

            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-slate-400">
                <span>Hợp đồng:</span>
                <span className="text-white font-bold">{selectedContract}</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Kích thước bytecode:</span>
                <span className="text-cyan-300">{artifact?.lengthBytes ? `${artifact.lengthBytes.toLocaleString()} bytes` : '6,224 bytes'}</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Mạng đích:</span>
                <span className="text-amber-300 font-bold">{targetChainObj.name}</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Địa chỉ ví Deployer:</span>
                <span className="text-slate-200">{address ? shortenAddress(address, 6) : 'Chưa kết nối'}</span>
              </div>
            </div>

            {/* Simulation Preview */}
            {simulationResult && (
              <div className="p-4 rounded-xl bg-black/60 border border-cyan-500/30 space-y-2.5 mt-4">
                <div className="flex items-center justify-between text-cyan-400 font-bold">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> Sẵn sàng phát sóng
                  </span>
                  <span className="text-[10px] text-slate-400">Nonce: {simulationResult.currentNonce}</span>
                </div>
                <div className="text-[11px] text-slate-300">
                  <span className="text-slate-400">Địa chỉ hợp đồng dự kiến:</span>
                  <div className="font-bold text-white break-all bg-white/5 p-2 rounded-lg mt-1 flex items-center justify-between">
                    <span>{simulationResult.predictedAddress}</span>
                    <button
                      onClick={() => handleCopy(simulationResult.predictedAddress, 'pred')}
                      className="p-1 hover:text-cyan-300 transition-colors ml-2 shrink-0 cursor-pointer"
                    >
                      {copiedText === 'pred' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between text-slate-400 pt-1 text-[11px]">
                  <span>Ước tính Gas:</span>
                  <span className="text-emerald-400 font-bold">{Number(simulationResult.estimatedGasUnits).toLocaleString()} units</span>
                </div>
              </div>
            )}

            {/* Deployed Success Receipt Card */}
            {deployedReceipt && (
              <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/40 space-y-3 mt-4 animate-in fade-in">
                <div className="flex items-center gap-2 text-emerald-400 font-bold font-sans">
                  <CheckCircle2 className="w-5 h-5" /> ĐÃ PHÁT SÓNG ON-CHAIN THÀNH CÔNG!
                </div>
                <div className="text-[11px] text-slate-300 space-y-1">
                  <div>Địa chỉ hợp đồng on-chain:</div>
                  <div className="text-white font-bold break-all bg-black/40 p-2 rounded border border-white/10 flex items-center justify-between">
                    <span>{deployedReceipt.address}</span>
                    <button
                      onClick={() => handleCopy(deployedReceipt.address, 'dep')}
                      className="p-1 hover:text-cyan-300 transition-colors ml-2 shrink-0 cursor-pointer"
                    >
                      {copiedText === 'dep' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <a
                    href={`${targetChainObj.explorer}/tx/${deployedReceipt.txHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 py-2 px-3 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-center font-bold text-[11px] flex items-center justify-center gap-1.5"
                  >
                    <span>Xem Trên Explorer</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <button
                    onClick={() => handleApplyToProtocol(deployedReceipt.address)}
                    className="flex-1 py-2 px-3 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-[11px] flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Đồng Bộ Vào Giao Thức</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Deployment History Table */}
      <div className="p-6 rounded-2xl bg-[#090D15] border border-white/10 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-white/5">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Database className="w-4 h-4 text-cyan-400" />
            Lịch Sử Triển Khai On-Chain (Verified Deployments)
          </h3>
          <span className="text-xs text-slate-400 font-mono">{deployments.length} bản ghi</span>
        </div>

        {deployments.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500 font-mono">
            Chưa có hợp đồng nào được triển khai qua phiên này. Sử dụng bảng điều khiển phía trên để deploy smart contract lên mainnet/testnet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="border-b border-white/10 text-slate-400 text-[11px]">
                  <th className="pb-3 font-semibold">Hợp Đồng</th>
                  <th className="pb-3 font-semibold">Mạng</th>
                  <th className="pb-3 font-semibold">Địa Chỉ Contract</th>
                  <th className="pb-3 font-semibold">Transaction Hash</th>
                  <th className="pb-3 font-semibold">Thời Gian</th>
                  <th className="pb-3 font-semibold text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-300">
                {deployments.map((dep, idx) => (
                  <tr key={dep.id || idx} className="hover:bg-white/5 transition-colors">
                    <td className="py-3 font-bold text-white">
                      <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 text-[10px] border border-cyan-500/20 mr-2">
                        {dep.contractType || 'HyperonToken'}
                      </span>
                    </td>
                    <td className="py-3 text-amber-300">{dep.chainName || `Chain ${dep.chainId}`}</td>
                    <td className="py-3 text-cyan-300 font-bold">
                      <div className="flex items-center gap-1.5">
                        <span>{shortenAddress(dep.address, 6)}</span>
                        <button
                          onClick={() => handleCopy(dep.address, `list_${idx}`)}
                          className="hover:text-white cursor-pointer"
                        >
                          {copiedText === `list_${idx}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    </td>
                    <td className="py-3">
                      {dep.explorerUrl ? (
                        <a
                          href={dep.explorerUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-400 hover:text-blue-300 underline flex items-center gap-1"
                        >
                          <span>{shortenAddress(dep.txHash, 6)}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span>{shortenAddress(dep.txHash, 6)}</span>
                      )}
                    </td>
                    <td className="py-3 text-slate-500 text-[11px]">
                      {new Date(dep.deployedAt).toLocaleString('vi-VN')}
                    </td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => handleApplyToProtocol(dep.address)}
                        className="px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 text-white text-[10px] font-bold cursor-pointer transition-colors"
                      >
                        Đồng Bộ
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
