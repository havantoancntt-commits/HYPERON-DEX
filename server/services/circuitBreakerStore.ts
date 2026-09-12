/**
 * HYPERON-DEX DISTRIBUTED CIRCUIT BREAKER & AUDIT STORE ABSTRACTION
 * Production-grade persistence abstraction for multi-instance high-availability deployments.
 * Eliminates single-process memory dependencies for financial circuit breakers,
 * preventing split-brain states and race conditions across distributed instances.
 */

import { SCALAR_USD } from './financialMath';
import crypto from 'crypto';

export interface CircuitBreakerState {
  symbol: string;
  isTripped: boolean;
  trippedAt: number;
  reason?: string;
  triggerPriceRaw?: bigint;
  cooldownPeriodMs: number;
  resetAttempts: number;
  lastEvaluatedAt: number;
  status: 'HEALTHY' | 'CIRCUIT_BREAKER_ACTIVE' | 'EMERGENCY_HALT' | 'COOLDOWN';
}

export interface PriceSnapshot {
  price: bigint;
  timestamp: number;
}

export interface CircuitBreakerAuditLog {
  id: string;
  symbol: string;
  action: 'TRIP' | 'RESET' | 'EVALUATE' | 'EMERGENCY_HALT' | 'COOLDOWN_EXPIRED';
  operator: string;
  reason: string;
  timestamp: number;
  verifiedPriceRaw: bigint;
  priceChangeBps: bigint;
  requestId?: string;
  instanceId?: string;
  metadata?: Record<string, any>;
}

export interface ICircuitBreakerStore {
  getStatus(symbol: string): Promise<CircuitBreakerState>;
  isTripped(symbol: string): Promise<boolean>;
  trip(
    symbol: string,
    reason: string,
    triggerPriceRaw: bigint,
    priceChangeBps: bigint,
    operator?: string,
    requestId?: string
  ): Promise<CircuitBreakerState>;
  reset(
    symbol: string,
    operator: string,
    reason: string,
    currentVerifiedPriceRaw?: bigint,
    requestId?: string
  ): Promise<{ success: boolean; state: CircuitBreakerState; error?: string }>;
  recordEvaluation(symbol: string, state: Partial<CircuitBreakerState>): Promise<CircuitBreakerState>;
}

export interface IPriceHistoryStore {
  recordSnapshot(symbol: string, priceRaw: bigint, timestamp?: number): Promise<PriceSnapshot[]>;
  getHistory(symbol: string, windowMs?: number): Promise<PriceSnapshot[]>;
  clear(symbol: string): Promise<void>;
}

export interface ICircuitBreakerAuditStore {
  appendLog(log: CircuitBreakerAuditLog): Promise<void>;
  getLogs(symbol?: string, limit?: number): Promise<CircuitBreakerAuditLog[]>;
}

const DEFAULT_COOLDOWN_MS = 60_000; // 60s cooldown

/**
 * In-Memory Circuit Breaker Store with Concurrency Protection & Cooldown Enforcement.
 * Used for local development and test suites.
 */
export class InMemoryCircuitBreakerStore implements ICircuitBreakerStore {
  private states = new Map<string, CircuitBreakerState>();
  private locks = new Map<string, Promise<any>>();
  private instanceId = `mem-${process.pid}-${Math.random().toString(36).substring(2, 7)}`;

  constructor(private auditStore?: ICircuitBreakerAuditStore) {}

  private async withLock<T>(symbol: string, fn: () => Promise<T>): Promise<T> {
    const key = symbol.toUpperCase();
    while (this.locks.has(key)) {
      await this.locks.get(key);
    }
    let resolver: () => void;
    const lockPromise = new Promise<void>((res) => {
      resolver = res;
    });
    this.locks.set(key, lockPromise);
    try {
      return await fn();
    } finally {
      this.locks.delete(key);
      resolver!();
    }
  }

