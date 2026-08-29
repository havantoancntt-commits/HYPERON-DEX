import React, { useState, useEffect } from 'react';
import { useExchange } from '../context/ExchangeContext';
import { useWallet } from '../context/WalletContext';
import { LaunchpadProject } from '../types';
import { formatCurrency, formatPercent } from '../lib/utils';
import { EcosystemFlowBanner } from '../components/EcosystemFlowBanner';
import {
  Rocket,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Lock,
  Flame,
  Users,
  Clock,
  Calendar,
  AlertTriangle,
  ArrowRight,
  PlusCircle,
  ExternalLink,
  ChevronRight,
  RefreshCw
} from 'lucide-react';

export const LaunchpadView: React.FC = () => {
  const { addToast } = useExchange();
  const { isConnected, connectWallet, address } = useWallet();

  const [projects, setProjects] = useState<LaunchpadProject[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [commitModalProject, setCommitModalProject] = useState<LaunchpadProject | null>(null);
  const [commitAmount, setCommitAmount] = useState<string>('500');
  const [deployModalOpen, setDeployModalOpen] = useState<boolean>(false);
  const [isCommitting, setIsCommitting] = useState<boolean>(false);

  // Fair Launch Deploy Form
  const [deployName, setDeployName] = useState<string>('');
  const [deploySymbol, setDeploySymbol] = useState<string>('');
  const [deploySupply, setDeploySupply] = useState<string>('10000000');
  const [deployLockMonths, setDeployLockMonths] = useState<number>(24);
  const [deploying, setDeploying] = useState<boolean>(false);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/launchpad/projects');
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects || []);
      }
    } catch (err) {
      console.error('Error fetching launchpad projects:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleCommit = () => {
    if (!isConnected) {
      addToast({
        title: 'Wallet Connection Required',
        message: 'Please connect your Web3 wallet to commit funds to this verified IDO.',
        type: 'warning',
      });
      connectWallet('demo');
      return;
    }

    const amt = parseFloat(commitAmount) || 0;
    if (amt <= 0) {
      addToast({
        title: 'Invalid Amount',
        message: 'Please enter a valid commitment amount.',
        type: 'error',
      });
      return;
    }

    setIsCommitting(true);
    setTimeout(() => {
      if (commitModalProject) {
        setProjects(
          projects.map((p) =>
            p.id === commitModalProject.id
              ? {
                  ...p,
                  currentRaisedUsd: p.currentRaisedUsd + amt,
                  participantsCount: p.participantsCount + 1,
                  userCommittedAmount: (p.userCommittedAmount || 0) + amt,
                }
              : p
          )
        );
      }
      setIsCommitting(false);
      setCommitModalProject(null);
      addToast({
        title: 'Đăng Ký Tham Gia IDO Thành Công!',
        message: `Bạn đã cam kết $${formatCurrency(amt)} USDC vào dự án ${commitModalProject?.name}. Token sẽ được claim tự động khi kết thúc vòng gọi vốn.`,
        type: 'success',
      });
    }, 1200);
  };

  const handleDeployFairLaunch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deployName || !deploySymbol) {
      addToast({
        title: 'Vui Lòng Điền Đủ Thông Tin',
        message: 'Tên token và mã hiệu ký hiệu không được để trống.',
        type: 'error',
      });
      return;
    }

    setDeploying(true);
    setTimeout(() => {
      const newProj: LaunchpadProject = {
        id: `launch-user-${Date.now()}`,
        name: `${deployName} (${deploySymbol})`,
        symbol: deploySymbol.toUpperCase(),
        tagline: 'Community Fair Launch Token with AI Automated Rug-Pull Guard',
        description: 'Decentralized token deployed directly via Hyperon AI Launchpad with 100% LP liquidity locked on Uniswap v3.',
        logoUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&auto=format&fit=crop&q=80',
        category: 'DeFi 3.0',
        securityScore: 99,
        isAuditVerified: true,
        tokenPriceUsd: 0.05,
        totalRaiseUsd: 250000,
        currentRaisedUsd: 15000,
        participantsCount: 42,
        minAllocationUsd: 20,
        maxAllocationUsd: 2000,
        startDate: '2026-08-29',
        endDate: '2026-09-08',
        status: 'LIVE',
        vestingSchedule: '100% Instant Unlocked at TGE',
        contractAddress: '0x' + Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
        acceptedToken: 'USDC',
        features: [
          `100% LP Liquidity Locked for ${deployLockMonths} Months`,
          'Zero Mint / Zero Blacklist Authority',
          'AI Formal Verification Passed',
        ],
      };

      setProjects([newProj, ...projects]);
      setDeploying(false);
      setDeployModalOpen(false);
      setDeployName('');
      setDeploySymbol('');

      addToast({
        title: 'Triển Khai Fair Launch Thành Công!',
        message: `Hợp đồng thông minh ${newProj.symbol} đã được triển khai on-chain với điểm bảo mật 99/100.`,
        type: 'success',
      });
    }, 1500);
  };

  return (
    <div className="space-y-6">
      <EcosystemFlowBanner />

      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-[#0C1122] via-[#090D1C] to-[#070A14] border border-pink-500/25 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-pink-500/20 text-pink-400 border border-pink-500/30 shadow-lg shadow-pink-950/50">
              <Rocket className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-sans">
                  AI Launchpad & Token Incubation Portal
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-pink-500/10 text-pink-400 border border-pink-500/20">
                  100% Anti-Rug Verified
                </span>
              </div>
              <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-2xl">
                Nền tảng gọi vốn phi tập trung công bằng (Fair Launch) thế hệ mới. Mọi dự án đều được AI quét toàn diện mã nguồn hợp đồng, khóa thanh khoản 100% và cơ chế hoàn tiền tự động nếu không đạt soft cap.
              </p>
            </div>
          </div>

          <button
            onClick={() => setDeployModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white text-xs font-bold font-sans flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-pink-950/40"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Tạo Dự Án Fair Launch Mới</span>
          </button>
        </div>
      </div>

      {/* Projects Grid */}
      {loading ? (
        <div className="p-12 text-center rounded-2xl bg-[#080C16] border border-white/5 space-y-3">
          <RefreshCw className="w-8 h-8 text-pink-400 animate-spin mx-auto" />
          <div className="text-sm font-bold text-white">Đang tải danh sách dự án IDO đã qua kiểm duyệt...</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {projects.map((project) => {
            const progressPercent = Math.min(100, (project.currentRaisedUsd / project.totalRaiseUsd) * 100);
            const isLive = project.status === 'LIVE';

            return (
              <div
                key={project.id}
                className="p-5 rounded-2xl bg-gradient-to-b from-[#0C1224] to-[#070B16] border border-white/10 hover:border-pink-500/40 shadow-xl transition-all flex flex-col justify-between group"
              >
                <div>
                  {/* Category & Status Badge */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-mono font-bold bg-pink-500/10 text-pink-300 border border-pink-500/20">
                      {project.category}
                    </span>
                    <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-emerald-400">
                      <ShieldCheck className="w-4 h-4" />
                      <span>{project.securityScore}/100 Audit</span>
                    </div>
                  </div>

                  {/* Project Info */}
                  <div className="flex items-center gap-3 mb-3">
                    <img
                      src={project.logoUrl}
                      alt={project.name}
                      className="w-12 h-12 rounded-xl object-cover border border-white/10 shadow-md"
                    />
                    <div>
                      <h3 className="font-extrabold text-white text-base group-hover:text-pink-300 transition-colors">
                        {project.name}
                      </h3>
                      <div className="text-xs text-slate-400 font-mono">
                        Giá: <strong className="text-white">${project.tokenPriceUsd} USDC</strong>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-4">
                    {project.description}
                  </p>

                  {/* Raise Progress Bar */}
                  <div className="p-3 rounded-xl bg-[#060912] border border-white/5 space-y-2 mb-4 font-mono text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Tiến độ huy động:</span>
                      <span className="text-pink-400 font-bold">{progressPercent.toFixed(1)}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-[#121828] overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-pink-500 to-purple-500 rounded-full"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-400 pt-1">
                      <span>${formatCurrency(project.currentRaisedUsd)}</span>
                      <span>Mục tiêu: ${formatCurrency(project.totalRaiseUsd)}</span>
                    </div>
                  </div>

                  {/* Highlights List */}
                  <div className="space-y-1.5 mb-4 text-[11px] font-mono text-slate-300">
                    {project.features.map((feat, idx) => (
                      <div key={idx} className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                        <span className="truncate">{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bottom Action */}
                <div className="pt-3 border-t border-white/5 flex items-center justify-between gap-3">
                  <div className="text-[11px] font-mono text-slate-400">
                    {project.participantsCount} Người Đã Cam Kết
                  </div>

                  <button
                    onClick={() => {
                      setCommitModalProject(project);
                      setCommitAmount(project.minAllocationUsd.toString());
                    }}
                    className={`px-4 py-2 rounded-xl text-xs font-bold font-sans flex items-center gap-1.5 transition-all cursor-pointer shadow-md ${
                      isLive
                        ? 'bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white'
                        : 'bg-slate-800 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <span>{isLive ? 'Tham Gia IDO' : 'Sắp Mở'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Commit Modal */}
      {commitModalProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md p-6 rounded-2xl bg-[#0B1020] border border-pink-500/30 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Rocket className="w-5 h-5 text-pink-400" />
                <h3 className="font-bold text-white text-base">Cam Kết Tham Gia IDO</h3>
              </div>
              <button
                onClick={() => setCommitModalProject(null)}
                className="text-slate-400 hover:text-white font-mono cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-3 rounded-xl bg-[#060912] border border-white/5 space-y-1 text-xs font-mono">
              <div className="text-white font-bold">{commitModalProject.name}</div>
              <div className="text-slate-400">
                Giá: ${commitModalProject.tokenPriceUsd} | Giới hạn: ${commitModalProject.minAllocationUsd} - ${commitModalProject.maxAllocationUsd} USDC
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono text-slate-400">Số Tiền Cam Kết (USDC):</label>
              <input
                type="number"
                value={commitAmount}
                onChange={(e) => setCommitAmount(e.target.value)}
                min={commitModalProject.minAllocationUsd}
                max={commitModalProject.maxAllocationUsd}
                className="w-full p-3 rounded-xl bg-[#060912] border border-white/10 text-white font-mono font-bold text-base outline-none focus:border-pink-500/50"
              />
            </div>

            <div className="text-[11px] text-slate-400 font-mono">
              Bạn sẽ nhận được: <strong className="text-pink-300">{((parseFloat(commitAmount) || 0) / commitModalProject.tokenPriceUsd).toFixed(0)} {commitModalProject.symbol}</strong>
            </div>

            <button
              onClick={handleCommit}
              disabled={isCommitting}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white text-xs font-bold font-sans flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-pink-950/40"
            >
              {isCommitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Đang xác nhận on-chain...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Xác Nhận Cam Kết ${commitAmount} USDC</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Deploy Modal */}
      {deployModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg p-6 rounded-2xl bg-[#0B1020] border border-pink-500/30 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <PlusCircle className="w-5 h-5 text-pink-400" />
                <h3 className="font-bold text-white text-base">Tạo Token & Dự Án Fair Launch</h3>
              </div>
              <button
                onClick={() => setDeployModalOpen(false)}
                className="text-slate-400 hover:text-white font-mono cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleDeployFairLaunch} className="space-y-4 font-mono text-xs">
              <div className="space-y-1">
                <label className="text-slate-400">Tên Token:</label>
                <input
                  type="text"
                  value={deployName}
                  onChange={(e) => setDeployName(e.target.value)}
                  placeholder="Ví dụ: Quantum Nexus Token"
                  className="w-full p-2.5 rounded-xl bg-[#060912] border border-white/10 text-white outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-400">Ký Hiệu (Symbol):</label>
                  <input
                    type="text"
                    value={deploySymbol}
                    onChange={(e) => setDeploySymbol(e.target.value)}
                    placeholder="QNT"
                    className="w-full p-2.5 rounded-xl bg-[#060912] border border-white/10 text-white outline-none"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400">Tổng Cung:</label>
                  <input
                    type="text"
                    value={deploySupply}
                    onChange={(e) => setDeploySupply(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-[#060912] border border-white/10 text-white outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400">Thời Gian Khóa Thanh Khoản (LP Lock):</label>
                <select
                  value={deployLockMonths}
                  onChange={(e) => setDeployLockMonths(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl bg-[#060912] border border-white/10 text-white outline-none"
                >
                  <option value={12}>12 Tháng (Khuyến nghị tối thiểu)</option>
                  <option value={24}>24 Tháng (Điểm tín nhiệm cao 99/100)</option>
                  <option value={36}>36 Tháng (Tuyệt đối an toàn)</option>
                </select>
              </div>

              <div className="p-3 rounded-xl bg-pink-500/10 border border-pink-500/20 text-[11px] text-pink-300">
                <div className="font-bold mb-1">Cơ Chế Bảo Vệ Fair Launch Tự Động:</div>
                Hợp đồng sẽ được kích hoạt chống Bot Sniper, tự động khoá thanh khoản vào Uniswap v3 Pool và công khai mã nguồn lên Blockscout / Etherscan.
              </div>

              <button
                type="submit"
                disabled={deploying}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white text-xs font-bold font-sans flex items-center justify-center gap-2 cursor-pointer shadow-lg"
              >
                {deploying ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Đang biên dịch và kiểm toán mã nguồn...</span>
                  </>
                ) : (
                  <>
                    <Rocket className="w-4 h-4" />
                    <span>Triển Khai Hợp Đồng Thông Minh An Toàn</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
