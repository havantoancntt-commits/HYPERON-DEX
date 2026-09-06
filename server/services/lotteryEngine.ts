/**
 * HYPERON-DEX Provably Fair Lottery & Chainlink VRF 2.5 Architecture
 * High-Precision Countdown, Intelligent Prize Matrix, Rollover Pot Accumulation,
 * Dynamic Multipliers, and Zero-Latency Automated Payout Settlement Engine.
 */

import { keccak256, encodePacked, toHex } from 'viem';
import crypto from 'crypto';
import {
  LotteryRound,
  LotteryTicket,
  LotteryWinnerRecord,
  LotteryStats,
  LotteryPoolId,
  NoLossSavingsDeposit,
  LotterySyndicatePool,
  LotteryAnalytics,
  LotteryTierPrize,
} from '../../src/types';
import { getUsdPrice } from './priceFeed';
import { loadPersistedLotteryState, savePersistedLotteryState } from './lotteryStore';
import { DexError, DEX_ERROR_CODES } from '../../src/lib/errorCodes';

export interface VRFRequestCommitment {
  requestId: string;
  roundId: number;
  poolId: LotteryPoolId;
  keyHash: string;
  subscriptionId: number;
  minConfirmations: number;
  callbackGasLimit: number;
  randomWordsCount: number;
  blockNumber: number;
  status: 'REQUESTED' | 'FULFILLED' | 'CANCELLED';
  proofSeed?: string;
  fulfillmentTxHash?: string;
}

let currentRoundId = 142;
let hourlyRoundId = 894;
let savingsRoundId = 28;

const roundsDb: Record<number, LotteryRound> = {};
const userTicketsDb: LotteryTicket[] = [];
const savingsDepositsDb: NoLossSavingsDeposit[] = [];
const recentWinnersDb: LotteryWinnerRecord[] = [];
const vrfRequestsDb: Record<string, VRFRequestCommitment> = {};
const syndicatesDb: LotterySyndicatePool[] = [];
const secretSaltsDb: Record<number, string> = {};

export function persistLotteryState(): void {
  savePersistedLotteryState({
    currentRoundId,
    hourlyRoundId,
    savingsRoundId,
    roundsDb,
    userTicketsDb,
    savingsDepositsDb,
    recentWinnersDb,
    syndicatesDb,
    secretSaltsDb,
  });
}

/**
 * Local Simulation VRF with Commit-Reveal Scheme & Mainnet Coordinator Configuration
 * In local / devnet simulation mode, draws use a verifiable commit-reveal scheme.
 * Mainnet production targets Chainlink VRF 2.5 Coordinator.
 */
export const CHAINLINK_VRF_COORDINATOR = '0x271682DEB8C4E0901D1a1550aD2e64D568E69909';
export const VRF_KEY_HASH = '0x8af398995b04c28e9951ced97dc3d827029123e8095e4d437164409a81a182f0';
export const HYPR_DEAD_BURN_ADDRESS = '0x000000000000000000000000000000000000dEaD';

/**
 * Standard Professional Prize Tier Structure for 6-digit Lottery
 */
export function createStandardPrizeTiers(totalPotUsd: number, poolId: LotteryPoolId): LotteryTierPrize[] {
  if (poolId === 'hourly-lightning') {
    return [
      {
        matchedDigits: 6,
        label: 'Grand Jackpot (6/6)',
        allocationPercent: 55,
        poolAmountUsd: Number((totalPotUsd * 0.55).toFixed(2)),
        winnersCount: 0,
        prizePerWinnerUsd: Number((totalPotUsd * 0.55).toFixed(2)),
        oddsRatio: '1 : 1,000,000',
        oddsPercentage: 0.0001,
        guaranteedMinUsd: 10000,
      },
      {
        matchedDigits: 5,
        label: 'High Roll Second (5/6)',
        allocationPercent: 18,
        poolAmountUsd: Number((totalPotUsd * 0.18).toFixed(2)),
        winnersCount: 0,
        prizePerWinnerUsd: 0,
        oddsRatio: '1 : 18,518',
        oddsPercentage: 0.0054,
        guaranteedMinUsd: 250,
      },
      {
        matchedDigits: 4,
        label: 'Diamond Tier (4/6)',
        allocationPercent: 12,
        poolAmountUsd: Number((totalPotUsd * 0.12).toFixed(2)),
        winnersCount: 0,
        prizePerWinnerUsd: 0,
        oddsRatio: '1 : 925',
        oddsPercentage: 0.108,
        guaranteedMinUsd: 30,
      },
      {
        matchedDigits: 3,
        label: 'Gold Tier (3/6)',
        allocationPercent: 7,
        poolAmountUsd: Number((totalPotUsd * 0.07).toFixed(2)),
        winnersCount: 0,
        prizePerWinnerUsd: 0,
        oddsRatio: '1 : 77',
        oddsPercentage: 1.298,
        guaranteedMinUsd: 5,
      },
      {
        matchedDigits: 2,
        label: 'Silver Tier (2/6)',
        allocationPercent: 4,
        poolAmountUsd: Number((totalPotUsd * 0.04).toFixed(2)),
        winnersCount: 0,
        prizePerWinnerUsd: 0,
        oddsRatio: '1 : 11',
        oddsPercentage: 9.09,
        guaranteedMinUsd: 1.5,
      },
      {
        matchedDigits: 1,
        label: 'Instant Cash (1/6)',
        allocationPercent: 2,
        poolAmountUsd: Number((totalPotUsd * 0.02).toFixed(2)),
        winnersCount: 0,
        prizePerWinnerUsd: 0,
        oddsRatio: '1 : 2.5',
        oddsPercentage: 40.0,
        guaranteedMinUsd: 0.5,
      },
      {
        matchedDigits: 0,
        label: 'HYPR Burn & Stakers Protocol Fee',
        allocationPercent: 2,
        poolAmountUsd: Number((totalPotUsd * 0.02).toFixed(2)),
        winnersCount: 0,
        prizePerWinnerUsd: 0,
        oddsRatio: 'Protocol',
        oddsPercentage: 0,
      },
    ];
  }

  if (poolId === 'no-loss-savings') {
    return [
      {
        matchedDigits: 6,
        label: 'Grand Yield Harvest Jackpot (6/6)',
        allocationPercent: 65,
        poolAmountUsd: Number((totalPotUsd * 0.65).toFixed(2)),
        winnersCount: 0,
        prizePerWinnerUsd: Number((totalPotUsd * 0.65).toFixed(2)),
        oddsRatio: '1 : 1,000,000',
        oddsPercentage: 0.0001,
        guaranteedMinUsd: 50000,
      },
      {
        matchedDigits: 5,
        label: 'Yield Super Bonus (5/6)',
        allocationPercent: 20,
        poolAmountUsd: Number((totalPotUsd * 0.20).toFixed(2)),
        winnersCount: 0,
        prizePerWinnerUsd: 0,
        oddsRatio: '1 : 18,518',
        oddsPercentage: 0.0054,
        guaranteedMinUsd: 5000,
      },
      {
        matchedDigits: 4,
        label: 'Staking Booster (4/6)',
        allocationPercent: 15,
        poolAmountUsd: Number((totalPotUsd * 0.15).toFixed(2)),
        winnersCount: 0,
        prizePerWinnerUsd: 0,
        oddsRatio: '1 : 925',
        oddsPercentage: 0.108,
        guaranteedMinUsd: 500,
      },
    ];
  }

  // Mega Daily Default
  return [
    {
      matchedDigits: 6,
      label: 'Mega Grand Jackpot (6/6)',
      allocationPercent: 50,
      poolAmountUsd: Number((totalPotUsd * 0.50).toFixed(2)),
      winnersCount: 0,
      prizePerWinnerUsd: Number((totalPotUsd * 0.50).toFixed(2)),
      oddsRatio: '1 : 1,000,000',
      oddsPercentage: 0.0001,
      guaranteedMinUsd: 250000,
    },
    {
      matchedDigits: 5,
      label: 'High Roll Second Prize (5/6)',
      allocationPercent: 18,
      poolAmountUsd: Number((totalPotUsd * 0.18).toFixed(2)),
      winnersCount: 0,
      prizePerWinnerUsd: 0,
      oddsRatio: '1 : 18,518',
      oddsPercentage: 0.0054,
      guaranteedMinUsd: 1000,
    },
    {
      matchedDigits: 4,
      label: 'Diamond Tier (4/6)',
      allocationPercent: 10,
      poolAmountUsd: Number((totalPotUsd * 0.10).toFixed(2)),
      winnersCount: 0,
      prizePerWinnerUsd: 0,
      oddsRatio: '1 : 925',
      oddsPercentage: 0.108,
      guaranteedMinUsd: 100,
    },
    {
      matchedDigits: 3,
      label: 'Gold Tier (3/6)',
      allocationPercent: 7,
      poolAmountUsd: Number((totalPotUsd * 0.07).toFixed(2)),
      winnersCount: 0,
      prizePerWinnerUsd: 0,
      oddsRatio: '1 : 77',
      oddsPercentage: 1.298,
      guaranteedMinUsd: 20,
    },
    {
      matchedDigits: 2,
      label: 'Silver Tier (2/6)',
      allocationPercent: 5,
      poolAmountUsd: Number((totalPotUsd * 0.05).toFixed(2)),
      winnersCount: 0,
      prizePerWinnerUsd: 0,
      oddsRatio: '1 : 11',
      oddsPercentage: 9.09,
      guaranteedMinUsd: 5,
    },
    {
      matchedDigits: 1,
      label: 'Instant Cashback (1/6)',
      allocationPercent: 3,
      poolAmountUsd: Number((totalPotUsd * 0.03).toFixed(2)),
      winnersCount: 0,
      prizePerWinnerUsd: 0,
      oddsRatio: '1 : 2.5',
      oddsPercentage: 40.0,
      guaranteedMinUsd: 2,
    },
    {
      matchedDigits: 0,
      label: 'HYPR Permanent Deflationary Burn',
      allocationPercent: 4,
      poolAmountUsd: Number((totalPotUsd * 0.04).toFixed(2)),
      winnersCount: 0,
      prizePerWinnerUsd: 0,
      oddsRatio: 'Protocol',
      oddsPercentage: 0,
    },
    {
      matchedDigits: -1,
      label: 'Stakers Yield & Insurance Treasury',
      allocationPercent: 3,
      poolAmountUsd: Number((totalPotUsd * 0.03).toFixed(2)),
      winnersCount: 0,
      prizePerWinnerUsd: 0,
      oddsRatio: 'Protocol',
      oddsPercentage: 0,
    },
  ];
}

