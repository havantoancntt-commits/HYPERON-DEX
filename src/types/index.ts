export type ChainId = 'ethereum' | 'base' | 'arbitrum' | 'optimism' | 'bsc' | 'polygon';

export type ProductView =
  | 'dashboard'
  | 'ai-signals'
  | 'swap'
  | 'perpetuals'
  | 'trade'
  | 'markets'
  | 'token-details'
  | 'portfolio'
  | 'launchpad'
  | 'onchain-radar'
  | 'wallet'
  | 'liquidity'
  | 'staking'
  | 'payments'
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
  type: 'SWAP' | 'LIMIT_ORDER' | 'ADD_LIQUIDITY' | 'REMOVE_LIQUIDITY' | 'STAKE' | 'UNSTAKE' | 'CLAIM_REWARDS' | 'APPROVE' | 'BRIDGE' | 'SUPPLY' | 'BORROW' | 'REPAY' | 'WITHDRAW_LENDING' | 'FLASH_LOAN' | 'RESTAKE';
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

export type SignalDirection = 'LONG' | 'SHORT' | 'BUY' | 'SELL';
export type SignalType = 'BREAKOUT' | 'WHALE_ACCUMULATION' | 'MOMENTUM_TREND' | 'MEAN_REVERSION' | 'LIQUIDITY_SWEEP' | 'GOLDEN_CROSS';
export type SignalStatus = 'ACTIVE' | 'TRIGGERED' | 'TARGET_1_HIT' | 'TARGET_2_HIT' | 'COMPLETED' | 'INVALIDATED';

export interface AITradingSignal {
  id: string;
  symbol: string;
  pair: string;
  name: string;
  logoUrl?: string;
  chainId: ChainId;
  direction: SignalDirection;
  signalType: SignalType;
  winRateProbability: number; // e.g. 93.8 (%)
  confidenceScore: number; // 0 - 100
  riskRewardRatio: string; // e.g. "1:4.8"
  timeframe: '15M' | '1H' | '4H' | '1D';
  currentPrice: number;
  entryZoneMin: number;
  entryZoneMax: number;
  takeProfit1: number;
  takeProfit2: number;
  takeProfit3: number;
  stopLoss: number;
  potentialGainPercent: number;
  maxLossPercent: number;
  recommendedLeverage: number; // 1x - 25x
  recommendedPositionSizePercent: number; // e.g. 5% - 15%
  indicatorsConfluence: {
    rsi: number;
    macd: string;
    whaleFlowUsd: string;
    volumeMultiplier: string;
    orderbookImbalance: string;
    fundingRate: string;
  };
  aiRationale: string;
  invalidationCriteria: string;
  status: SignalStatus;
  timestamp: number;
  backtestStats?: {
    historicalWinRate: number;
    sampleTradesCount: number;
    profitFactor: number;
  };
}

export interface PerpetualPosition {
  id: string;
  pair: string;
  symbol: string;
  side: 'LONG' | 'SHORT';
  entryPrice: number;
  markPrice: number;
  liquidationPrice: number;
  sizeUsd: number;
  marginUsd: number;
  leverage: number;
  pnlUsd: number;
  pnlPercent: number;
  takeProfitPrice?: number;
  stopLossPrice?: number;
  trailingStopPercent?: number;
  fundingRate8hPercent: number;
  fundingEarnedUsd: number;
  openedAt: number;
}

export interface LaunchpadProject {
  id: string;
  name: string;
  symbol: string;
  tagline: string;
  description: string;
  logoUrl: string;
  category: 'AI Agents' | 'Layer 2' | 'DeFi 3.0' | 'Real World Assets' | 'Zero-Knowledge' | 'Infrastructure';
  securityScore: number; // 0 - 100
  isAuditVerified: boolean;
  tokenPriceUsd: number;
  totalRaiseUsd: number;
  currentRaisedUsd: number;
  participantsCount: number;
  minAllocationUsd: number;
  maxAllocationUsd: number;
  startDate: string;
  endDate: string;
  status: 'UPCOMING' | 'LIVE' | 'ENDED';
  vestingSchedule: string;
  contractAddress: string;
  acceptedToken: string;
  userCommittedAmount?: number;
  features: string[];
}

export interface OnChainWhaleTransaction {
  id: string;
  txHash: string;
  timestamp: number;
  walletLabel: string;
  walletTier: 'Mega Whale (> $25M)' | 'Smart Money Alpha' | 'Market Maker' | 'Institutional Fund' | 'DEX Arbitrageur';
  action: 'ACCUMULATE' | 'DISTRIBUTE' | 'CEX_WITHDRAWAL' | 'DEX_SWAP' | 'LIQUIDITY_ADD';
  symbol: string;
  amountTokens: number;
  valueUsd: number;
  fromAddress: string;
  toAddress: string;
  aiSentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  aiInterpretation: string;
}

export interface Web3MerchantInvoice {
  id: string;
  title: string;
  recipientWallet: string;
  amountUsd: number;
  preferredToken: string;
  status: 'PAID' | 'PENDING' | 'EXPIRED';
  customerNote: string;
  createdAt: number;
  txHash?: string;
  items?: { description: string; qty: number; unitPrice: number }[];
}

export interface LendingMarketAsset {
  id: string;
  token: Token;
  chainId: ChainId;
  supplyApyPercent: number;
  borrowAprPercent: number;
  stableBorrowAprPercent: number;
  totalSupplyUsd: number;
  totalBorrowUsd: number;
  availableLiquidityUsd: number;
  utilizationRatePercent: number;
  maxLtvPercent: number; // e.g. 80%
  liquidationThresholdPercent: number; // e.g. 85%
  liquidationPenaltyPercent: number; // e.g. 5%
  collateralEnabled: boolean;
  canBeBorrowed: boolean;
  userSuppliedAmount: number;
  userBorrowedAmount: number;
  isCollateralActive: boolean;
  aiRiskTier: 'AAA - Minimal' | 'AA - Secure' | 'A - Moderate' | 'BBB - Volatile';
  reserveFactorPercent: number;
}

export interface UserLendingHealth {
  totalCollateralUsd: number;
  totalBorrowedUsd: number;
  currentLtvPercent: number;
  maxBorrowCapacityUsd: number;
  borrowPowerUsedPercent: number;
  healthFactor: number; // e.g. 2.45
  netApyPercent: number;
  liquidationRiskTier: 'SAFE' | 'MODERATE' | 'ELEVATED' | 'CRITICAL' | 'LIQUIDATION';
  aiDeleverageRecommended: boolean;
  aiAdvice: string;
}

export interface FlashLoanOpportunity {
  id: string;
  token: Token;
  maxAvailableUsd: number;
  protocolFeePercent: number; // e.g. 0.05%
  estimatedGasGwei: number;
  targetDEXA: string;
  targetDEXB: string;
  spreadPercent: number;
  estimatedNetProfitUsd: number;
  executionRoute: string;
  aiConfidenceScore: number;
}

export interface RestakingStrategy {
  id: string;
  name: string;
  protocol: 'EigenLayer' | 'Symbiotic' | 'Karak' | 'Hyperon Restake AVS';
  asset: Token;
  derivativeTokenSymbol: string;
  totalApyPercent: number;
  baseStakingApy: number;
  restakingRewardApy: number;
  avsCount: number;
  slashingRiskScore: number; // 0 - 100
  tvlUsd: number;
  userStakedAmount: number;
  instantUnstakeFeePercent: number;
}

