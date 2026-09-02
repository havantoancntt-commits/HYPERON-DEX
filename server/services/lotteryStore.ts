import fs from 'fs';
import path from 'path';
import {
  LotteryRound,
  LotteryTicket,
  NoLossSavingsDeposit,
  LotteryWinnerRecord,
  LotterySyndicatePool,
} from '../../src/types';

export interface LotteryPersistedState {
  currentRoundId: number;
  hourlyRoundId: number;
  savingsRoundId: number;
  roundsDb: Record<number, LotteryRound>;
  userTicketsDb: LotteryTicket[];
  savingsDepositsDb: NoLossSavingsDeposit[];
  recentWinnersDb: LotteryWinnerRecord[];
  syndicatesDb: LotterySyndicatePool[];
  secretSaltsDb: Record<number, string>;
}

const DATA_DIR = path.join(process.cwd(), '.data');
const STORE_FILE = path.join(DATA_DIR, 'lottery_store.json');

/**
 * Loads persistent lottery data from disk.
 */
export function loadPersistedLotteryState(): LotteryPersistedState | null {
  try {
    if (!fs.existsSync(STORE_FILE)) {
      return null;
    }
    const raw = fs.readFileSync(STORE_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as LotteryPersistedState;
    if (parsed && typeof parsed.currentRoundId === 'number' && parsed.roundsDb) {
      return parsed;
    }
    return null;
  } catch (err) {
    console.warn('[LotteryStore] Failed to load persisted state from disk:', err);
    return null;
  }
}

/**
 * Atomically saves lottery state to disk.
 */
export function savePersistedLotteryState(state: LotteryPersistedState): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const tempFile = `${STORE_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(state, null, 2), 'utf-8');
    fs.renameSync(tempFile, STORE_FILE);
  } catch (err) {
    console.warn('[LotteryStore] Failed to save persisted state to disk:', err);
  }
}