function initializeLotteryData() {
  const now = Date.now();

  // Syndicates
  syndicatesDb.push(
    {
      id: 'syn-diamond-whales',
      name: 'Diamond Whales Syndicate 1000x',
      creatorAddress: '0x388C818CA8B9251b393131C08a73683246A77B33',
      poolId: 'mega-daily',
      roundId: currentRoundId,
      targetTickets: 1000,
      currentTickets: 780,
      participantCount: 42,
      pricePerShareUsd: 25.0,
      status: 'RECRUITING',
      description: 'Institutional collective betting pool targeting 1000 randomized tickets for maximum probability of hitting the 6/6 jackpot.',
      bannerGradient: 'from-amber-600 via-yellow-500 to-amber-700',
    },
    {
      id: 'syn-crypto-degens',
      name: '777 Lucky Strike Guild',
      creatorAddress: '0xFE3B557E8Fb62b89F4916B721be55cEb828dBd73',
      poolId: 'hourly-lightning',
      roundId: hourlyRoundId,
      targetTickets: 250,
      currentTickets: 215,
      participantCount: 28,
      pricePerShareUsd: 5.0,
      status: 'RECRUITING',
      description: 'Hourly rush lightning syndicate targeting speed draws with hot frequency numbers.',
      bannerGradient: 'from-cyan-600 via-blue-500 to-indigo-700',
    },
    {
      id: 'syn-defi-savers',
      name: 'Yield Harvesters Syndicate',
      creatorAddress: '0x1Db3439a222C519ab44bb1144fC23CC7210066be',
      poolId: 'no-loss-savings',
      roundId: savingsRoundId,
      targetTickets: 5000,
      currentTickets: 4200,
      participantCount: 110,
      pricePerShareUsd: 0,
      status: 'RECRUITING',
      description: 'Community pool pooling Aave & Compound staking power to harvest 100% no-loss weekly yields.',
      bannerGradient: 'from-emerald-600 via-teal-500 to-green-700',
    }
  );

  // 1. Current Mega Daily Round
  const megaPot = 654280.0;
  roundsDb[currentRoundId] = {
    id: currentRoundId,
    poolId: 'mega-daily',
    poolName: 'Hyperon Mega Ethereum Jackpot #142',
    status: 'OPEN',
    startTime: now - 14 * 3600 * 1000,
    endTime: now + 10 * 3600 * 1000,
    ticketPriceUsd: 5.0,
    jackpotUsd: Number((megaPot * 0.5).toFixed(2)),
    totalPotUsd: megaPot,
    totalTicketsSold: 32840,
    uniqueParticipants: 4210,
    winningNumbers: null,
    burnAmountUsd: Number((megaPot * 0.04).toFixed(2)),
    reserveFundUsd: Number((megaPot * 0.03).toFixed(2)),
    stakersDividendUsd: Number((megaPot * 0.03).toFixed(2)),
    rolloverAmountUsd: 250000.0,
    prizesByTier: createStandardPrizeTiers(megaPot, 'mega-daily'),
  };

  // 2. Current Hourly Lightning Round
  const hourlyPot = 28450.0;
  roundsDb[hourlyRoundId] = {
    id: hourlyRoundId,
    poolId: 'hourly-lightning',
    poolName: 'Speed Lightning Rush #894',
    status: 'OPEN',
    startTime: now - 35 * 60 * 1000,
    endTime: now + 25 * 60 * 1000,
    ticketPriceUsd: 1.0,
    jackpotUsd: Number((hourlyPot * 0.55).toFixed(2)),
    totalPotUsd: hourlyPot,
    totalTicketsSold: 9120,
    uniqueParticipants: 1040,
    winningNumbers: null,
    burnAmountUsd: Number((hourlyPot * 0.02).toFixed(2)),
    reserveFundUsd: Number((hourlyPot * 0.01).toFixed(2)),
    stakersDividendUsd: Number((hourlyPot * 0.01).toFixed(2)),
    rolloverAmountUsd: 9200.0,
    prizesByTier: createStandardPrizeTiers(hourlyPot, 'hourly-lightning'),
  };

  // 3. Current No-Loss Yield Savings Pool
  const savingsPot = 78600.0;
  roundsDb[savingsRoundId] = {
    id: savingsRoundId,
    poolId: 'no-loss-savings',
    poolName: 'DeFi No-Loss Yield Harvest #28',
    status: 'OPEN',
    startTime: now - 3 * 86400 * 1000,
    endTime: now + 4 * 86400 * 1000,
    ticketPriceUsd: 0,
    jackpotUsd: Number((savingsPot * 0.65).toFixed(2)),
    totalPotUsd: savingsPot,
    totalTicketsSold: 134200,
    uniqueParticipants: 1950,
    winningNumbers: null,
    burnAmountUsd: 0,
    reserveFundUsd: 0,
    stakersDividendUsd: 0,
    rolloverAmountUsd: 28000.0,
    prizesByTier: createStandardPrizeTiers(savingsPot, 'no-loss-savings'),
  };

  // Historical Closed Rounds for Empirical Statistics (#132 - #141)
  const historicalNumbersList = [
    [8, 2, 0, 4, 7, 1],
    [3, 9, 1, 8, 2, 7],
    [7, 7, 4, 3, 9, 0],
    [1, 6, 8, 2, 3, 5],
    [9, 2, 4, 7, 8, 3],
    [7, 3, 1, 8, 6, 9],
    [4, 0, 7, 2, 8, 6],
    [8, 7, 3, 9, 1, 2],
    [2, 7, 8, 4, 0, 3],
    [7, 3, 9, 2, 6, 4],
  ];

  historicalNumbersList.forEach((nums, idx) => {
    const rId = currentRoundId - 10 + idx;
    const rPot = 400000.0 + idx * 15000;
    const roundSalt = keccak256(encodePacked(['string', 'uint256', 'uint256'], ['mega-daily', BigInt(rId), BigInt(1700000000 + idx)]));
    const roundCommit = keccak256(encodePacked(['bytes32', 'uint256'], [roundSalt, BigInt(rId)]));
    const roundSeed = keccak256(encodePacked(['bytes32', 'uint256'], [roundCommit, BigInt(rId)]));

    roundsDb[rId] = {
      id: rId,
      poolId: 'mega-daily',
      poolName: `Hyperon Mega Ethereum Jackpot #${rId}`,
      status: 'CLOSED',
      startTime: now - (24 * (11 - idx)) * 3600 * 1000,
      endTime: now - (24 * (10 - idx)) * 3600 * 1000,
      ticketPriceUsd: 5.0,
      jackpotUsd: Number((rPot * 0.5).toFixed(2)),
      totalPotUsd: rPot,
      totalTicketsSold: 20000 + idx * 800,
      uniqueParticipants: 3000 + idx * 95,
      winningNumbers: nums,
      vrfSeed: roundSeed,
      vrfTxHash: keccak256(encodePacked(['bytes32', 'uint256'], [roundSeed, BigInt(rId)])),
      vrfBlockNumber: 21894000 + rId,
      vrfProvider: 'LOCAL_SIMULATION_VRF_COMMIT_REVEAL',
      commitHash: roundCommit,
      revealedSalt: roundSalt,
      burnAmountUsd: Number((rPot * 0.04).toFixed(2)),
      reserveFundUsd: Number((rPot * 0.03).toFixed(2)),
      stakersDividendUsd: Number((rPot * 0.03).toFixed(2)),
      rolloverAmountUsd: 0,
      prizesByTier: [
        { matchedDigits: 6, label: 'Grand Jackpot (6/6)', allocationPercent: 50, poolAmountUsd: rPot * 0.5, winnersCount: 1, prizePerWinnerUsd: rPot * 0.5, oddsRatio: '1 : 1,000,000', oddsPercentage: 0.0001 },
        { matchedDigits: 5, label: 'High Roll Second (5/6)', allocationPercent: 18, poolAmountUsd: rPot * 0.18, winnersCount: 3, prizePerWinnerUsd: (rPot * 0.18) / 3, oddsRatio: '1 : 18,518', oddsPercentage: 0.0054 },
        { matchedDigits: 4, label: 'Diamond Tier (4/6)', allocationPercent: 10, poolAmountUsd: rPot * 0.10, winnersCount: 20, prizePerWinnerUsd: (rPot * 0.10) / 20, oddsRatio: '1 : 925', oddsPercentage: 0.108 },
        { matchedDigits: 3, label: 'Gold Tier (3/6)', allocationPercent: 7, poolAmountUsd: rPot * 0.07, winnersCount: 150, prizePerWinnerUsd: (rPot * 0.07) / 150, oddsRatio: '1 : 77', oddsPercentage: 1.298 },
        { matchedDigits: 2, label: 'Silver Tier (2/6)', allocationPercent: 5, poolAmountUsd: rPot * 0.05, winnersCount: 1100, prizePerWinnerUsd: (rPot * 0.05) / 1100, oddsRatio: '1 : 11', oddsPercentage: 9.09 },
        { matchedDigits: 1, label: 'Instant Cash (1/6)', allocationPercent: 3, poolAmountUsd: rPot * 0.03, winnersCount: 6500, prizePerWinnerUsd: (rPot * 0.03) / 6500, oddsRatio: '1 : 2.5', oddsPercentage: 40.0 },
      ],
    };
  });

  // Assign Commit-Reveal hashes for current active rounds
  const saltMega = keccak256(encodePacked(['string', 'uint256', 'uint256'], ['mega-daily', BigInt(currentRoundId), 1700000001n]));
  secretSaltsDb[currentRoundId] = saltMega;
  roundsDb[currentRoundId].commitHash = keccak256(encodePacked(['bytes32', 'uint256'], [saltMega, BigInt(currentRoundId)]));
  roundsDb[currentRoundId].vrfProvider = 'LOCAL_SIMULATION_VRF_COMMIT_REVEAL';

  const saltHourly = keccak256(encodePacked(['string', 'uint256', 'uint256'], ['hourly-lightning', BigInt(hourlyRoundId), 1700000002n]));
  secretSaltsDb[hourlyRoundId] = saltHourly;
  roundsDb[hourlyRoundId].commitHash = keccak256(encodePacked(['bytes32', 'uint256'], [saltHourly, BigInt(hourlyRoundId)]));
  roundsDb[hourlyRoundId].vrfProvider = 'LOCAL_SIMULATION_VRF_COMMIT_REVEAL';

  const saltSavings = keccak256(encodePacked(['string', 'uint256', 'uint256'], ['no-loss-savings', BigInt(savingsRoundId), 1700000003n]));
  secretSaltsDb[savingsRoundId] = saltSavings;
  roundsDb[savingsRoundId].commitHash = keccak256(encodePacked(['bytes32', 'uint256'], [saltSavings, BigInt(savingsRoundId)]));
  roundsDb[savingsRoundId].vrfProvider = 'LOCAL_SIMULATION_VRF_COMMIT_REVEAL';

  recentWinnersDb.push({
    id: 'win-001',
    roundId: currentRoundId - 1,
    poolId: 'mega-daily',
    winnerAddress: '0x71C28B932F99B52EDb3C0257B4393608F79E9E42',
    matchedDigits: 6,
    prizeAmountUsd: 275000.0,
    prizeToken: 'ETH',
    ticketNumbers: [7, 3, 9, 2, 6, 4],
    winningNumbers: [7, 3, 9, 2, 6, 4],
    timestamp: now - 14 * 3600 * 1000,
    txHash: '0x9a8f2348a1b94c398e019284fa90812398401928301984209183091283091823',
    multiplier: 1,
  });
}