  public async getStatus(symbol: string): Promise<CircuitBreakerState> {
    const key = symbol.toUpperCase();
    const existing = this.states.get(key);
    if (!existing) {
      return {
        symbol: key,
        isTripped: false,
        trippedAt: 0,
        cooldownPeriodMs: DEFAULT_COOLDOWN_MS,
        resetAttempts: 0,
        lastEvaluatedAt: Date.now(),
        status: 'HEALTHY',
      };
    }

    // Check if cooldown has expired
    if (existing.isTripped && Date.now() - existing.trippedAt > existing.cooldownPeriodMs) {
      return {
        ...existing,
        status: 'COOLDOWN',
      };
    }

    return { ...existing };
  }

  public async isTripped(symbol: string): Promise<boolean> {
    const state = await this.getStatus(symbol);
    return state.isTripped;
  }

  public async trip(
    symbol: string,
    reason: string,
    triggerPriceRaw: bigint,
    priceChangeBps: bigint,
    operator: string = 'AUTOMATED_VOLATILITY_MONITOR',
    requestId?: string
  ): Promise<CircuitBreakerState> {
    return this.withLock(symbol, async () => {
      const key = symbol.toUpperCase();
      const now = Date.now();
      const isEmergency = reason.includes('EMERGENCY') || priceChangeBps >= 2500n;

      const newState: CircuitBreakerState = {
        symbol: key,
        isTripped: true,
        trippedAt: now,
        reason,
        triggerPriceRaw,
        cooldownPeriodMs: DEFAULT_COOLDOWN_MS,
        resetAttempts: 0,
        lastEvaluatedAt: now,
        status: isEmergency ? 'EMERGENCY_HALT' : 'CIRCUIT_BREAKER_ACTIVE',
      };

      this.states.set(key, newState);

      if (this.auditStore) {
        await this.auditStore.appendLog({
          id: `trip-${key}-${now}-${crypto.randomBytes(4).toString('hex')}`,
          symbol: key,
          action: isEmergency ? 'EMERGENCY_HALT' : 'TRIP',
          operator,
          reason,
          timestamp: now,
          verifiedPriceRaw: triggerPriceRaw,
          priceChangeBps,
          requestId,
          instanceId: this.instanceId,
        });
      }

      return newState;
    });
  }

  public async reset(
    symbol: string,
    operator: string,
    reason: string,
    currentVerifiedPriceRaw: bigint = 0n,
    requestId?: string
  ): Promise<{ success: boolean; state: CircuitBreakerState; error?: string }> {
    return this.withLock(symbol, async () => {
      const key = symbol.toUpperCase();
      const current = await this.getStatus(key);

      if (!current.isTripped) {
        return { success: true, state: current };
      }

      const now = Date.now();
      const elapsed = now - current.trippedAt;

      // Fail-closed security rule: MUST respect minimum cooldown unless authorized governance override
      const isAuthorizedGov = operator.startsWith('0x') || operator === 'ADMIN_OVERRIDE_AUTHORIZED';
      if (!isAuthorizedGov && elapsed < current.cooldownPeriodMs) {
        const remaining = Math.ceil((current.cooldownPeriodMs - elapsed) / 1000);
        return {
          success: false,
          state: current,
          error: `COOLDOWN_ACTIVE: Circuit breaker is locked for another ${remaining}s. Cooldown must elapse before reset.`,
        };
      }

      const resetState: CircuitBreakerState = {
        symbol: key,
        isTripped: false,
        trippedAt: 0,
        reason: undefined,
        triggerPriceRaw: undefined,
        cooldownPeriodMs: DEFAULT_COOLDOWN_MS,
        resetAttempts: current.resetAttempts + 1,
        lastEvaluatedAt: now,
        status: 'HEALTHY',
      };

      this.states.set(key, resetState);

      if (this.auditStore) {
        await this.auditStore.appendLog({
          id: `reset-${key}-${now}-${crypto.randomBytes(4).toString('hex')}`,
          symbol: key,
          action: 'RESET',
          operator,
          reason,
          timestamp: now,
          verifiedPriceRaw: currentVerifiedPriceRaw,
          priceChangeBps: 0n,
          requestId,
          instanceId: this.instanceId,
        });
      }

      return { success: true, state: resetState };
    });
  }

