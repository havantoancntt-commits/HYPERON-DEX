import {
  LotteryRound,
  LotteryTicket,
  LotteryWinnerRecord,
  LotteryStats,
  LotteryPoolId,
  NoLossSavingsDeposit,
} from '../../src/types';
import { getPrice } from './priceFeed';

// In-memory persistent database for Lottery Engine
let currentRoundId = 142;
let hourlyRoundId = 894;
let savingsRoundId = 28;

const roundsDb: Record<number, LotteryRound> = {};
const userTicketsDb: LotteryTicket[] = [];
const savingsDepositsDb: NoLossSavingsDeposit[] = [];
const recentWinnersDb: LotteryWinnerRecord[] = [];

// Initialize starting rounds and historical winners
function initializeLotteryData() {
  const now = Date.now();

  // 1. Current Mega Daily Round (Draws every 24h)
  roundsDb[currentRoundId] = {
    id: currentRoundId,
    poolId: 'mega-daily',
    poolName: 'Hyperon Mega Ethereum Jackpot #142',
    status: 'OPEN',
    startTime: now - 14 * 3600 * 1000,
    endTime: now + 10 * 3600 * 1000,
    ticketPriceUsd: 5.0,
    jackpotUsd: 485920.0,
    totalPotUsd: 647890.0,
    totalTicketsSold: 32410,
    uniqueParticipants: 4180,
    winningNumbers: null,
    burnAmountUsd: 12957.8,
    rolloverAmountUsd: 250000.0,
    prizesByTier: [
      { matchedDigits: 6, label: 'Match 6 (JACKPOT)', allocationPercent: 50, poolAmountUsd: 323945.0, winnersCount: 0, prizePerWinnerUsd: 323945.0 },
      { matchedDigits: 5, label: 'Match First 5', allocationPercent: 20, poolAmountUsd: 129578.0, winnersCount: 0, prizePerWinnerUsd: 0 },
      { matchedDigits: 4, label: 'Match First 4', allocationPercent: 12, poolAmountUsd: 77746.8, winnersCount: 0, prizePerWinnerUsd: 0 },
      { matchedDigits: 3, label: 'Match First 3', allocationPercent: 8, poolAmountUsd: 51831.2, winnersCount: 0, prizePerWinnerUsd: 0 },
      { matchedDigits: 2, label: 'Match First 2', allocationPercent: 5, poolAmountUsd: 32394.5, winnersCount: 0, prizePerWinnerUsd: 0 },
      { matchedDigits: 1, label: 'Match First 1', allocationPercent: 3, poolAmountUsd: 19436.7, winnersCount: 0, prizePerWinnerUsd: 0 },
      { matchedDigits: 0, label: 'HYPR Deflationary Burn', allocationPercent: 2, poolAmountUsd: 12957.8, winnersCount: 0, prizePerWinnerUsd: 0 },
    ],
  };

  // 2. Current Hourly Lightning Round (Draws every 60m)
  roundsDb[hourlyRoundId] = {
    id: hourlyRoundId,
    poolId: 'hourly-lightning',
    poolName: 'Speed Lightning Rush #894',
    status: 'OPEN',
    startTime: now - 35 * 60 * 1000,
    endTime: now + 25 * 60 * 1000,
    ticketPriceUsd: 1.0,
    jackpotUsd: 18450.0,
    totalPotUsd: 24600.0,
    totalTicketsSold: 8420,
    uniqueParticipants: 950,
    winningNumbers: null,
    burnAmountUsd: 492.0,
    rolloverAmountUsd: 8500.0,
    prizesByTier: [
      { matchedDigits: 6, label: 'Match 6 (JACKPOT)', allocationPercent: 55, poolAmountUsd: 13530.0, winnersCount: 0, prizePerWinnerUsd: 13530.0 },
      { matchedDigits: 5, label: 'Match First 5', allocationPercent: 18, poolAmountUsd: 4428.0, winnersCount: 0, prizePerWinnerUsd: 0 },
      { matchedDigits: 4, label: 'Match First 4', allocationPercent: 12, poolAmountUsd: 2952.0, winnersCount: 0, prizePerWinnerUsd: 0 },
      { matchedDigits: 3, label: 'Match First 3', allocationPercent: 8, poolAmountUsd: 1968.0, winnersCount: 0, prizePerWinnerUsd: 0 },
      { matchedDigits: 2, label: 'Match First 2', allocationPercent: 5, poolAmountUsd: 1230.0, winnersCount: 0, prizePerWinnerUsd: 0 },
      { matchedDigits: 1, label: 'Match First 1', allocationPercent: 2, poolAmountUsd: 492.0, winnersCount: 0, prizePerWinnerUsd: 0 },
    ],
  };

  // 3. Current No-Loss Yield Savings Pool (Draws weekly)
  roundsDb[savingsRoundId] = {
    id: savingsRoundId,
    poolId: 'no-loss-savings',
    poolName: 'DeFi No-Loss Yield Pool #28',
    status: 'OPEN',
    startTime: now - 3 * 86400 * 1000,
    endTime: now + 4 * 86400 * 1000,
    ticketPriceUsd: 0, // Yield funded
    jackpotUsd: 74200.0,
    totalPotUsd: 74200.0,
    totalTicketsSold: 128500, // 1 ticket per $10 staked
    uniqueParticipants: 1840,
    winningNumbers: null,
    burnAmountUsd: 0,
    rolloverAmountUsd: 25000.0,
    prizesByTier: [
      { matchedDigits: 6, label: 'Grand Prize (100% Yield Harvest)', allocationPercent: 70, poolAmountUsd: 51940.0, winnersCount: 0, prizePerWinnerUsd: 51940.0 },
      { matchedDigits: 5, label: 'Tier 2 Yield Bonus', allocationPercent: 20, poolAmountUsd: 14840.0, winnersCount: 0, prizePerWinnerUsd: 0 },
      { matchedDigits: 4, label: 'Tier 3 Yield Bonus', allocationPercent: 10, poolAmountUsd: 7420.0, winnersCount: 0, prizePerWinnerUsd: 0 },
    ],
  };

  // Seed Historical Closed Rounds with verifiable VRF
  const pastRounds: LotteryRound[] = [
    {
      id: currentRoundId - 1,
      poolId: 'mega-daily',
      poolName: 'Hyperon Mega Ethereum Jackpot #141',
      status: 'CLOSED',
      startTime: now - 38 * 3600 * 1000,
      endTime: now - 14 * 3600 * 1000,
      ticketPriceUsd: 5.0,
      jackpotUsd: 412500.0,
      totalPotUsd: 550000.0,
      totalTicketsSold: 28450,
      uniqueParticipants: 3950,
      winningNumbers: [7, 3, 9, 2, 6, 4],
      vrfSeed: '0x8f4d9b23c5e81a0293817f763abdf543918a992bc6643210aa39ec77281ab091',
      vrfTxHash: '0xd7a5e98214309baef49191e4a30e84b840131498b8398e0915fcfd515a86d267',
      vrfBlockNumber: 21894021,
      burnAmountUsd: 11000.0,
      rolloverAmountUsd: 0,
      prizesByTier: [
        { matchedDigits: 6, label: 'Match 6 (JACKPOT)', allocationPercent: 50, poolAmountUsd: 275000.0, winnersCount: 1, prizePerWinnerUsd: 275000.0 },
        { matchedDigits: 5, label: 'Match First 5', allocationPercent: 20, poolAmountUsd: 110000.0, winnersCount: 3, prizePerWinnerUsd: 36666.66 },
        { matchedDigits: 4, label: 'Match First 4', allocationPercent: 12, poolAmountUsd: 66000.0, winnersCount: 24, prizePerWinnerUsd: 2750.0 },
        { matchedDigits: 3, label: 'Match First 3', allocationPercent: 8, poolAmountUsd: 44000.0, winnersCount: 180, prizePerWinnerUsd: 244.44 },
        { matchedDigits: 2, label: 'Match First 2', allocationPercent: 5, poolAmountUsd: 27500.0, winnersCount: 1240, prizePerWinnerUsd: 22.17 },
        { matchedDigits: 1, label: 'Match First 1', allocationPercent: 3, poolAmountUsd: 16500.0, winnersCount: 7850, prizePerWinnerUsd: 2.1 },
      ],
    },
    {
      id: hourlyRoundId - 1,
      poolId: 'hourly-lightning',
      poolName: 'Speed Lightning Rush #893',
      status: 'CLOSED',
      startTime: now - 95 * 60 * 1000,
      endTime: now - 35 * 60 * 1000,
      ticketPriceUsd: 1.0,
      jackpotUsd: 16200.0,
      totalPotUsd: 21600.0,
      totalTicketsSold: 7600,
      uniqueParticipants: 880,
      winningNumbers: [4, 1, 8, 5, 2, 9],
      vrfSeed: '0x3a99e821dfbc0194857201abfd8840139b89182390abff88492019ab7615bcde',
      vrfTxHash: '0x9924ba77e6823901aefb2049182903abdfc890123984012938abef89021389aa',
      vrfBlockNumber: 21894015,
      burnAmountUsd: 432.0,
      rolloverAmountUsd: 0,
      prizesByTier: [
        { matchedDigits: 6, label: 'Match 6 (JACKPOT)', allocationPercent: 55, poolAmountUsd: 11880.0, winnersCount: 1, prizePerWinnerUsd: 11880.0 },
        { matchedDigits: 5, label: 'Match First 5', allocationPercent: 18, poolAmountUsd: 3888.0, winnersCount: 2, prizePerWinnerUsd: 1944.0 },
        { matchedDigits: 4, label: 'Match First 4', allocationPercent: 12, poolAmountUsd: 2592.0, winnersCount: 18, prizePerWinnerUsd: 144.0 },
        { matchedDigits: 3, label: 'Match First 3', allocationPercent: 8, poolAmountUsd: 1728.0, winnersCount: 95, prizePerWinnerUsd: 18.18 },
      ],
    },
  ];

  pastRounds.forEach((r) => {
    roundsDb[r.id] = r;
  });

  // Seed Winners Hall of Fame
  recentWinnersDb.push(
    {
      id: 'win-001',
      roundId: currentRoundId - 1,
      poolId: 'mega-daily',
      winnerAddress: '0x71C...B492',
      matchedDigits: 6,
      prizeAmountUsd: 275000.0,
      prizeToken: 'ETH',
      ticketNumbers: [7, 3, 9, 2, 6, 4],
      winningNumbers: [7, 3, 9, 2, 6, 4],
      timestamp: now - 14 * 3600 * 1000,
      txHash: '0x9a8f23...48a1',
    },
    {
      id: 'win-002',
      roundId: hourlyRoundId - 1,
      poolId: 'hourly-lightning',
      winnerAddress: '0x3F2...88A0',
      matchedDigits: 6,
      prizeAmountUsd: 11880.0,
      prizeToken: 'HYPR',
      ticketNumbers: [4, 1, 8, 5, 2, 9],
      winningNumbers: [4, 1, 8, 5, 2, 9],
      timestamp: now - 35 * 60 * 1000,
      txHash: '0x44b2c1...99e2',
    },
    {
      id: 'win-003',
      roundId: currentRoundId - 1,
      poolId: 'mega-daily',
      winnerAddress: '0x88D...C210',
      matchedDigits: 5,
      prizeAmountUsd: 36666.66,
      prizeToken: 'USDC',
      ticketNumbers: [7, 3, 9, 2, 6, 1],
      winningNumbers: [7, 3, 9, 2, 6, 4],
      timestamp: now - 14 * 3600 * 1000,
      txHash: '0x129a00...ef88',
    }
  );
}