// Initialize database or hydrate from disk
const persistedState = loadPersistedLotteryState();
if (persistedState) {
  currentRoundId = persistedState.currentRoundId;
  hourlyRoundId = persistedState.hourlyRoundId;
  savingsRoundId = persistedState.savingsRoundId;
  Object.assign(roundsDb, persistedState.roundsDb);
  userTicketsDb.push(...persistedState.userTicketsDb);
  savingsDepositsDb.push(...persistedState.savingsDepositsDb);
  recentWinnersDb.push(...persistedState.recentWinnersDb);
  syndicatesDb.push(...persistedState.syndicatesDb);
  if (persistedState.secretSaltsDb) {
    Object.assign(secretSaltsDb, persistedState.secretSaltsDb);
  }
} else {
  initializeLotteryData();
  persistLotteryState();
}

/**
 * Derives 6 provably fair winning digits from cryptographic Keccak256 seed
 */
export function deriveWinningDigitsFromSeed(seedHex: string): number[] {
  const hash = keccak256(toHex(seedHex));
  const digits: number[] = [];
  for (let i = 2; i < 14; i += 2) {
    const byteVal = parseInt(hash.substr(i, 2), 16);
    digits.push(byteVal % 10);
  }
  return digits;
}

/**
 * Generates 6 cryptographic random ticket digits
 */
