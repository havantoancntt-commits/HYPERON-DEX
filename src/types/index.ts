export type ChainId = 'ethereum' | 'base' | 'arbitrum' | 'optimism' | 'bsc' | 'polygon';

export type ProductView =
  | 'dashboard'
  | 'swap'
  | 'trade'
  | 'markets'
  | 'token-details'
  | 'portfolio'
  | 'wallet'
  | 'liquidity'
  | 'staking'
  | 'ai-intelligence'
  | 'ai-risk-scanner'
  | 'ai-copilot'
  | 'ai-agent'
  | 'cross-chain'
  | 'transactions'
  | 'watchlist'
  | 'alerts'
  | 'security-center'
  | 'developer-api'
  | 'admin-console'
  | 'settings';

export interface ChainConfig {
  id: ChainId;
  name: string;
  shortName: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  rpcUrl: string;
  explorerUrl: string;
  blockTimeSec: number;
  color: string;
  logo: string;
  isL2: boolean;
  status: 'active' | 'degraded' | 'maintenance';
}

export interface Token {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  chainId: ChainId;
  priceUsd: number;
  change24h: number;
  volume24h: number;
  liquidityUsd: number;
  marketCapUsd: number;
  logoUrl: string;
  isVerified: boolean;
  isNative?: boolean;
  category: 'Layer 1' | 'Layer 2' | 'DeFi' | 'AI' | 'Meme' | 'Stablecoin' | 'Infrastructure';
}

export interface DexSource {
  id: string;
  name: string;
  logo: string;
  sharePercent: number;
  expectedOutput: number;
  poolFeePercent: number;
}

export interface RouteSplit {
  dexName: string;
  percentage: number;
  fromToken: string;
  toToken: string;
  path: string[];
}

export interface SwapQuote {
  id: string;
  fromToken: Token;
  toToken: Token;
  fromAmount: number;
  expectedOutput: number;
  minimumReceived: number;
  priceImpactPercent: number;
  slippagePercent: number;
  estimatedGasUsd: number;
  routingFeeUsd: number;
  executionPrice: number;
  sources: DexSource[];
  routeSplits: RouteSplit[];
  timestamp: number;
  expiresInSec: number;
  isBestPrice: boolean;
  mevProtected: boolean;
}

export interface TransactionSimulation {
  success: boolean;
  intentId: string;
  correlationId: string;
  fromAddress: string;
  toAddress: string;
  gasEstimated: number;
  gasCostUsd: number;
  balanceBefore: number;
  balanceAfter: number;
  allowanceRequired: boolean;
  allowanceApproved: boolean;
  priceImpactSafe: boolean;
  priceImpactValue: number;
  slippageConfigured: number;
  smartContractRiskScore: number;
  warnings: string[];
  simulationLogs: string[];
  blockNumberSimulated: number;
}

export interface OrderBookEntry {
  price: number;
  amount: number;
  total: number;
}

export interface LivePriceData {
  symbol: string;
  priceUsd: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  marketCapUsd: number;
  lastUpdated: number;
  tickDirection: 'up' | 'down' | 'same';
}

export interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface OrderBook {
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
  spread: number;
  spreadPercent: number;
}

export interface TradeRecord {
  id: string;
  timestamp: number;
  price: number;
  amount: number;
  type: 'buy' | 'sell';
  txHash: string;
}

export type OrderType = 'market' | 'limit' | 'stop_limit' | 'take_profit' | 'twap';
export type OrderStatus = 'open' | 'filled' | 'partially_filled' | 'cancelled' | 'expired';

export interface UserOrder {
  id: string;
  pair: string;
  type: OrderType;
  side: 'buy' | 'sell';
  price: number;
  stopPrice?: number;
  amount: number;
  filledAmount: number;
  status: OrderStatus;
  createdAt: number;
  expiresAt?: number;
  chainId: ChainId;
}

export interface TokenSecurityReport {
  tokenAddress: string;
  tokenSymbol: string;
  chainId: ChainId;
  securityScore: number; // 0 - 100
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  isHoneypot: boolean;
  isContractVerified: boolean;
  isProxyContract: boolean;
  isMintable: boolean;
  isPausable: boolean;
  hasBlacklist: boolean;
  hasWhitelist: boolean;
  buyTaxPercent: number;
  sellTaxPercent: number;
  transferRestrictions: string;
  liquidityLockedPercent: number;
  liquidityLockDurationDays: number;
  top10HoldersPercent: number;
  creatorOwnershipRenounced: boolean;
  suspiciousPermissions: string[];
  riskSummary: string;
  lastScannedTimestamp: number;
}

