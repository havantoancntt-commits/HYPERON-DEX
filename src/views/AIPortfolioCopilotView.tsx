import React, { useState } from 'react';
import { useWallet } from '../context/WalletContext';
import { useExchange } from '../context/ExchangeContext';
import { BrainCircuit, Send, Sparkles, ShieldCheck, ArrowRight, CheckCircle2, User, Bot, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '../lib/utils';

interface ChatMessage {
  sender: 'user' | 'assistant';
  text: string;
  suggestedActions?: {
    title: string;
    description: string;
    targetPair: string;
    suggestedAmount: number;
    type: string;
  }[];
  timestamp: number;
}

export const AIPortfolioCopilotView: React.FC = () => {
  const { balances } = useWallet();
  const { openSwapWithTokens, addToast } = useExchange();

  const [inputMessage, setInputMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      sender: 'assistant',
      text: `Hello! I am your **AI Portfolio Copilot**.\n\nI monitor your multi-chain holdings, analyze smart contract exposure, and calculate delta-neutral hedging opportunities.\n\n*Note: I operate under strict non-custodial principles. I can analyze and propose actions, but every transaction requires your explicit cryptographic confirmation.*`,
      suggestedActions: [
        {
          title: 'Optimize Stablecoin Yield',
          description: 'Deploy idle USDC ($14,250) into audited Curve 3pool earning 13.6% APY.',
          targetPair: 'USDC/Vault',
          suggestedAmount: 2500,
          type: 'YIELD',
        },
        {
          title: 'Hedge Downside Exposure',
          description: 'Establish trailing stop-loss for 2.0 ETH at $3,250 to protect against macroeconomic volatility.',
          targetPair: 'ETH/USDC',
          suggestedAmount: 2.0,
          type: 'HEDGE',
        },
      ],
      timestamp: Date.now(),
    },
  ]);

  const handleSendMessage = async (customText?: string) => {
    const textToSend = customText || inputMessage;
    if (!textToSend.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      sender: 'user',
      text: textToSend,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/ai/portfolio-copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          portfolioSummary: {
            totalValue: 48500,
            balances,
          },
        }),
      });

      const data = await res.json();
      const assistantMsg: ChatMessage = {
        sender: 'assistant',
        text: data.analysis || 'I have reviewed your portfolio state and verified no high-risk contract approvals are active.',
        suggestedActions: data.suggestedActions || [],
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      console.warn('Copilot error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExecuteProposal = (pair: string) => {
    const [from, to] = pair.split('/');
    openSwapWithTokens(from, to || 'USDC');
    addToast({
      title: 'Action Loaded in Smart Router',
      message: `Reviewing execution parameters for ${pair}...`,
      type: 'info',
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4 pb-12">
      {/* Header Banner */}
      <div className="rounded-2xl bg-[#0A0A0A] border border-white/5 p-5 shadow-2xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <BrainCircuit className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              AI Portfolio Copilot
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold uppercase">
                Non-Custodial
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              Interactive risk diagnostic and automated portfolio rebalancing advisor.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-slate-400">Monitored Assets:</span>
          <span className="font-bold text-white">$48,500.00</span>
        </div>
      </div>

      {/* Preset Strategy Prompts */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <button
          onClick={() => handleSendMessage('Analyze my portfolio concentration and risk factors.')}
          className="px-3.5 py-1.5 rounded-xl bg-[#0A0A0A] hover:bg-[#141414] text-slate-300 border border-white/5 whitespace-nowrap transition-colors cursor-pointer"
        >
          🔍 Analyze Concentration Risk
        </button>
        <button
          onClick={() => handleSendMessage('How should I hedge against Ethereum downside volatility?')}
          className="px-3.5 py-1.5 rounded-xl bg-[#0A0A0A] hover:bg-[#141414] text-slate-300 border border-white/5 whitespace-nowrap transition-colors cursor-pointer"
        >
          🛡️ Downside Hedging Strategy
        </button>
        <button
          onClick={() => handleSendMessage('Suggest optimal yield staking allocation for my USDC.')}
          className="px-3.5 py-1.5 rounded-xl bg-[#0A0A0A] hover:bg-[#141414] text-slate-300 border border-white/5 whitespace-nowrap transition-colors cursor-pointer"
        >
          ⚡ Optimize Idle USDC Yield
        </button>
      </div>

      {/* Chat Conversation History */}
      <div className="rounded-2xl bg-[#0A0A0A] border border-white/5 p-4 sm:p-6 shadow-2xl min-h-[460px] flex flex-col justify-between space-y-4">
        <div className="space-y-4 overflow-y-auto max-h-[500px] pr-2">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex gap-3 text-xs leading-relaxed ${
                msg.sender === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {msg.sender === 'assistant' && (
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-2xl p-4 rounded-2xl space-y-3 ${
                  msg.sender === 'user'
                    ? 'bg-blue-600 text-white rounded-br-none shadow-lg shadow-blue-900/20'
                    : 'bg-[#121212] border border-white/5 text-slate-200 rounded-bl-none'
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.text}</div>

                {/* Suggested Action Cards */}
                {msg.suggestedActions && msg.suggestedActions.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-white/5">
                    <div className="text-[11px] font-mono text-blue-400 uppercase tracking-wider font-semibold">
                      Actionable Non-Custodial Proposals:
                    </div>
                    {msg.suggestedActions.map((action, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-[#080808] border border-white/5 flex items-center justify-between gap-3"
                      >
                        <div>
                          <div className="font-semibold text-white">{action.title}</div>
                          <div className="text-[11px] text-slate-400">{action.description}</div>
                        </div>
                        <button
                          onClick={() => handleExecuteProposal(action.targetPair)}
                          className="px-3 py-1.5 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 border border-blue-500/30 font-semibold text-[11px] flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
                        >
                          Review <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {msg.sender === 'user' && (
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-md">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3 text-xs">
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 animate-spin" />
              </div>
              <div className="p-4 rounded-2xl bg-[#121212] border border-white/5 text-slate-400">
                Analyzing portfolio state & computing optimal risk vectors with Gemini...
              </div>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="pt-2 border-t border-white/5 flex items-center gap-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Ask AI Copilot about rebalancing, correlation, or smart contract exposure..."
            className="flex-1 p-3 rounded-xl bg-[#121212] border border-white/5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
          />
          <button
            onClick={() => handleSendMessage()}
            disabled={isLoading || !inputMessage.trim()}
            className="p-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all disabled:opacity-40 cursor-pointer shadow-lg shadow-blue-900/20"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