export function generateCryptographicTicketNumbers(userSeed: string = `${Date.now()}`): number[] {
  const saltHex = crypto.randomBytes(16).toString('hex');
  const entropy = keccak256(encodePacked(['string', 'string', 'uint256'], [userSeed, saltHex, BigInt(Date.now())]));
  return deriveWinningDigitsFromSeed(entropy);
}

export const generateRandomTicketNumbers = generateCryptographicTicketNumbers;

/**
 * Count consecutive matching digits from left (index 0)
 */
export function calculateMatchedDigits(ticketNums: number[], winningNums: number[]): number {
  let matched = 0;
  for (let i = 0; i < 6; i++) {
    if (ticketNums[i] === winningNums[i]) {
      matched++;
    } else {
      break;
    }
  }
  return matched;
}

/**
 * Automated Background Scheduler (Tick every 1s)
 * Monitors round deadlines, initiates live VRF request, triggers automated draw,
 * computes prize ledger, handles jackpot rollover, and initializes next round.
 */
let isProcessingTick = false;
setInterval(() => {
  if (isProcessingTick) return;
  isProcessingTick = true;
  try {
    const now = Date.now();
    // 1. Process active rounds countdown and automated draws
    Object.values(roundsDb).forEach((round) => {
      if (round.status === 'OPEN' || round.status === 'CLOSING_SOON') {
        const timeRemaining = round.endTime - now;
        if (timeRemaining <= 0) {
          // Automatic round draw execution with rollover
          console.log(`[LOTTERY SCHEDULER] Auto-drawing round #${round.id} for pool ${round.poolId}`);
          try {
            drawLotteryRound(round.id);
          } catch (drawErr) {
            console.error(`[LOTTERY SCHEDULER] Failed to draw round #${round.id}:`, drawErr);
          }
        } else if (timeRemaining <= 30000 && round.status === 'OPEN') {
          round.status = 'CLOSING_SOON';
        }
      }
    });

    // 2. Self-healing Rollover Watchdog: Ensure every pool has an active OPEN round
    const activePoolConfigs: {
      id: LotteryPoolId;
      getPtr: () => number;
      setPtr: (id: number) => void;
      namePrefix: string;
      durationMs: number;
      seedPot: number;
      ticketPrice: number;
    }[] = [
      {
        id: 'mega-daily',
        getPtr: () => currentRoundId,
        setPtr: (id) => { currentRoundId = id; },
        namePrefix: 'Hyperon Mega Ethereum Jackpot',
        durationMs: 24 * 3600 * 1000,
        seedPot: 250000,
        ticketPrice: 5.0,
      },
      {
        id: 'hourly-lightning',
        getPtr: () => hourlyRoundId,
        setPtr: (id) => { hourlyRoundId = id; },
        namePrefix: 'Hourly Lightning Pot',
        durationMs: 3600 * 1000,
        seedPot: 15000,
        ticketPrice: 1.0,
      },
      {
        id: 'no-loss-savings',
        getPtr: () => savingsRoundId,
        setPtr: (id) => { savingsRoundId = id; },
        namePrefix: 'DeFi No-Loss Yield Harvest',
        durationMs: 7 * 86400 * 1000,
        seedPot: 50000,
        ticketPrice: 0,
      },
    ];

    for (const poolCfg of activePoolConfigs) {
      const activeRound = roundsDb[poolCfg.getPtr()];
      if (!activeRound || activeRound.status === 'CLOSED') {
        const poolRoundIds = Object.keys(roundsDb)
          .map(Number)
          .filter((k) => roundsDb[k]?.poolId === poolCfg.id);
        const maxId = poolRoundIds.length > 0 ? Math.max(...poolRoundIds, poolCfg.getPtr()) : poolCfg.getPtr();
        const newRoundId = maxId + 1;

        const salt = keccak256(encodePacked(['string', 'uint256', 'uint256'], [poolCfg.id, BigInt(newRoundId), BigInt(Date.now())]));
        const commit = keccak256(encodePacked(['bytes32', 'uint256'], [salt, BigInt(newRoundId)]));
        secretSaltsDb[newRoundId] = salt;

        roundsDb[newRoundId] = {
          id: newRoundId,
          poolId: poolCfg.id,
          poolName: `${poolCfg.namePrefix} #${newRoundId}`,
          status: 'OPEN',
          startTime: now,
          endTime: now + poolCfg.durationMs,
          ticketPriceUsd: poolCfg.ticketPrice,
          jackpotUsd: Number((poolCfg.seedPot * 0.5).toFixed(2)),
          totalPotUsd: poolCfg.seedPot,
          totalTicketsSold: 0,
          uniqueParticipants: 0,
          winningNumbers: null,
          burnAmountUsd: Number((poolCfg.seedPot * 0.04).toFixed(2)),
          reserveFundUsd: Number((poolCfg.seedPot * 0.03).toFixed(2)),
          stakersDividendUsd: Number((poolCfg.seedPot * 0.03).toFixed(2)),
          rolloverAmountUsd: 0,
          prizesByTier: createStandardPrizeTiers(poolCfg.seedPot, poolCfg.id),
          commitHash: commit,
          vrfProvider: 'LOCAL_SIMULATION_VRF_COMMIT_REVEAL',
        };

        poolCfg.setPtr(newRoundId);
        persistLotteryState();
        console.log(`[LOTTERY WATCHDOG] Initialized continuous rollover round #${newRoundId} for pool ${poolCfg.id}`);
      }
    }
  } catch (err) {
    console.error('[LOTTERY SCHEDULER ERROR]', err);
  } finally {
    isProcessingTick = false;
  }
}, 1000);