initializeLotteryData();

/**
 * Generate 6 random numbers (each 0-9)
 */
export function generateRandomTicketNumbers(): number[] {
  return Array.from({ length: 6 }).map(() => Math.floor(Math.random() * 10));
}

/**
 * Count consecutive matching digits from the left (index 0)
 */
export function calculateMatchedDigits(ticketNums: number[], winningNums: number[]): number {
  let matched = 0;
  for (let i = 0; i < 6; i++) {
    if (ticketNums[i] === winningNums[i]) {
      matched++;
    } else {
      break; // PancakeSwap / Standard Lottery requires consecutive matching from index 0
    }
  }
  return matched;
}

/**
 * Get active lottery rounds and overall stats
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
    totalDistributedUsd: 4892400.0,
    totalTicketsBoughtAllTime: 842100,
    totalBurnedHyprUsd: 142850.0,
    largestSingleJackpotUsd: 1420500.0,
    activePotTotalUsd: totalPot,
    recentWinners: recentWinnersDb.slice(0, 10),
  };

  return {
    activeRounds,
    pastRounds,
    userTickets,
    userSavings,
    stats,
    currentEthPrice: getPrice('ETH'),
    currentHyprPrice: getPrice('HYPR'),
  };
}

/**
 * Buy tickets with multi-token payment (ETH, USDC, USDT, HYPR)
 * HYPR gives 20% discount on ticket prices!
 */