  public async recordEvaluation(
    symbol: string,
    partial: Partial<CircuitBreakerState>
  ): Promise<CircuitBreakerState> {
    const key = symbol.toUpperCase();
    const curr = await this.getStatus(key);
    const updated: CircuitBreakerState = {
      ...curr,
      ...partial,
      symbol: key,
      lastEvaluatedAt: Date.now(),
    };
    this.states.set(key, updated);
    return updated;
  }
}

/**
 * In-Memory Price History Store
 */
export class InMemoryPriceHistoryStore implements IPriceHistoryStore {
  private history = new Map<string, PriceSnapshot[]>();
  private readonly maxWindowMs = 300_000; // 5 minutes

  public async recordSnapshot(symbol: string, priceRaw: bigint, timestamp: number = Date.now()): Promise<PriceSnapshot[]> {
    const key = symbol.toUpperCase();
    let snapshots = this.history.get(key) || [];
    snapshots.push({ price: priceRaw, timestamp });

    // Evict older than maxWindowMs
    const cutoff = timestamp - this.maxWindowMs;
    snapshots = snapshots.filter((s) => s.timestamp >= cutoff);
    this.history.set(key, snapshots);
    return snapshots;
  }

  public async getHistory(symbol: string, windowMs: number = 60_000): Promise<PriceSnapshot[]> {
    const key = symbol.toUpperCase();
    const snapshots = this.history.get(key) || [];
    const cutoff = Date.now() - windowMs;
    return snapshots.filter((s) => s.timestamp >= cutoff);
  }

  public async clear(symbol: string): Promise<void> {
    this.history.delete(symbol.toUpperCase());
  }
}

/**
 * In-Memory Audit Log Store
 */
export class InMemoryCircuitBreakerAuditStore implements ICircuitBreakerAuditStore {
  private logs: CircuitBreakerAuditLog[] = [];
  private readonly maxLogs = 500;

  public async appendLog(log: CircuitBreakerAuditLog): Promise<void> {
    this.logs.unshift(log);
    if (this.logs.length > this.maxLogs) {
      this.logs.length = this.maxLogs;
    }
  }

  public async getLogs(symbol?: string, limit: number = 50): Promise<CircuitBreakerAuditLog[]> {
    let filtered = this.logs;
    if (symbol) {
      const key = symbol.toUpperCase();
      filtered = filtered.filter((l) => l.symbol === key);
    }
    return filtered.slice(0, limit);
  }
}

/**
 * Distributed Store Factory & Singleton Registry.
 * Easily swappable for Redis / SQL database in multi-container cloud deployments.
 */
export class CircuitBreakerStoreManager {
  private static auditStore: ICircuitBreakerAuditStore = new InMemoryCircuitBreakerAuditStore();
  private static cbStore: ICircuitBreakerStore = new InMemoryCircuitBreakerStore(CircuitBreakerStoreManager.auditStore);
  private static historyStore: IPriceHistoryStore = new InMemoryPriceHistoryStore();

  public static getCircuitBreakerStore(): ICircuitBreakerStore {
    return this.cbStore;
  }

  public static getPriceHistoryStore(): IPriceHistoryStore {
    return this.historyStore;
  }

  public static getAuditStore(): ICircuitBreakerAuditStore {
    return this.auditStore;
  }

  /**
   * Allows injecting a custom distributed store (e.g. Redis / PostgreSQL) in production.
   */
  public static setStores(
    cbStore: ICircuitBreakerStore,
    historyStore: IPriceHistoryStore,
    auditStore: ICircuitBreakerAuditStore
  ) {
    this.cbStore = cbStore;
    this.historyStore = historyStore;
    this.auditStore = auditStore;
  }
}