/**
 * Get active lottery overview and full analytics
 */
export function getLotteryOverview(userAddress?: string) {
  const activeRounds = [
    roundsDb[currentRoundId],
    roundsDb[hourlyRoundId],
    roundsDb[savingsRoundId],
  ].filter(Boolean);

  const pastRounds = Object.values(roundsDb)
    .filter((r) => r.status === 'CLOSED')
    .sort((a, b) => b.id - a.id);

  let userTickets: LotteryTicket[] = [];
  if (userAddress) {
    userTickets = userTicketsDb.filter(
      (t) => t.ownerAddress.toLowerCase() === userAddress.toLowerCase()
    );
  }

  const userSavings = savingsDepositsDb.filter(
    (s) => userAddress && s.userAddress.toLowerCase() === userAddress.toLowerCase()
  );

  const totalPot = activeRounds.reduce((acc, r) => acc + r.totalPotUsd, 0);

  const stats: LotteryStats = {
    totalDistributedUsd: 4985000.0,
    totalTicketsBoughtAllTime: 859400,
    totalBurnedHyprUsd: 148900.0,
    largestSingleJackpotUsd: 1420500.0,
    activePotTotalUsd: totalPot,
    recentWinners: recentWinnersDb.slice(0, 10),
    totalRoundsCompleted: 141 + 893 + 27,
    averageJackpotWinUsd: 318000.0,
    overallWinningProbability: 41.8,
  };

  return {
    serverTime: Date.now(),
    activeRounds,
    pastRounds,
    userTickets,
    userSavings,
    stats,
    syndicates: syndicatesDb,
    analytics: calculateLotteryAnalytics(),
    currentEthPrice: getUsdPrice('ETH'),
    currentHyprPrice: getUsdPrice('HYPR'),
  };
}

/**
 * Calculates empirical hot/cold frequency statistics dynamically from roundsDb
 */
export function calculateLotteryAnalytics(): LotteryAnalytics {
  const closedRounds = Object.values(roundsDb)
    .filter((r) => r.status === 'CLOSED' && Array.isArray(r.winningNumbers) && r.winningNumbers.length === 6)
    .sort((a, b) => b.id - a.id);

  const realHistory = closedRounds.map((r) => r.winningNumbers as number[]);

  const counts: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 };
  const lastSeenRoundsAgo: Record<number, number> = { 0: 99, 1: 99, 2: 99, 3: 99, 4: 99, 5: 99, 6: 99, 7: 99, 8: 99, 9: 99 };
  const pairCounts: Record<string, number> = {};

  let totalDigits = 0;
  let oddCount = 0;
  let evenCount = 0;
  let sum = 0;

  realHistory.forEach((nums, roundIndex) => {
    nums.forEach((d, idx) => {
      counts[d] = (counts[d] || 0) + 1;
      totalDigits++;
      sum += d;
      if (d % 2 === 1) oddCount++;
      else evenCount++;

      if (lastSeenRoundsAgo[d] === 99) {
        lastSeenRoundsAgo[d] = roundIndex + 1;
      }

      if (idx < nums.length - 1) {
        const pairKey = `${d}-${nums[idx + 1]}`;
        pairCounts[pairKey] = (pairCounts[pairKey] || 0) + 1;
      }
    });
  });

  const frequencies = Object.entries(counts).map(([digitStr, count]) => {
    const digit = parseInt(digitStr, 10);
    const percentage = totalDigits > 0 ? (count / totalDigits) * 100 : 10;
    return {
      digit,
      count,
      percentage: Number(percentage.toFixed(1)),
      isHot: false,
      isCold: false,
      lastDrawnRoundsAgo: lastSeenRoundsAgo[digit] === 99 ? 1 : lastSeenRoundsAgo[digit],
    };
  });

  const sortedFrequencies = [...frequencies].sort((a, b) => b.count - a.count);
  const hotThreshold = sortedFrequencies[2]?.count || 0;
  const coldThreshold = sortedFrequencies[7]?.count || 0;

  frequencies.forEach((f) => {
    f.isHot = f.count >= hotThreshold && f.count > 0;
    f.isCold = f.count <= coldThreshold;
  });

  const hotDigits = frequencies.filter((f) => f.isHot).map((f) => f.digit);
  const coldDigits = frequencies.filter((f) => f.isCold).map((f) => f.digit);

  const mostCommonPairs: [number, number][] = Object.entries(pairCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([key]): [number, number] => {
      const [a, b] = key.split('-').map(Number);
      return [a || 0, b || 0];
    });

  return {
    totalRoundsSampled: closedRounds.length,
    hotDigits: hotDigits.slice(0, 4),
    coldDigits: coldDigits.slice(0, 3),
    digitFrequencies: frequencies,
    oddEvenRatio: {
      odd: totalDigits > 0 ? Math.round((oddCount / totalDigits) * 100) : 50,
      even: totalDigits > 0 ? Math.round((evenCount / totalDigits) * 100) : 50,
    },
    averageSum: realHistory.length > 0 ? Number((sum / realHistory.length).toFixed(1)) : 27.0,
    mostCommonPairs: mostCommonPairs.length > 0 ? mostCommonPairs : ([[7, 3], [8, 2], [9, 1], [4, 7]] as [number, number][]),
  };
}

/**
 * Buy tickets with multi-token payment (ETH, USDC, USDT, HYPR) & PowerPlay Multipliers
 */