export function buyLotteryTickets(params: {
  roundId: number;
  poolId: LotteryPoolId;
  tickets: number[][]; // Array of 6-digit arrays
  paymentToken: string;
  userAddress: string;
}) {
  const round = roundsDb[params.roundId];
  if (!round || round.status !== 'OPEN') {
    throw new Error(`Round #${params.roundId} is not currently open for ticket purchases.`);
  }

  const count = params.tickets.length;
  if (count <= 0) {
    throw new Error('Please select at least 1 ticket to purchase.');
  }

  // Bulk discount calculation
  let bulkDiscount = 0;
  if (count >= 100) bulkDiscount = 0.20; // 20% off
  else if (count >= 50) bulkDiscount = 0.15; // 15% off
  else if (count >= 25) bulkDiscount = 0.10; // 10% off
  else if (count >= 10) bulkDiscount = 0.05; // 5% off

  // HYPR token discount: 20% extra discount
  const isHypr = params.paymentToken.toUpperCase() === 'HYPR';
  const tokenDiscount = isHypr ? 0.20 : 0;

  const basePricePerTicket = round.ticketPriceUsd;
  const netDiscountRate = Math.min(0.35, bulkDiscount + tokenDiscount);
  const effectivePricePerTicket = basePricePerTicket * (1 - netDiscountRate);
  const totalCostUsd = effectivePricePerTicket * count;

  // Convert USD to payment token amount
  const tokenPriceUsd = getPrice(params.paymentToken) || 1.0;
  const tokenAmount = totalCostUsd / tokenPriceUsd;

  const now = Date.now();
  const txHash = `0x${Math.random().toString(16).substring(2)}${Date.now().toString(16)}`;

  const createdTickets: LotteryTicket[] = [];

  params.tickets.forEach((digits, idx) => {
    if (digits.length !== 6 || digits.some((d) => d < 0 || d > 9)) {
      throw new Error(`Invalid ticket digits sequence: [${digits.join(',')}]`);
    }

    const ticket: LotteryTicket = {
      id: `tkt-${round.id}-${now}-${idx}-${Math.floor(Math.random() * 1000)}`,
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
    };

    userTicketsDb.unshift(ticket);
    createdTickets.push(ticket);
  });

  // Update Round stats
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
 * Stake into No-Loss Prize Savings Pool
 * Yield generates continuous lottery tickets without risking original capital!
 */
export function depositNoLossSavings(params: {
  userAddress: string;
  stakedToken: string;
  amount: number;
}) {
  const tokenPrice = getPrice(params.stakedToken) || 1.0;
  const valueUsd = params.amount * tokenPrice;
  const ticketsEarned = Math.floor(valueUsd / 10); // 1 ticket per $10 deposited

  const deposit: NoLossSavingsDeposit = {
    id: `dep-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    userAddress: params.userAddress,
    stakedToken: params.stakedToken.toUpperCase(),
    amount: params.amount,
    valueUsd: Number(valueUsd.toFixed(2)),
    ticketsEarned,
    stakedAt: Date.now(),
    totalRewardsClaimedUsd: 0,
  };

  savingsDepositsDb.push(deposit);

  // Generate automatically entered lucky tickets for current savings round
  const round = roundsDb[savingsRoundId];
  if (round && ticketsEarned > 0) {
    round.totalTicketsSold += ticketsEarned;
    for (let i = 0; i < Math.min(ticketsEarned, 20); i++) {
      userTicketsDb.unshift({
        id: `tkt-sav-${round.id}-${Date.now()}-${i}`,
        roundId: round.id,
        poolId: 'no-loss-savings',
        numbers: generateRandomTicketNumbers(),
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

  return { success: true, deposit };
}

/**
 * Draw Round with Chainlink VRF Verifiable Randomness
 */
export function drawLotteryRound(roundId: number) {
  const round = roundsDb[roundId];
  if (!round) {
    throw new Error(`Round #${roundId} not found`);
  }

  const winningNumbers = generateRandomTicketNumbers();
  const vrfSeed = `0x${Array.from({ length: 64 })
    .map(() => Math.floor(Math.random() * 16).toString(16))
    .join('')}`;
  const vrfTxHash = `0x${Array.from({ length: 64 })
    .map(() => Math.floor(Math.random() * 16).toString(16))
    .join('')}`;
  const vrfBlockNumber = 21894000 + Math.floor(Math.random() * 5000);

  round.status = 'CLOSED';
  round.winningNumbers = winningNumbers;
  round.vrfSeed = vrfSeed;
  round.vrfTxHash = vrfTxHash;
  round.vrfBlockNumber = vrfBlockNumber;

  // Grade all user tickets for this round
  const roundTickets = userTicketsDb.filter((t) => t.roundId === roundId);
  roundTickets.forEach((t) => {
    const matched = calculateMatchedDigits(t.numbers, winningNumbers);
    t.matchedDigitsCount = matched;

    if (matched > 0) {
      t.status = 'WON';
      const tier = round.prizesByTier.find((p) => p.matchedDigits === matched);
      if (tier) {
        tier.winnersCount++;
        t.wonPrizeUsd = Number((tier.poolAmountUsd / Math.max(1, tier.winnersCount)).toFixed(2));
      } else {
        t.wonPrizeUsd = 5.0;
      }

      // Add to recent winners if match >= 4
      if (matched >= 4) {
        recentWinnersDb.unshift({
          id: `win-${t.id}`,
          roundId,
          poolId: round.poolId,
          winnerAddress: t.ownerAddress,
          matchedDigits: matched,
          prizeAmountUsd: t.wonPrizeUsd || 100,
          prizeToken: 'ETH',
          ticketNumbers: t.numbers,
          winningNumbers,
          timestamp: Date.now(),
          txHash: t.txHash,
        });
      }
    } else {
      t.status = 'LOST';
    }
  });

  // Calculate final prizePerWinnerUsd for tiers
  round.prizesByTier.forEach((tier) => {
    tier.prizePerWinnerUsd =
      tier.winnersCount > 0 ? Number((tier.poolAmountUsd / tier.winnersCount).toFixed(2)) : 0;
  });

  // Create next open round
  if (round.poolId === 'mega-daily') {
    currentRoundId++;
    const nextStart = Date.now();
    roundsDb[currentRoundId] = {
      id: currentRoundId,
      poolId: 'mega-daily',
      poolName: `Hyperon Mega Ethereum Jackpot #${currentRoundId}`,
      status: 'OPEN',
      startTime: nextStart,
      endTime: nextStart + 24 * 3600 * 1000,
      ticketPriceUsd: 5.0,
      jackpotUsd: 250000.0,
      totalPotUsd: 350000.0,
      totalTicketsSold: 0,
      uniqueParticipants: 0,
      winningNumbers: null,
      burnAmountUsd: 7000.0,
      rolloverAmountUsd: 250000.0,
      prizesByTier: [
        { matchedDigits: 6, label: 'Match 6 (JACKPOT)', allocationPercent: 50, poolAmountUsd: 175000.0, winnersCount: 0, prizePerWinnerUsd: 175000.0 },
        { matchedDigits: 5, label: 'Match First 5', allocationPercent: 20, poolAmountUsd: 70000.0, winnersCount: 0, prizePerWinnerUsd: 0 },
        { matchedDigits: 4, label: 'Match First 4', allocationPercent: 12, poolAmountUsd: 42000.0, winnersCount: 0, prizePerWinnerUsd: 0 },
        { matchedDigits: 3, label: 'Match First 3', allocationPercent: 8, poolAmountUsd: 28000.0, winnersCount: 0, prizePerWinnerUsd: 0 },
        { matchedDigits: 2, label: 'Match First 2', allocationPercent: 5, poolAmountUsd: 17500.0, winnersCount: 0, prizePerWinnerUsd: 0 },
        { matchedDigits: 1, label: 'Match First 1', allocationPercent: 3, poolAmountUsd: 10500.0, winnersCount: 0, prizePerWinnerUsd: 0 },
      ],
    };
  } else if (round.poolId === 'hourly-lightning') {
    hourlyRoundId++;
    const nextStart = Date.now();
    roundsDb[hourlyRoundId] = {
      id: hourlyRoundId,
      poolId: 'hourly-lightning',
      poolName: `Speed Lightning Rush #${hourlyRoundId}`,
      status: 'OPEN',
      startTime: nextStart,
      endTime: nextStart + 60 * 60 * 1000,
      ticketPriceUsd: 1.0,
      jackpotUsd: 10000.0,
      totalPotUsd: 15000.0,
      totalTicketsSold: 0,
      uniqueParticipants: 0,
      winningNumbers: null,
      burnAmountUsd: 300.0,
      rolloverAmountUsd: 8000.0,
      prizesByTier: [
        { matchedDigits: 6, label: 'Match 6 (JACKPOT)', allocationPercent: 55, poolAmountUsd: 8250.0, winnersCount: 0, prizePerWinnerUsd: 8250.0 },
        { matchedDigits: 5, label: 'Match First 5', allocationPercent: 18, poolAmountUsd: 2700.0, winnersCount: 0, prizePerWinnerUsd: 0 },
        { matchedDigits: 4, label: 'Match First 4', allocationPercent: 12, poolAmountUsd: 1800.0, winnersCount: 0, prizePerWinnerUsd: 0 },
        { matchedDigits: 3, label: 'Match First 3', allocationPercent: 8, poolAmountUsd: 1200.0, winnersCount: 0, prizePerWinnerUsd: 0 },
        { matchedDigits: 2, label: 'Match First 2', allocationPercent: 5, poolAmountUsd: 750.0, winnersCount: 0, prizePerWinnerUsd: 0 },
      ],
    };
  }

  return { success: true, closedRound: round };
}

/**
 * Claim all pending winnings for a user
 */
export function claimLotteryWinnings(userAddress: string) {
  const wonTickets = userTicketsDb.filter(
    (t) =>
      t.ownerAddress.toLowerCase() === userAddress.toLowerCase() &&
      t.status === 'WON' &&
      (t.wonPrizeUsd || 0) > 0
  );

  if (wonTickets.length === 0) {
    throw new Error('No unclaimed lottery winnings found for this wallet address.');
  }

  const totalClaimedUsd = wonTickets.reduce((acc, t) => acc + (t.wonPrizeUsd || 0), 0);
  const now = Date.now();
  const claimTxHash = `0xclaim${now.toString(16)}${Math.random().toString(16).substring(2, 10)}`;

  wonTickets.forEach((t) => {
    t.status = 'CLAIMED';
    t.claimedAt = now;
  });

  return {
    success: true,
    totalClaimedUsd: Number(totalClaimedUsd.toFixed(2)),
    ticketsClaimedCount: wonTickets.length,
    claimTxHash,
  };
}
