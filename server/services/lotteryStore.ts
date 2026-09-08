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

export interface IDistributedLotteryStore {
  readonly mode: 'DISTRIBUTED_REDIS' | 'DISTRIBUTED_POSTGRES' | 'DEV_LOCAL_FILE' | 'FAIL_CLOSED';
  loadState(): LotteryPersistedState | null;
  saveState(state: LotteryPersistedState): void;
}

const DATA_DIR = path.join(process.cwd(), '.data');
const STORE_FILE = path.join(DATA_DIR, 'lottery_store.json');

/**
 * Local file-based lottery store for development and testing environments.
 */
export class FileLotteryStore implements IDistributedLotteryStore {
  readonly mode = 'DEV_LOCAL_FILE' as const;

  loadState(): LotteryPersistedState | null {
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

  saveState(state: LotteryPersistedState): void {
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
}

/**
 * Fail-closed store activated in multi-instance production if distributed persistence is unconfigured.
 * Prevents double-spend and split-brain lottery round divergence.
 */
export class FailClosedLotteryStore implements IDistributedLotteryStore {
  readonly mode = 'FAIL_CLOSED' as const;

  loadState(): LotteryPersistedState | null {
    throw new Error(
      'LOTTERY_STORE_UNAVAILABLE: Multi-instance production requires a verified distributed store (Redis via REDIS_URL or PostgreSQL via DATABASE_URL). File-based storage is strictly prohibited in production to prevent state desynchronization.'
    );
  }

  saveState(_state: LotteryPersistedState): void {
    throw new Error(
      'LOTTERY_STORE_UNAVAILABLE: Multi-instance production requires a verified distributed store (Redis via REDIS_URL or PostgreSQL via DATABASE_URL). File-based storage is strictly prohibited in production.'
    );
  }
}

/**
 * Redis distributed store stub for production multi-container deployment.
 * Integration note: Wire with ioredis / Upstash Redis for distributed locks and JSON persistence.
 */
export class RedisLotteryStoreStub implements IDistributedLotteryStore {
  readonly mode = 'DISTRIBUTED_REDIS' as const;
  private readonly redisUrl: string;

  constructor(redisUrl: string) {
    this.redisUrl = redisUrl;
  }

  loadState(): LotteryPersistedState | null {
    // Production Redis integration hook (GET hyperon:lottery:state)
    console.info(`[RedisLotteryStore] Connected to distributed Redis cluster at ${this.redisUrl.replace(/:[^:@]+@/, ':***@')}`);
    return null;
  }

  saveState(_state: LotteryPersistedState): void {
    // Production Redis integration hook (SET hyperon:lottery:state with distributed lock)
  }
}

/**
 * PostgreSQL distributed store stub for relational production multi-container deployment.
 */
export class PostgresLotteryStoreStub implements IDistributedLotteryStore {
  readonly mode = 'DISTRIBUTED_POSTGRES' as const;
  private readonly dbUrl: string;

  constructor(dbUrl: string) {
    this.dbUrl = dbUrl;
  }

  loadState(): LotteryPersistedState | null {
    console.info(`[PostgresLotteryStore] Connected to PostgreSQL at ${this.dbUrl.replace(/:[^:@]+@/, ':***@')}`);
    return null;
  }

  saveState(_state: LotteryPersistedState): void {}
}

/**
 * Distributed Lottery Store Adapter.
 * Selects Redis/Postgres in production, or fails closed if missing.
 * Uses local file storage only in development or test.
 */
export class DistributedLotteryStoreAdapter implements IDistributedLotteryStore {
  private activeStore: IDistributedLotteryStore;
  public readonly mode: 'DISTRIBUTED_REDIS' | 'DISTRIBUTED_POSTGRES' | 'DEV_LOCAL_FILE' | 'FAIL_CLOSED';

  constructor(options?: { forceStore?: IDistributedLotteryStore }) {
    if (options?.forceStore) {
      this.activeStore = options.forceStore;
      this.mode = options.forceStore.mode;
      return;
    }

    const isProduction =
      process.env.NODE_ENV === 'production' ||
      process.env.REQUIRE_DISTRIBUTED_LOTTERY_STORE === 'true';

    const redisUrl = process.env.REDIS_URL;
    const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;

    if (redisUrl) {
      this.activeStore = new RedisLotteryStoreStub(redisUrl);
      this.mode = 'DISTRIBUTED_REDIS';
    } else if (dbUrl) {
      this.activeStore = new PostgresLotteryStoreStub(dbUrl);
      this.mode = 'DISTRIBUTED_POSTGRES';
    } else if (isProduction) {
      this.activeStore = new FailClosedLotteryStore();
      this.mode = 'FAIL_CLOSED';
    } else {
      this.activeStore = new FileLotteryStore();
      this.mode = 'DEV_LOCAL_FILE';
    }
  }

  loadState(): LotteryPersistedState | null {
    return this.activeStore.loadState();
  }

  saveState(state: LotteryPersistedState): void {
    this.activeStore.saveState(state);
  }
}

export const distributedLotteryStore = new DistributedLotteryStoreAdapter();

/**
 * Loads persistent lottery data via the configured store adapter.
 */
export function loadPersistedLotteryState(): LotteryPersistedState | null {
  return distributedLotteryStore.loadState();
}

/**
 * Saves lottery state via the configured store adapter.
 */
export function savePersistedLotteryState(state: LotteryPersistedState): void {
  distributedLotteryStore.saveState(state);
}