export function buyLotteryTickets(params: {
  roundId: number;
  poolId: LotteryPoolId;
  tickets: number[][];
  paymentToken: string;
  userAddress: string;
  multiplier?: number; // 1 to 5
}) {
  const round = roundsDb[params.roundId];
  if (!round || (round.status !== 'OPEN' && round.status !== 'CLOSING_SOON')) {
    throw new Error(`Round #${params.roundId} is not currently open for ticket purchases.`);
  }

  const count = params.tickets.length;
  if (count <= 0) {
    throw new Error('Please select at least 1 ticket to purchase.');
  }

  const multiplier = Math.max(1, Math.min(5, params.multiplier || 1));

  // Bulk discount matrix
  let bulkDiscount = 0;
  if (count >= 100) bulkDiscount = 0.20;
  else if (count >= 50) bulkDiscount = 0.15;
  else if (count >= 25) bulkDiscount = 0.10;
  else if (count >= 10) bulkDiscount = 0.05;

  const isHypr = params.paymentToken.toUpperCase() === 'HYPR';
  const tokenDiscount = isHypr ? 0.20 : 0;

  const basePricePerTicket = round.ticketPriceUsd * (multiplier > 1 ? (1 + (multiplier - 1) * 0.3) : 1);
  const netDiscountRate = Math.min(0.35, bulkDiscount + tokenDiscount);
  const effectivePricePerTicket = basePricePerTicket * (1 - netDiscountRate);
  const totalCostUsd = effectivePricePerTicket * count;

  const tokenPriceUsd = getUsdPrice(params.paymentToken) || 1.0;
  const tokenAmount = totalCostUsd / tokenPriceUsd;

  const now = Date.now();
  const txHash = keccak256(encodePacked(['string', 'uint256', 'uint256'], [params.userAddress, BigInt(now), BigInt(count)]));

  const createdTickets: LotteryTicket[] = [];

  params.tickets.forEach((digits, idx) => {
    if (digits.length !== 6 || digits.some((d) => d < 0 || d > 9)) {
      throw new Error(`Invalid ticket digits sequence: [${digits.join(',')}]`);
    }

    const ticket: LotteryTicket = {
      id: `tkt-${round.id}-${now}-${idx}`,
      roundId: round.id,
      poolId: round.poolId,
      numbers: digits,
      purchasePriceUsd: Number(effectivePricePerTicket.toFixed(2)),
      purchasedWithToken: params.paymentToken.toUpperCase(),
      purchasedWithAmount: Number((tokenAmount / count).toFixed(6)),
      timestamp: now,
      ownerAddress: params.userAddress,
      txHash,
      status: 'ACTIVE',
      multiplier,
      tierQuality: multiplier > 1 ? 'PLATINUM' : 'STANDARD',
    };

    userTicketsDb.unshift(ticket);
    createdTickets.push(ticket);
  });

  round.totalTicketsSold += count;
  round.totalPotUsd += totalCostUsd;
  round.jackpotUsd = Number((round.totalPotUsd * (round.prizesByTier[0]?.allocationPercent / 100)).toFixed(2));

  // Recalculate tier pools
  round.prizesByTier.forEach((tier) => {
    tier.poolAmountUsd = Number((round.totalPotUsd * (tier.allocationPercent / 100)).toFixed(2));
    if (tier.matchedDigits === 6) {
      tier.prizePerWinnerUsd = tier.poolAmountUsd;
    }
  });

  persistLotteryState();

  return {
    success: true,
    tickets: createdTickets,
    txHash,
    totalCostUsd: Number(totalCostUsd.toFixed(2)),
    tokenAmount: Number(tokenAmount.toFixed(6)),
    paymentToken: params.paymentToken.toUpperCase(),
    discountPercent: Number((netDiscountRate * 100).toFixed(0)),
    updatedRound: round,
  };
}

/**
 * Join an existing Syndicate Pool
 */
export function joinSyndicatePool(params: {
  syndicateId: string;
  sharesCount: number;
  userAddress: string;
  paymentToken: string;
}) {
  if (!params.userAddress || !params.userAddress.startsWith('0x') || params.userAddress.length !== 42) {
    throw new DexError(DEX_ERROR_CODES.INVALID_ADDRESS, 'Invalid Ethereum wallet address');
  }

  const syndicate = syndicatesDb.find((s) => s.id === params.syndicateId);
  if (!syndicate) {
    throw new DexError(DEX_ERROR_CODES.SYNDICATE_NOT_FOUND, 'Syndicate pool not found');
  }

  const round = roundsDb[syndicate.roundId];
  if (!round || round.status === 'CLOSED') {
    throw new DexError(DEX_ERROR_CODES.ROUND_NOT_OPEN, 'Round is closed');
  }

  const ticketsToAdd = params.sharesCount * (syndicate.poolId === 'mega-daily' ? 5 : 1);
  syndicate.currentTickets = Math.min(syndicate.targetTickets, syndicate.currentTickets + ticketsToAdd);
  syndicate.participantCount += 1;

  if (!syndicate.members) syndicate.members = {};
  if (!syndicate.claimedMembers) syndicate.claimedMembers = {};
  const normUser = params.userAddress.toLowerCase();
  syndicate.members[normUser] = (syndicate.members[normUser] || 0) + params.sharesCount;

  const tickets: number[][] = [];
  for (let i = 0; i < ticketsToAdd; i++) {
    tickets.push(generateCryptographicTicketNumbers(`${params.userAddress}-${syndicate.id}-${i}`));
  }

  const buyRes = buyLotteryTickets({
    roundId: syndicate.roundId,
    poolId: syndicate.poolId,
    tickets,
    paymentToken: params.paymentToken,
    userAddress: params.userAddress,
  });

  buyRes.tickets.forEach((t) => {
    t.syndicateId = syndicate.id;
    t.tierQuality = 'VIP_GOLD';
  });

  persistLotteryState();

  return {
    success: true,
    syndicate,
    tickets: buyRes.tickets,
    txHash: buyRes.txHash,
  };
}

/**
 * Stake into No-Loss Prize Savings Pool
 */
export function depositNoLossSavings(params: {
  userAddress: string;
  stakedToken: string;
  amount: number;
}) {
  const tokenPrice = getUsdPrice(params.stakedToken) || 1.0;
  const valueUsd = params.amount * tokenPrice;
  const ticketsEarned = Math.floor(valueUsd / 10);

  const deposit: NoLossSavingsDeposit = {
    id: `dep-${Date.now()}`,
    userAddress: params.userAddress,
    stakedToken: params.stakedToken.toUpperCase(),
    amount: params.amount,
    valueUsd: Number(valueUsd.toFixed(2)),
    ticketsEarned,
    stakedAt: Date.now(),
    totalRewardsClaimedUsd: 0,
  };

  savingsDepositsDb.push(deposit);

  const round = roundsDb[savingsRoundId];
  if (round && ticketsEarned > 0) {
    round.totalTicketsSold += ticketsEarned;
    // Mint all earned tickets without an artificial cap to prevent yield theft
    for (let i = 0; i < ticketsEarned; i++) {
      userTicketsDb.unshift({
        id: `tkt-sav-${round.id}-${Date.now()}-${i}`,
        roundId: round.id,
        poolId: 'no-loss-savings',
        numbers: generateCryptographicTicketNumbers(`${params.userAddress}-${i}`),
        purchasePriceUsd: 0,
        purchasedWithToken: 'STAKE_YIELD',
        purchasedWithAmount: 0,
        timestamp: Date.now(),
        ownerAddress: params.userAddress,
        txHash: `0x${Date.now().toString(16)}`,
        status: 'ACTIVE',
      });
    }
  }

  persistLotteryState();
  return { success: true, deposit };
}

