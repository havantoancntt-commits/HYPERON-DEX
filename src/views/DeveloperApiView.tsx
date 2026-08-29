import React, { useState } from 'react';
import { Code2, Terminal, Copy, CheckCircle2, Sparkles, ExternalLink, Zap } from 'lucide-react';
import { useExchange } from '../context/ExchangeContext';

export const DeveloperApiView: React.FC = () => {
  const { addToast } = useExchange();
  const [activeTab, setActiveTab] = useState<'quotes' | 'risk' | 'ai' | 'sdk'>('quotes');
  const [apiResponse, setApiResponse] = useState<string>('// Click "Run Test Request" to execute live against backend API');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const runTestRequest = async () => {
    setIsLoading(true);
    try {
      if (activeTab === 'quotes') {
        const res = await fetch('/api/quotes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fromTokenSymbol: 'ETH', toTokenSymbol: 'USDC', amount: 1.0 }),
        });
        const data = await res.json();
        setApiResponse(JSON.stringify(data, null, 2));
      } else if (activeTab === 'risk') {
        const res = await fetch('/api/ai/token-scanner', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', symbol: 'USDC' }),
        });
        const data = await res.json();
        setApiResponse(JSON.stringify(data, null, 2));
      } else if (activeTab === 'ai') {
        const res = await fetch('/api/ai/market-intelligence?symbol=ETH');
        const data = await res.json();
        setApiResponse(JSON.stringify(data, null, 2));
      }
    } catch (err) {
      setApiResponse(JSON.stringify({ error: 'API request failed' }, null, 2));
    } finally {
      setIsLoading(false);
    }
  };

  const copyCode = (text: string) => {
    navigator.clipboard.writeText(text);
    addToast({
      title: 'Code Copied',
      message: 'Snippet copied to clipboard.',
      type: 'info',
    });
  };

  const sdkCode = `import { HyperonDEXClient } from '@hyperondex/sdk';

// Initialize non-custodial client
const client = new HyperonDEXClient({
  chainId: 'ethereum',
  mevProtection: true,
});

// 1. Get split-route quote
const quote = await client.getSmartQuote({
  fromToken: 'ETH',
  toToken: 'USDC',
  amount: '2.5',
  slippagePercent: 0.5,
});

console.log('Expected output:', quote.expectedOutput);
console.log('Routes:', quote.routeSplits);

// 2. Pre-flight simulate transaction
const simulation = await client.simulateTransaction(quote);
if (simulation.success) {
  // Construct unsigned transaction for wallet signing
  const unsignedTx = await client.buildSwapTransaction(quote);
  console.log('Unsigned payload:', unsignedTx);
}`;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="p-6 rounded-2xl bg-[#0A0A0A] border border-white/5 shadow-2xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Code2 className="w-5 h-5" />
            </span>
            Developer API & TypeScript SDK
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Programmatic access to DEX split quotes, AI contract risk audits, and mempool simulation engines.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-white/5 pb-2 text-xs font-mono">
        <button
          onClick={() => setActiveTab('quotes')}
          className={`px-3 py-1.5 rounded-xl transition-colors cursor-pointer ${
            activeTab === 'quotes' ? 'bg-blue-600/15 text-blue-400 font-bold border border-blue-500/30' : 'bg-[#121212] text-slate-400 hover:text-slate-200 border border-white/5'
          }`}
        >
          POST /api/quotes
        </button>
        <button
          onClick={() => setActiveTab('risk')}
          className={`px-3 py-1.5 rounded-xl transition-colors cursor-pointer ${
            activeTab === 'risk' ? 'bg-blue-600/15 text-blue-400 font-bold border border-blue-500/30' : 'bg-[#121212] text-slate-400 hover:text-slate-200 border border-white/5'
          }`}
        >
          POST /api/ai/token-scanner
        </button>
        <button
          onClick={() => setActiveTab('ai')}
          className={`px-3 py-1.5 rounded-xl transition-colors cursor-pointer ${
            activeTab === 'ai' ? 'bg-blue-600/15 text-blue-400 font-bold border border-blue-500/30' : 'bg-[#121212] text-slate-400 hover:text-slate-200 border border-white/5'
          }`}
        >
          GET /api/ai/market-intelligence
        </button>
        <button
          onClick={() => setActiveTab('sdk')}
          className={`px-3 py-1.5 rounded-xl transition-colors cursor-pointer ${
            activeTab === 'sdk' ? 'bg-blue-600/15 text-blue-400 font-bold border border-blue-500/30' : 'bg-[#121212] text-slate-400 hover:text-slate-200 border border-white/5'
          }`}
        >
          TypeScript SDK
        </button>
      </div>

      {activeTab === 'sdk' ? (
        <div className="rounded-2xl bg-[#0A0A0A] border border-white/5 p-4 space-y-3 font-mono text-xs shadow-xl">
          <div className="flex items-center justify-between text-slate-400 pb-2 border-b border-white/5">
            <span>npm install @aetherdex/sdk</span>
            <button
              onClick={() => copyCode(sdkCode)}
              className="flex items-center gap-1 text-blue-400 hover:text-blue-300 cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" /> Copy Snippet
            </button>
          </div>
          <pre className="text-slate-300 overflow-x-auto p-4 rounded-xl bg-[#121212] border border-white/5 text-[11px] leading-relaxed">
            {sdkCode}
          </pre>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Request Config */}
          <div className="p-5 rounded-2xl bg-[#0A0A0A] border border-white/5 space-y-4 shadow-xl">
            <div className="text-xs font-mono font-bold text-white">
              Interactive Endpoint Tester
            </div>
            <div className="p-3 rounded-xl bg-[#121212] border border-white/5 font-mono text-xs text-slate-300">
              {activeTab === 'quotes' && `curl -X POST https://aetherdex.io/api/quotes \\\n  -H "Content-Type: application/json" \\\n  -d '{"fromTokenSymbol":"ETH","toTokenSymbol":"USDC","amount":1.0}'`}
              {activeTab === 'risk' && `curl -X POST https://aetherdex.io/api/ai/token-scanner \\\n  -H "Content-Type: application/json" \\\n  -d '{"address":"0xA0b8...B48","symbol":"USDC"}'`}
              {activeTab === 'ai' && `curl -X GET https://aetherdex.io/api/ai/market-intelligence?symbol=ETH`}
            </div>

            <button
              onClick={runTestRequest}
              disabled={isLoading}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-900/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Zap className="w-3.5 h-3.5" /> {isLoading ? 'Executing Request...' : 'Run Test Request'}
            </button>
          </div>

          {/* Response Payload */}
          <div className="p-5 rounded-2xl bg-[#0A0A0A] border border-white/5 space-y-2 shadow-xl">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400">
              <span>Response Payload (JSON)</span>
              <button onClick={() => copyCode(apiResponse)} className="hover:text-slate-200 cursor-pointer">
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
            <pre className="p-3 rounded-xl bg-[#121212] border border-white/5 text-emerald-400 font-mono text-[11px] max-h-72 overflow-y-auto leading-relaxed">
              {apiResponse}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