export interface AIMarketIntelligence {
  marketScore: number; // 0 - 100
  trend: 'Bullish' | 'Bearish' | 'Neutral' | 'Strong Bullish' | 'Strong Bearish';
  momentum: 'Strong' | 'Moderate' | 'Weak';
  volatility: 'Low' | 'Medium' | 'High' | 'Extreme';
  liquidityCondition: 'High' | 'Adequate' | 'Thin';
  marketRisk: 'Low' | 'Moderate' | 'Elevated' | 'High';
  confidenceScore: number; // 0 - 100
  whaleActivityLevel: 'High Inflow' | 'High Outflow' | 'Neutral' | 'Accumulating';
  keyInsights: string[];
  onChainMetrics: {
    activeAddresses24h: number;
    largeTransactionsCount: number;
    exchangeNetInflowUsd: number;
    gasFeeAverageGwei: number;
  };
  disclaimer: string;
  generatedAt: string;
}

export interface PortfolioAsset {
  token: Token;
  balance: number;
  valueUsd: number;
  allocationPercent: number;
  unrealizedPnlUsd: number;
  unrealizedPnlPercent: number;
  avgBuyPriceUsd: number;
}

export interface LiquidityPool {
  id: string;
  chainId: ChainId;
  name: string;
  token0: Token;
  token1: Token;
  feeTierPercent: number;
  tvlUsd: number;
  volume24hUsd: number;
  fees24hUsd: number;
  aprPercent: number;
  userPosition?: {
    liquidityUsd: number;
    token0Amount: number;
    token1Amount: number;
    unclaimedFeesUsd: number;
  };
}

export interface StakingVault {
  id: string;
  name?: string;
  protocolName?: string;
  protocol?: string;
  chainId: ChainId;
  asset?: Token;
  stakeToken?: Token;
  rewardToken: Token;
  totalStakedUsd?: number;
  tvlUsd?: number;
  baseAprPercent?: number;
  rewardAprPercent?: number;
  totalApyPercent?: number;
  aprPercent?: number;
  lockDurationDays: number;
  riskRating?: 'A+' | 'A' | 'B+' | 'B' | 'C';
  securityScore?: string;
  userStaked?: {
    stakedAmount: number;
    stakedUsd: number;
    pendingRewards: number;
    unlockTimestamp: number;
  };
  userStakedBalance?: number;
  userPendingRewards?: number;
}

export interface CrossChainBridgeRoute {
  id: string;
  protocolName: string;
  logo: string;
  fromChain: ChainId;
  toChain: ChainId;
  fromToken: string;
  toToken: string;
  estimatedTimeMin: number;
  bridgeFeeUsd: number;
  gasCostUsd: number;
  receivedAmount: number;
  securityRating: 'Very High' | 'High' | 'Medium';
  protocolTvlUsd: number;
}

export interface TransactionHistoryItem {
  id: string;
  txHash: string;
  chainId: ChainId;
  type: 'SWAP' | 'LIMIT_ORDER' | 'ADD_LIQUIDITY' | 'REMOVE_LIQUIDITY' | 'STAKE' | 'UNSTAKE' | 'CLAIM_REWARDS' | 'APPROVE' | 'BRIDGE';
  status: 'confirmed' | 'pending' | 'failed';
  fromToken?: string;
  toToken?: string;
  fromAmount?: number;
  toAmount?: number;
  gasSpentGwei: number;
  gasSpentUsd: number;
  timestamp: number;
  blockNumber: number;
  correlationId: string;
}

export interface AIAgentIntent {
  id: string;
  agentId?: string;
  agentName?: string;
  title?: string;
  description?: string;
  strategy?: 'Dollar Cost Averaging' | 'Portfolio Rebalancing' | 'Volatility Arbitrage' | 'Yield Maximizer' | 'Risk Hedging' | string;
  riskLevel?: 'Conservative' | 'Moderate' | 'Aggressive';
  permissionStep?: 'READ_ONLY' | 'ANALYZE' | 'PROPOSE' | 'USER_CONFIRM' | 'EXECUTED';
  fromToken?: string;
  toToken?: string;
  targetAmount?: number;
  maxSlippagePercent?: number;
  estimatedReturnPercent?: number;
  type?: 'SWAP' | 'REBALANCE' | 'HEDGE' | 'YIELD';
  targetPair?: string;
  suggestedAmount?: number;
  action?: 'BUY' | 'SELL' | 'DEPOSIT' | 'WITHDRAW';
  rationale?: string;
  estimatedProfitUsd?: number;
  confidenceScore?: number;
  simulationPassed?: boolean;
  requiresUserSignature?: boolean;
  timestamp?: number;
  createdAt?: number;
}

export interface SystemAuditLog {
  id: string;
  timestamp: number;
  event: string;
  severity: 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  actor: string;
  ipAddress: string;
  details: string;
}