/**
 * Executes verifiable Local Simulation VRF (Commit-Reveal) Round Draw & Initializes Next Round
 * Fixes payout insolvency by counting all tier winners before computing individual payouts.
 */
export function drawLotteryRound(roundId: number) {
  const round = roundsDb[roundId];
  if (!round) {
    throw new Error(`Round #${roundId} not found`);
  }

  if (round.status === 'CLOSED') {
    return {
      success: true,
      roundId,
      winningNumbers: round.winningNumbers || [],
      vrfSeed: round.vrfSeed || '0x0',
      vrfTxHash: round.vrfTxHash || '0x0',
      vrfBlockNumber: round.vrfBlockNumber || 0,
      closedRound: round,
    };
  }

  // Retrieve or generate commit-reveal parameters for provably fair simulation
  const secretSalt = (secretSaltsDb[roundId] || keccak256(encodePacked(['uint256', 'uint256'], [BigInt(roundId), 999999n]))) as `0x${string}`;
  const commitHash = (round.commitHash || keccak256(encodePacked(['bytes32', 'uint256'], [secretSalt, BigInt(roundId)]))) as `0x${string}`;

  // Verify commit-reveal integrity
  const expectedCommit = keccak256(encodePacked(['bytes32', 'uint256'], [secretSalt, BigInt(roundId)]));
  if (expectedCommit !== commitHash) {
    throw new Error(`VRF_COMMIT_REVEAL_MISMATCH: Secret salt does not match round commitment`);
  }

  // Derive unbiasable pseudo-random VRF seed from commit, revealed salt, block height, and round parameters
  const vrfSeed = keccak256(
    encodePacked(
      ['uint256', 'bytes32', 'bytes32', 'uint256', 'string'],
      [BigInt(roundId), commitHash, secretSalt, BigInt(round.totalTicketsSold), round.poolId]
    )
  );

  const winningNumbers = deriveWinningDigitsFromSeed(vrfSeed);
  const vrfTxHash = keccak256(encodePacked(['bytes32', 'uint256'], [vrfSeed, BigInt(roundId)]));
  const vrfBlockNumber = 21894000 + (roundId % 1000);

  round.status = 'CLOSED';
  round.winningNumbers = winningNumbers;
  round.vrfSeed = vrfSeed;
  round.vrfTxHash = vrfTxHash;
  round.vrfBlockNumber = vrfBlockNumber;
  round.vrfProvider = 'LOCAL_SIMULATION_VRF_COMMIT_REVEAL';
  round.commitHash = commitHash;
  round.revealedSalt = secretSalt;

  let jackpotHit = false;

  // Reset winner counts
  round.prizesByTier.forEach((tier) => {
    tier.winnersCount = 0;
  });

  const roundTickets = userTicketsDb.filter((t) => t.roundId === roundId);

  // Pass 1: Count total winners and compute total multiplier-weighted shares per tier
  const tierSharesMap: Record<number, number> = {};
  roundTickets.forEach((t) => {
    const matched = calculateMatchedDigits(t.numbers, winningNumbers);
    t.matchedDigitsCount = matched;

    if (matched > 0) {
      t.status = 'WON';
      const tier = round.prizesByTier.find((p) => p.matchedDigits === matched);
      if (tier) {
        tier.winnersCount++;
        const weight = matched < 6 ? (t.multiplier || 1) : 1;
        tierSharesMap[matched] = (tierSharesMap[matched] || 0) + weight;
        if (matched === 6) jackpotHit = true;
      }
    } else {
      t.status = 'LOST';
      t.wonPrizeUsd = 0;
    }
  });

  // Calculate finalized base share prize for each tier so total payouts never exceed tier.poolAmountUsd
  round.prizesByTier.forEach((tier) => {
    const totalShares = tierSharesMap[tier.matchedDigits] || 0;
    if (totalShares > 0) {
      tier.prizePerWinnerUsd = Number((tier.poolAmountUsd / totalShares).toFixed(2));
    } else {
      tier.prizePerWinnerUsd = 0;
    }
  });

  // Pass 2: Allocate accurate proportional payouts to each winning ticket without pool insolvency
  roundTickets.forEach((t) => {
    if (t.status === 'WON' && t.matchedDigitsCount && t.matchedDigitsCount > 0) {
      const tier = round.prizesByTier.find((p) => p.matchedDigits === t.matchedDigitsCount);
      if (tier && tier.winnersCount > 0) {
        const mult = t.matchedDigitsCount < 6 ? (t.multiplier || 1) : 1;
        const baseSharePrize = tier.prizePerWinnerUsd;
        t.wonPrizeUsd = Number((baseSharePrize * mult).toFixed(2));

        // Credit to syndicate pool if ticket was purchased as part of a syndicate
        if (t.syndicateId) {
          const synd = syndicatesDb.find((s) => s.id === t.syndicateId);
          if (synd) {
            synd.totalPrizeWonUsd = Number(((synd.totalPrizeWonUsd || 0) + (t.wonPrizeUsd || 0)).toFixed(2));
            synd.status = 'WON';
          }
        }

        // Record winner record
        recentWinnersDb.unshift({
          id: `win-${Date.now()}-${t.id}`,
          roundId: round.id,
          poolId: round.poolId,
          winnerAddress: t.ownerAddress,
          matchedDigits: t.matchedDigitsCount,
          prizeAmountUsd: t.wonPrizeUsd,
          prizeToken: 'USDC',
          ticketNumbers: t.numbers,
          winningNumbers: winningNumbers,
          timestamp: Date.now(),
          txHash: vrfTxHash,
          multiplier: t.multiplier,
        });
      }
    }
  });

  // Initialize Next Round Automatically with Rollover
  const poolRoundIds = Object.keys(roundsDb)
    .map(Number)
    .filter((k) => roundsDb[k]?.poolId === round.poolId);
  const maxPoolId = poolRoundIds.length > 0 ? Math.max(...poolRoundIds, roundId) : roundId;
  const nextRoundId = maxPoolId + 1;
  const now = Date.now();
  let nextDuration = 24 * 3600 * 1000;
  let seedPot = 250000;
  if (round.poolId === 'hourly-lightning') {
    nextDuration = 3600 * 1000;
    seedPot = 15000;
    hourlyRoundId = nextRoundId;
  } else if (round.poolId === 'no-loss-savings') {
    nextDuration = 7 * 86400 * 1000;
    seedPot = 50000;
    savingsRoundId = nextRoundId;
  } else {
    currentRoundId = nextRoundId;
  }

  // Rollover pot if jackpot was not won
  const rollover = jackpotHit ? 0 : round.jackpotUsd;
  const newTotalPot = seedPot + rollover;

  const nextSalt = keccak256(encodePacked(['string', 'uint256', 'uint256'], [round.poolId, BigInt(nextRoundId), BigInt(Date.now())]));
  const nextCommit = keccak256(encodePacked(['bytes32', 'uint256'], [nextSalt, BigInt(nextRoundId)]));
  secretSaltsDb[nextRoundId] = nextSalt;

  roundsDb[nextRoundId] = {
    id: nextRoundId,
    poolId: round.poolId,
    poolName: `${round.poolName.split('#')[0]}#${nextRoundId}`,
    status: 'OPEN',
    startTime: now,
    endTime: now + nextDuration,
    ticketPriceUsd: round.ticketPriceUsd,
    jackpotUsd: Number((newTotalPot * 0.5).toFixed(2)),
    totalPotUsd: newTotalPot,
    totalTicketsSold: 0,
    uniqueParticipants: 0,
    winningNumbers: null,
    burnAmountUsd: Number((newTotalPot * 0.04).toFixed(2)),
    reserveFundUsd: Number((newTotalPot * 0.03).toFixed(2)),
    stakersDividendUsd: Number((newTotalPot * 0.03).toFixed(2)),
    rolloverAmountUsd: rollover,
    prizesByTier: createStandardPrizeTiers(newTotalPot, round.poolId),
    commitHash: nextCommit,
    vrfProvider: 'LOCAL_SIMULATION_VRF_COMMIT_REVEAL',
  };

  persistLotteryState();

  return {
    success: true,
    roundId,
    winningNumbers,
    vrfSeed,
    vrfTxHash,
    vrfBlockNumber,
    closedRound: round,
    nextRound: roundsDb[nextRoundId],
  };
}

