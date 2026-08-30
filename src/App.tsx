import React from 'react';
import { WalletProvider } from './context/WalletContext';
import { ExchangeProvider, useExchange } from './context/ExchangeContext';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import { SimulationModal } from './components/SimulationModal';
import { ToastContainer } from './components/ToastContainer';

// Views
import { DashboardView } from './views/DashboardView';
import { AISignalsView } from './views/AISignalsView';
import { SwapView } from './views/SwapView';
import { PerpetualsView } from './views/PerpetualsView';
import { TradeTerminalView } from './views/TradeTerminalView';
import { MarketsView } from './views/MarketsView';
import { TokenDetailsView } from './views/TokenDetailsView';
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
  const { activeView } = useExchange();

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
    <div className="min-h-screen bg-[#050505] text-slate-200 flex flex-col font-sans selection:bg-blue-600/30 selection:text-blue-200">
      {/* Top Header */}
      <Header />

      {/* Main Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Navigation Sidebar / Mobile Dock */}
        <Navigation />

        {/* Dynamic Viewport */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-[#050505]">
          <div className="max-w-7xl mx-auto">
            {renderView()}
          </div>
        </main>
      </div>

      {/* Institutional Status Footer */}
      <footer className="h-8 shrink-0 bg-[#050505] border-t border-white/5 hidden sm:flex items-center justify-between px-6 text-[10px] text-slate-500 font-mono select-none z-30">
        <div className="flex items-center gap-6">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            SYSTEM: OPTIMAL
          </span>
          <span>LATENCY: 14MS</span>
          <span>GAS: 18 GWEI</span>
          <span>MEV RPC: FLASHBOTS ENABLED</span>
        </div>
        <div className="flex items-center gap-4 text-slate-500">
          <span>NEXUS AI ENGINE v4.2.0-STABLE</span>
          <span>|</span>
          <span>AI AGENT STATUS: ACTIVE</span>
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
    <WalletProvider>
      <ExchangeProvider>
        <MainLayout />
      </ExchangeProvider>
    </WalletProvider>
  );
}
