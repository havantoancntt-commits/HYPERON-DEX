import React, { useEffect } from 'react';
import { WalletProvider } from './context/WalletContext';
import { ExchangeProvider, useExchange } from './context/ExchangeContext';
import { I18nProvider, useI18n } from './context/I18nContext';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import { SimulationModal } from './components/SimulationModal';
import { ToastContainer } from './components/ToastContainer';
import { motion, AnimatePresence } from 'motion/react';
import { soundManager } from './lib/sound';

// Views
import { DashboardView } from './views/DashboardView';
import { AISignalsView } from './views/AISignalsView';
import { SwapView } from './views/SwapView';
import { PerpetualsView } from './views/PerpetualsView';
import { TradeTerminalView } from './views/TradeTerminalView';
import { MarketsView } from './views/MarketsView';
import { TokenDetailsView } from './views/TokenDetailsView';
import { LotteryView } from './views/LotteryView';
import { LiquidityView } from './views/LiquidityView';
import { StakingView } from './views/StakingView';
import { LendingView } from './views/LendingView';
import { LaunchpadView } from './views/LaunchpadView';
import { OnChainRadarView } from './views/OnChainRadarView';
import { PaymentsView } from './views/PaymentsView';
import { CrossChainView } from './views/CrossChainView';
import { AIIntelligenceView } from './views/AIIntelligenceView';
import { AIRiskScannerView } from './views/AIRiskScannerView';
import { AIPortfolioCopilotView } from './views/AIPortfolioCopilotView';
import { AITradingAgentView } from './views/AITradingAgentView';
import { PortfolioView } from './views/PortfolioView';
import { WalletView } from './views/WalletView';
import { TransactionsView } from './views/TransactionsView';
import { WatchlistView } from './views/WatchlistView';
import { AlertsView } from './views/AlertsView';
import { SecurityCenterView } from './views/SecurityCenterView';
import { DeveloperApiView } from './views/DeveloperApiView';
import { AdminConsoleView } from './views/AdminConsoleView';
import { SettingsView } from './views/SettingsView';

const MainLayout: React.FC = () => {
  const { activeView, selectedPair } = useExchange();
  const { t, theme } = useI18n();

  useEffect(() => {
    soundManager.playTick();
  }, [activeView]);

  const renderView = () => {
    switch (activeView) {
      case 'dashboard':
        return <DashboardView />;
      case 'ai-signals':
        return <AISignalsView />;
      case 'swap':
        return <SwapView />;
      case 'perpetuals':
        return <PerpetualsView />;
      case 'launchpad':
        return <LaunchpadView />;
      case 'onchain-radar':
        return <OnChainRadarView />;
      case 'payments':
        return <PaymentsView />;
      case 'trade':
        return <TradeTerminalView />;
      case 'markets':
        return <MarketsView />;
      case 'token-details':
        return <TokenDetailsView />;
      case 'lottery':
        return <LotteryView />;
      case 'liquidity':
        return <LiquidityView />;
      case 'staking':
        return <StakingView />;
      case 'lending':
        return <LendingView />;
      case 'cross-chain':
        return <CrossChainView />;
      case 'ai-intelligence':
        return <AIIntelligenceView />;
      case 'ai-risk-scanner':
        return <AIRiskScannerView />;
      case 'ai-copilot':
        return <AIPortfolioCopilotView />;
      case 'ai-agent':
        return <AITradingAgentView />;
      case 'portfolio':
        return <PortfolioView />;
      case 'wallet':
        return <WalletView />;
      case 'transactions':
        return <TransactionsView />;
      case 'watchlist':
        return <WatchlistView />;
      case 'alerts':
        return <AlertsView />;
      case 'security-center':
        return <SecurityCenterView />;
      case 'developer-api':
        return <DeveloperApiView />;
      case 'admin-console':
        return <AdminConsoleView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="min-h-screen bg-[#03060B] text-slate-200 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200 relative overflow-hidden terminal-grid">
      {/* Ambient Quantum Light Accents */}
      <div className="fixed top-0 left-1/4 w-[600px] h-[300px] bg-gradient-to-r from-blue-600/10 via-cyan-500/10 to-transparent rounded-full blur-3xl pointer-events-none -z-10 animate-quantum-pulse" />
      <div className="fixed bottom-0 right-1/4 w-[500px] h-[350px] bg-gradient-to-r from-purple-600/8 via-indigo-500/8 to-transparent rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Top Header */}
      <Header />

      {/* Main Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Navigation Sidebar / Mobile Dock */}
        <Navigation />

        {/* Dynamic Viewport with Motion Transition */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-6 lg:p-8 pb-32 sm:pb-12 lg:pb-12 relative scroll-smooth">
          <div className="max-w-7xl mx-auto space-y-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={`${activeView}-${selectedPair.base?.symbol}-${selectedPair.quote?.symbol}`}
                initial={{ opacity: 0, y: 10, scale: 0.995 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.995 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              >
                {renderView()}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>

      {/* Institutional Status Telemetry Footer */}
      <footer className="h-8 shrink-0 bg-[#04060C]/90 backdrop-blur-md border-t border-white/[0.06] hidden sm:flex items-center justify-between px-6 text-[10px] text-slate-400 font-mono select-none z-30">
        <div className="flex items-center gap-6">
          <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            {t('app.status.healthy')}
          </span>
          <span className="text-slate-400">LATENCY: <strong className="text-white">12ms</strong></span>
          <span className="text-slate-400">GAS: <strong className="text-amber-400">14 GWEI</strong></span>
          <span className="text-slate-400">RPC: <strong className="text-cyan-400">{t('app.rpc.flashbots')}</strong></span>
        </div>
        <div className="flex items-center gap-4 text-slate-400 font-medium">
          <span className="text-indigo-400 font-bold">HYPERON PRO v4.8</span>
          <span>|</span>
          <span className="text-cyan-300">{t('app.ai.active')}</span>
        </div>
      </footer>

      {/* Pre-Flight Transaction Simulation Modal */}
      <SimulationModal />

      {/* Toast Notification Container */}
      <ToastContainer />
    </div>
  );
};

export default function App() {
  return (
    <I18nProvider>
      <WalletProvider>
        <ExchangeProvider>
          <MainLayout />
        </ExchangeProvider>
      </WalletProvider>
    </I18nProvider>
  );
}