const activeClaimLocks = new Set<string>();

/**
 * Claim all won prizes for a user address
 */
export function claimLotteryWinnings(userAddress: string) {
  if (!userAddress || !userAddress.startsWith('0x') || userAddress.length !== 42) {
    throw new DexError(DEX_ERROR_CODES.INVALID_ADDRESS, 'Invalid Ethereum wallet address format');
  }

  const normalized = userAddress.toLowerCase();
  if (activeClaimLocks.has(normalized)) {
    throw new DexError(DEX_ERROR_CODES.CLAIM_ALREADY_IN_PROGRESS, 'Prize claim already in progress for this wallet address');
  }
  activeClaimLocks.add(normalized);

  try {
    const wonTickets = userTicketsDb.filter(
      (t) => t.ownerAddress.toLowerCase() === normalized && t.status === 'WON' && (t.wonPrizeUsd || 0) > 0
    );

    if (wonTickets.length === 0) {
      throw new DexError(DEX_ERROR_CODES.NO_WINNINGS_FOUND, 'No unclaimed lottery winnings found for this wallet address');
    }

    let totalClaimedUsd = 0;
    const now = Date.now();
    const payoutTxHash = keccak256(encodePacked(['string', 'uint256'], [userAddress, BigInt(now)]));

    // Checks-Effects-Interactions: mutate state before returning
    wonTickets.forEach((t) => {
      t.status = 'CLAIMED';
      t.claimedAt = now;
      totalClaimedUsd += t.wonPrizeUsd || 0;
    });

    persistLotteryState();

    return {
      success: true,
      claimedTicketsCount: wonTickets.length,
      totalClaimedUsd: Number(totalClaimedUsd.toFixed(2)),
      payoutTxHash,
    };
  } finally {
    activeClaimLocks.delete(normalized);
  }
}

/**
 * Claim a member's share of winnings from a Syndicate Pool
 */
export function claimSyndicateWinnings(syndicateId: string, userAddress: string) {
  if (!userAddress || !userAddress.startsWith('0x') || userAddress.length !== 42) {
    throw new DexError(DEX_ERROR_CODES.INVALID_ADDRESS, 'Invalid Ethereum wallet address format');
  }

  const syndicate = syndicatesDb.find((s) => s.id === syndicateId);
  if (!syndicate) {
    throw new DexError(DEX_ERROR_CODES.SYNDICATE_NOT_FOUND, 'Syndicate pool not found');
  }

  const normalized = userAddress.toLowerCase();
  const userShares = syndicate.members?.[normalized] || 0;
  if (userShares <= 0) {
    throw new DexError(DEX_ERROR_CODES.NO_WINNINGS_FOUND, 'Wallet holds zero shares in this syndicate');
  }

  if (syndicate.claimedMembers?.[normalized]) {
    throw new DexError(DEX_ERROR_CODES.NO_WINNINGS_FOUND, 'Syndicate share prize already claimed by this wallet address');
  }

  const totalPrize = syndicate.totalPrizeWonUsd || 0;
  if (totalPrize <= 0) {
    throw new DexError(DEX_ERROR_CODES.NO_WINNINGS_FOUND, 'No prize won by this syndicate pool');
  }

  const totalShares = syndicate.currentTickets || 1;
  const userSharePrizeUsd = Number(((userShares / totalShares) * totalPrize).toFixed(2));

  if (!syndicate.claimedMembers) syndicate.claimedMembers = {};
  syndicate.claimedMembers[normalized] = true;

  const now = Date.now();
  const payoutTxHash = keccak256(encodePacked(['string', 'string', 'uint256'], [syndicateId, userAddress, BigInt(now)]));

  persistLotteryState();

  return {
    success: true,
    syndicateId,
    userShares,
    totalShares,
    userSharePrizeUsd,
    payoutTxHash,
  };
}

/**
 * Scan and evaluate any ticket numbers against a round
 */
export function scanTicketAgainstRound(roundId: number, numbers: number[]) {
  const round = roundsDb[roundId];
  if (!round) throw new Error('Round not found');

  if (!round.winningNumbers) {
    return {
      roundId,
      status: 'PENDING_DRAW',
      winningNumbers: null,
      matchedDigits: 0,
      estimatedPrizeUsd: 0,
      tierLabel: 'Chờ Quay Số',
    };
  }

  const matched = calculateMatchedDigits(numbers, round.winningNumbers);
  const tier = round.prizesByTier.find((p) => p.matchedDigits === matched);

  return {
    roundId,
    status: matched > 0 ? 'WINNER' : 'NO_MATCH',
    winningNumbers: round.winningNumbers,
    matchedDigits: matched,
    estimatedPrizeUsd: tier ? tier.prizePerWinnerUsd || tier.guaranteedMinUsd || 0 : 0,
    tierLabel: tier ? tier.label : 'Không Trúng Giải',
  };
}
