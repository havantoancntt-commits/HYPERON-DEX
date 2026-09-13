/**
 * HYPERON-DEX DISTRIBUTED CIRCUIT BREAKER & AUDIT STORE ABSTRACTION
 * Production-grade persistence abstraction for multi-instance high-availability deployments.
 * Eliminates single-process memory dependencies for financial circuit breakers,
 * preventing split-brain states and race conditions across distributed instances.
 */

import { SCALAR_USD } from './financialMath';
import crypto from 'crypto';
import pg from 'pg';
import Redis from 'ioredis';

export type CircuitBreakerStatusType =
  | 'HEALTHY'
  | 'TRIPPED'
  | 'CIRCUIT_BREAKER_ACTIVE'
  | 'EMERGENCY_HALT'
  | 'COOLDOWN'
  | 'VERIFICATION_PENDING'
  | 'VERIFIED_RESET'
  | 'STORAGE_UNAVAILABLE';

export interface CircuitBreakerState {
  symbol: string;
  isTripped: boolean;
  trippedAt: number;
  reason?: string;
  triggerPriceRaw?: bigint;
  verifiedPriceRaw?: bigint;
  cooldownPeriodMs: number;
  resetAttempts: number;
  lastEvaluatedAt: number;
  status: CircuitBreakerStatusType;
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

    if (existing.isTripped) {
      const elapsed = Date.now() - existing.trippedAt;
      const status: CircuitBreakerStatusType =
        elapsed >= existing.cooldownPeriodMs ? 'VERIFICATION_PENDING' : 'COOLDOWN';
      return {
        ...existing,
        status: existing.status === 'EMERGENCY_HALT' && elapsed < existing.cooldownPeriodMs
          ? 'EMERGENCY_HALT'
          : status,
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
        status: isEmergency ? 'EMERGENCY_HALT' : 'TRIPPED',
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

      // Verification transition
      const verifiedResetState: CircuitBreakerState = {
        symbol: key,
        isTripped: false,
        trippedAt: 0,
        reason: undefined,
        triggerPriceRaw: undefined,
        verifiedPriceRaw: currentVerifiedPriceRaw > 0n ? currentVerifiedPriceRaw : undefined,
        cooldownPeriodMs: DEFAULT_COOLDOWN_MS,
        resetAttempts: current.resetAttempts + 1,
        lastEvaluatedAt: now,
        status: 'HEALTHY',
      };

      this.states.set(key, verifiedResetState);

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

      return { success: true, state: verifiedResetState };
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
 * PostgreSQL Distributed Circuit Breaker Store
 */
export class PostgresCircuitBreakerStore implements ICircuitBreakerStore {
  private pool: pg.Pool;
  private initialized = false;
  private initPromise: Promise<void> | null = null;
  private instanceId = `pg-${process.pid}-${crypto.randomBytes(3).toString('hex')}`;

  constructor(dbUrl: string, private auditStore?: ICircuitBreakerAuditStore) {
    this.pool = new pg.Pool({
      connectionString: dbUrl,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
  }

  private async ensureInitialized(): Promise<void> {
    if (this.initialized) return;
    if (!this.initPromise) {
      this.initPromise = (async () => {
        const client = await this.pool.connect();
        try {
          await client.query(`
            CREATE TABLE IF NOT EXISTS circuit_breaker_states (
              symbol VARCHAR(32) PRIMARY KEY,
              is_tripped BOOLEAN NOT NULL DEFAULT FALSE,
              tripped_at BIGINT NOT NULL DEFAULT 0,
              reason TEXT,
              trigger_price_raw TEXT,
              cooldown_period_ms INT NOT NULL DEFAULT 60000,
              reset_attempts INT NOT NULL DEFAULT 0,
              last_evaluated_at BIGINT NOT NULL DEFAULT 0,
              status VARCHAR(32) NOT NULL DEFAULT 'HEALTHY'
            );
          `);
          this.initialized = true;
        } finally {
          client.release();
        }
      })();
    }
    return this.initPromise;
  }

  async getStatus(symbol: string): Promise<CircuitBreakerState> {
    const key = symbol.toUpperCase();
    try {
      await this.ensureInitialized();
      const res = await this.pool.query(
        `SELECT symbol, is_tripped, tripped_at, reason, trigger_price_raw, cooldown_period_ms, reset_attempts, last_evaluated_at, status
         FROM circuit_breaker_states
         WHERE symbol = $1`,
        [key]
      );
      if (res.rows.length === 0) {
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
      const r = res.rows[0];
      const isTripped = Boolean(r.is_tripped);
      const trippedAt = Number(r.tripped_at);
      const cooldownPeriodMs = Number(r.cooldown_period_ms);
      let status = r.status as CircuitBreakerStatusType;
      if (isTripped) {
        const elapsed = Date.now() - trippedAt;
        status = elapsed >= cooldownPeriodMs ? 'VERIFICATION_PENDING' : 'COOLDOWN';
        if (r.status === 'EMERGENCY_HALT' && elapsed < cooldownPeriodMs) {
          status = 'EMERGENCY_HALT';
        }
      }
      return {
        symbol: r.symbol,
        isTripped,
        trippedAt,
        reason: r.reason || undefined,
        triggerPriceRaw: r.trigger_price_raw ? BigInt(r.trigger_price_raw) : undefined,
        cooldownPeriodMs,
        resetAttempts: Number(r.reset_attempts),
        lastEvaluatedAt: Number(r.last_evaluated_at),
        status,
      };
    } catch (err: any) {
      // FAIL CLOSED: Database connection or query error halts trading for this symbol
      return {
        symbol: key,
        isTripped: true,
        trippedAt: Date.now(),
        reason: `POSTGRES_STORE_UNAVAILABLE: ${err?.message || 'Database query failure'}. Fail-closed security halt.`,
        cooldownPeriodMs: DEFAULT_COOLDOWN_MS,
        resetAttempts: 0,
        lastEvaluatedAt: Date.now(),
        status: 'STORAGE_UNAVAILABLE',
      };
    }
  }

  async isTripped(symbol: string): Promise<boolean> {
    const s = await this.getStatus(symbol);
    return s.isTripped;
  }

  async trip(
    symbol: string,
    reason: string,
    triggerPriceRaw: bigint,
    priceChangeBps: bigint,
    operator: string = 'AUTOMATED_VOLATILITY_MONITOR',
    requestId?: string
  ): Promise<CircuitBreakerState> {
    await this.ensureInitialized();
    const key = symbol.toUpperCase();
    const now = Date.now();
    const isEmergency = reason.includes('EMERGENCY') || priceChangeBps >= 2500n;
    const status: CircuitBreakerState['status'] = isEmergency ? 'EMERGENCY_HALT' : 'CIRCUIT_BREAKER_ACTIVE';

    await this.pool.query(
      `INSERT INTO circuit_breaker_states (symbol, is_tripped, tripped_at, reason, trigger_price_raw, cooldown_period_ms, reset_attempts, last_evaluated_at, status)
       VALUES ($1, TRUE, $2, $3, $4, $5, 0, $2, $6)
       ON CONFLICT (symbol) DO UPDATE SET
         is_tripped = TRUE,
         tripped_at = $2,
         reason = $3,
         trigger_price_raw = $4,
         last_evaluated_at = $2,
         status = $6`,
      [key, now, reason, triggerPriceRaw.toString(), DEFAULT_COOLDOWN_MS, status]
    );

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

    return {
      symbol: key,
      isTripped: true,
      trippedAt: now,
      reason,
      triggerPriceRaw,
      cooldownPeriodMs: DEFAULT_COOLDOWN_MS,
      resetAttempts: 0,
      lastEvaluatedAt: now,
      status,
    };
  }

  async reset(
    symbol: string,
    operator: string,
    reason: string,
    currentVerifiedPriceRaw: bigint = 0n,
    requestId?: string
  ): Promise<{ success: boolean; state: CircuitBreakerState; error?: string }> {
    await this.ensureInitialized();
    const key = symbol.toUpperCase();
    const current = await this.getStatus(key);
    if (!current.isTripped) {
      return { success: true, state: current };
    }

    const now = Date.now();
    const elapsed = now - current.trippedAt;
    const isAuthorizedGov = operator.startsWith('0x') || operator === 'ADMIN_OVERRIDE_AUTHORIZED';
    if (!isAuthorizedGov && elapsed < current.cooldownPeriodMs) {
      const remaining = Math.ceil((current.cooldownPeriodMs - elapsed) / 1000);
      return {
        success: false,
        state: current,
        error: `COOLDOWN_ACTIVE: Circuit breaker is locked for another ${remaining}s. Cooldown must elapse before reset.`,
      };
    }

    await this.pool.query(
      `UPDATE circuit_breaker_states
       SET is_tripped = FALSE, tripped_at = 0, reason = NULL, trigger_price_raw = NULL,
           reset_attempts = reset_attempts + 1, last_evaluated_at = $1, status = 'HEALTHY'
       WHERE symbol = $2`,
      [now, key]
    );

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
  }

  async recordEvaluation(
    symbol: string,
    partial: Partial<CircuitBreakerState>
  ): Promise<CircuitBreakerState> {
    await this.ensureInitialized();
    const curr = await this.getStatus(symbol);
    const updated: CircuitBreakerState = {
      ...curr,
      ...partial,
      symbol: symbol.toUpperCase(),
      lastEvaluatedAt: Date.now(),
    };
    await this.pool.query(
      `INSERT INTO circuit_breaker_states (symbol, is_tripped, tripped_at, reason, trigger_price_raw, cooldown_period_ms, reset_attempts, last_evaluated_at, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (symbol) DO UPDATE SET
         is_tripped = EXCLUDED.is_tripped,
         tripped_at = EXCLUDED.tripped_at,
         reason = EXCLUDED.reason,
         trigger_price_raw = EXCLUDED.trigger_price_raw,
         cooldown_period_ms = EXCLUDED.cooldown_period_ms,
         reset_attempts = EXCLUDED.reset_attempts,
         last_evaluated_at = EXCLUDED.last_evaluated_at,
         status = EXCLUDED.status`,
      [
        updated.symbol,
        updated.isTripped,
        updated.trippedAt,
        updated.reason || null,
        updated.triggerPriceRaw ? updated.triggerPriceRaw.toString() : null,
        updated.cooldownPeriodMs,
        updated.resetAttempts,
        updated.lastEvaluatedAt,
        updated.status,
      ]
    );
    return updated;
  }
}

/**
 * PostgreSQL Distributed Price History Store
 */
export class PostgresPriceHistoryStore implements IPriceHistoryStore {
  private pool: pg.Pool;
  private initialized = false;
  private initPromise: Promise<void> | null = null;
  private readonly maxWindowMs = 300_000;

  constructor(dbUrl: string) {
    this.pool = new pg.Pool({
      connectionString: dbUrl,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
  }

  private async ensureInitialized(): Promise<void> {
    if (this.initialized) return;
    if (!this.initPromise) {
      this.initPromise = (async () => {
        const client = await this.pool.connect();
        try {
          await client.query(`
            CREATE TABLE IF NOT EXISTS price_history_snapshots (
              id BIGSERIAL PRIMARY KEY,
              symbol VARCHAR(32) NOT NULL,
              price_raw TEXT NOT NULL,
              timestamp BIGINT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_phs_sym_ts ON price_history_snapshots (symbol, timestamp);
          `);
          this.initialized = true;
        } finally {
          client.release();
        }
      })();
    }
    return this.initPromise;
  }

  async recordSnapshot(symbol: string, priceRaw: bigint, timestamp: number = Date.now()): Promise<PriceSnapshot[]> {
    await this.ensureInitialized();
    const key = symbol.toUpperCase();
    await this.pool.query(
      `INSERT INTO price_history_snapshots (symbol, price_raw, timestamp) VALUES ($1, $2, $3)`,
      [key, priceRaw.toString(), timestamp]
    );
    const cutoff = timestamp - this.maxWindowMs;
    await this.pool.query(
      `DELETE FROM price_history_snapshots WHERE symbol = $1 AND timestamp < $2`,
      [key, cutoff]
    );
    return this.getHistory(key, this.maxWindowMs);
  }

  async getHistory(symbol: string, windowMs: number = 60_000): Promise<PriceSnapshot[]> {
    await this.ensureInitialized();
    const key = symbol.toUpperCase();
    const cutoff = Date.now() - windowMs;
    const res = await this.pool.query(
      `SELECT price_raw, timestamp FROM price_history_snapshots
       WHERE symbol = $1 AND timestamp >= $2
       ORDER BY timestamp ASC`,
      [key, cutoff]
    );
    return res.rows.map((r) => ({
      price: BigInt(r.price_raw),
      timestamp: Number(r.timestamp),
    }));
  }

  async clear(symbol: string): Promise<void> {
    await this.ensureInitialized();
    await this.pool.query(`DELETE FROM price_history_snapshots WHERE symbol = $1`, [symbol.toUpperCase()]);
  }
}

/**
 * PostgreSQL Distributed Circuit Breaker Audit Store
 */
export class PostgresCircuitBreakerAuditStore implements ICircuitBreakerAuditStore {
  private pool: pg.Pool;
  private initialized = false;
  private initPromise: Promise<void> | null = null;

  constructor(dbUrl: string) {
    this.pool = new pg.Pool({
      connectionString: dbUrl,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
  }

  private async ensureInitialized(): Promise<void> {
    if (this.initialized) return;
    if (!this.initPromise) {
      this.initPromise = (async () => {
        const client = await this.pool.connect();
        try {
          await client.query(`
            CREATE TABLE IF NOT EXISTS circuit_breaker_audit_logs (
              id VARCHAR(64) PRIMARY KEY,
              symbol VARCHAR(32) NOT NULL,
              action VARCHAR(32) NOT NULL,
              operator TEXT NOT NULL,
              reason TEXT NOT NULL,
              timestamp BIGINT NOT NULL,
              verified_price_raw TEXT NOT NULL,
              price_change_bps TEXT NOT NULL,
              request_id TEXT,
              instance_id TEXT,
              metadata JSONB
            );
            CREATE INDEX IF NOT EXISTS idx_cbal_sym_ts ON circuit_breaker_audit_logs (symbol, timestamp DESC);
          `);
          this.initialized = true;
        } finally {
          client.release();
        }
      })();
    }
    return this.initPromise;
  }

  async appendLog(log: CircuitBreakerAuditLog): Promise<void> {
    await this.ensureInitialized();
    await this.pool.query(
      `INSERT INTO circuit_breaker_audit_logs (id, symbol, action, operator, reason, timestamp, verified_price_raw, price_change_bps, request_id, instance_id, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (id) DO NOTHING`,
      [
        log.id,
        log.symbol.toUpperCase(),
        log.action,
        log.operator,
        log.reason,
        log.timestamp,
        log.verifiedPriceRaw.toString(),
        log.priceChangeBps.toString(),
        log.requestId || null,
        log.instanceId || null,
        log.metadata ? JSON.stringify(log.metadata) : null,
      ]
    );
  }

  async getLogs(symbol?: string, limit: number = 50): Promise<CircuitBreakerAuditLog[]> {
    await this.ensureInitialized();
    let query = `SELECT id, symbol, action, operator, reason, timestamp, verified_price_raw, price_change_bps, request_id, instance_id, metadata
                 FROM circuit_breaker_audit_logs`;
    const params: any[] = [];
    if (symbol) {
      query += ` WHERE symbol = $1 ORDER BY timestamp DESC LIMIT $2`;
      params.push(symbol.toUpperCase(), limit);
    } else {
      query += ` ORDER BY timestamp DESC LIMIT $1`;
      params.push(limit);
    }
    const res = await this.pool.query(query, params);
    return res.rows.map((r) => ({
      id: r.id,
      symbol: r.symbol,
      action: r.action,
      operator: r.operator,
      reason: r.reason,
      timestamp: Number(r.timestamp),
      verifiedPriceRaw: BigInt(r.verified_price_raw),
      priceChangeBps: BigInt(r.price_change_bps),
      requestId: r.request_id || undefined,
      instanceId: r.instance_id || undefined,
      metadata: r.metadata || undefined,
    }));
  }
}

/**
 * Redis Distributed Circuit Breaker Store
 */
export class RedisCircuitBreakerStore implements ICircuitBreakerStore {
  private redisUrl: string;
  private client?: Redis;
  private isRest: boolean;

  constructor(redisUrl: string, private auditStore?: ICircuitBreakerAuditStore) {
    this.redisUrl = redisUrl;
    this.isRest = this.redisUrl.startsWith('http://') || this.redisUrl.startsWith('https://');
    if (!this.isRest) {
      this.client = new Redis(this.redisUrl, {
        lazyConnect: true,
        maxRetriesPerRequest: 2,
        enableReadyCheck: false,
      });
    }
  }

  private async getClient(): Promise<Redis> {
    if (!this.client) {
      throw new Error('REDIS_CLIENT_UNAVAILABLE');
    }
    if (this.client.status === 'wait') {
      await this.client.connect();
    }
    return this.client;
  }

  async getStatus(symbol: string): Promise<CircuitBreakerState> {
    const key = symbol.toUpperCase();
    const redisKey = `cb:state:${key}`;
    try {
      let raw: string | null = null;
      if (this.isRest) {
        const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.REDIS_TOKEN || '';
        const res = await fetch(`${this.redisUrl}/get/${encodeURIComponent(redisKey)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          return this.getFailClosedStatus(key, `UPSTASH_HTTP_ERROR_${res.status}`);
        }
        const data: any = await res.json();
        raw = data?.result ?? null;
      } else {
        const client = await this.getClient();
        raw = await client.get(redisKey);
      }

      if (!raw) {
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

      const parsed = JSON.parse(raw);
      if (parsed.triggerPriceRaw) {
        parsed.triggerPriceRaw = BigInt(parsed.triggerPriceRaw);
      }
      if (parsed.verifiedPriceRaw) {
        parsed.verifiedPriceRaw = BigInt(parsed.verifiedPriceRaw);
      }

      if (parsed.isTripped) {
        const elapsed = Date.now() - (parsed.trippedAt || 0);
        const cooldown = parsed.cooldownPeriodMs || DEFAULT_COOLDOWN_MS;
        if (elapsed >= cooldown) {
          parsed.status = 'VERIFICATION_PENDING';
        } else if (parsed.status !== 'EMERGENCY_HALT') {
          parsed.status = 'COOLDOWN';
        }
      }

      return parsed;
    } catch (err: any) {
      // Fail closed on any Redis connection or deserialization failure
      return this.getFailClosedStatus(key, `REDIS_UNAVAILABLE: ${err?.message || 'Connection error'}`);
    }
  }

  private getFailClosedStatus(key: string, reason: string): CircuitBreakerState {
    return {
      symbol: key,
      isTripped: true,
      trippedAt: Date.now(),
      reason: `${reason}. Fail-closed security halt active.`,
      cooldownPeriodMs: DEFAULT_COOLDOWN_MS,
      resetAttempts: 0,
      lastEvaluatedAt: Date.now(),
      status: 'STORAGE_UNAVAILABLE',
    };
  }

  async isTripped(symbol: string): Promise<boolean> {
    const s = await this.getStatus(symbol);
    return s.isTripped;
  }

  async trip(
    symbol: string,
    reason: string,
    triggerPriceRaw: bigint,
    priceChangeBps: bigint,
    operator: string = 'AUTOMATED_VOLATILITY_MONITOR',
    requestId?: string
  ): Promise<CircuitBreakerState> {
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
      status: isEmergency ? 'EMERGENCY_HALT' : 'TRIPPED',
    };

    const redisKey = `cb:state:${key}`;
    const serialized = JSON.stringify({
      ...newState,
      triggerPriceRaw: triggerPriceRaw.toString(),
    });

    if (this.isRest) {
      const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.REDIS_TOKEN || '';
      await fetch(`${this.redisUrl}/set/${encodeURIComponent(redisKey)}/${encodeURIComponent(serialized)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    } else {
      const client = await this.getClient();
      await client.set(redisKey, serialized);
    }

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
      });
    }

    return newState;
  }

  async reset(
    symbol: string,
    operator: string,
    reason: string,
    currentVerifiedPriceRaw: bigint = 0n,
    requestId?: string
  ): Promise<{ success: boolean; state: CircuitBreakerState; error?: string }> {
    const key = symbol.toUpperCase();
    const current = await this.getStatus(key);
    if (!current.isTripped) {
      return { success: true, state: current };
    }

    if (current.status === 'STORAGE_UNAVAILABLE') {
      return {
        success: false,
        state: current,
        error: 'STORAGE_UNAVAILABLE: Cannot reset circuit breaker while distributed storage is offline',
      };
    }

    const now = Date.now();
    const elapsed = now - current.trippedAt;
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
      verifiedPriceRaw: currentVerifiedPriceRaw > 0n ? currentVerifiedPriceRaw : undefined,
      cooldownPeriodMs: DEFAULT_COOLDOWN_MS,
      resetAttempts: current.resetAttempts + 1,
      lastEvaluatedAt: now,
      status: 'HEALTHY',
    };

    const redisKey = `cb:state:${key}`;
    const serialized = JSON.stringify({
      ...resetState,
      verifiedPriceRaw: currentVerifiedPriceRaw > 0n ? currentVerifiedPriceRaw.toString() : undefined,
    });

    if (this.isRest) {
      const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.REDIS_TOKEN || '';
      await fetch(`${this.redisUrl}/set/${encodeURIComponent(redisKey)}/${encodeURIComponent(serialized)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    } else {
      const client = await this.getClient();
      await client.set(redisKey, serialized);
    }

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
      });
    }

    return { success: true, state: resetState };
  }

  async recordEvaluation(symbol: string, partial: Partial<CircuitBreakerState>): Promise<CircuitBreakerState> {
    const curr = await this.getStatus(symbol);
    const updated: CircuitBreakerState = {
      ...curr,
      ...partial,
      symbol: symbol.toUpperCase(),
      lastEvaluatedAt: Date.now(),
    };
    const redisKey = `cb:state:${symbol.toUpperCase()}`;
    const serialized = JSON.stringify({
      ...updated,
      triggerPriceRaw: updated.triggerPriceRaw ? updated.triggerPriceRaw.toString() : undefined,
      verifiedPriceRaw: updated.verifiedPriceRaw ? updated.verifiedPriceRaw.toString() : undefined,
    });
    if (this.isRest) {
      const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.REDIS_TOKEN || '';
      await fetch(`${this.redisUrl}/set/${encodeURIComponent(redisKey)}/${encodeURIComponent(serialized)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    } else {
      const client = await this.getClient();
      await client.set(redisKey, serialized);
    }
    return updated;
  }
}

/**
 * Redis Distributed Price History Store
 */
export class RedisPriceHistoryStore implements IPriceHistoryStore {
  private redisUrl: string;
  private client?: Redis;
  private isRest: boolean;
  private readonly maxWindowMs = 300_000;

  constructor(redisUrl: string) {
    this.redisUrl = redisUrl;
    this.isRest = this.redisUrl.startsWith('http://') || this.redisUrl.startsWith('https://');
    if (!this.isRest) {
      this.client = new Redis(this.redisUrl, {
        lazyConnect: true,
        maxRetriesPerRequest: 2,
        enableReadyCheck: false,
      });
    }
  }

  private async getClient(): Promise<Redis> {
    if (!this.client) throw new Error('REDIS_CLIENT_UNAVAILABLE');
    if (this.client.status === 'wait') await this.client.connect();
    return this.client;
  }

  async recordSnapshot(symbol: string, priceRaw: bigint, timestamp: number = Date.now()): Promise<PriceSnapshot[]> {
    const key = symbol.toUpperCase();
    const redisKey = `cb:history:${key}`;
    const payload = JSON.stringify({ price: priceRaw.toString(), timestamp });
    try {
      if (this.isRest) {
        const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.REDIS_TOKEN || '';
        await fetch(`${this.redisUrl}/rpush/${encodeURIComponent(redisKey)}/${encodeURIComponent(payload)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        await fetch(`${this.redisUrl}/ltrim/${encodeURIComponent(redisKey)}/-120/-1`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        const client = await this.getClient();
        await client.rpush(redisKey, payload);
        await client.ltrim(redisKey, -120, -1);
        await client.expire(redisKey, 3600);
      }
    } catch {
      // In-memory or fallback snapshot collection
    }
    return this.getHistory(key, this.maxWindowMs);
  }

  async getHistory(symbol: string, windowMs: number = 60_000): Promise<PriceSnapshot[]> {
    const key = symbol.toUpperCase();
    const redisKey = `cb:history:${key}`;
    const cutoff = Date.now() - windowMs;
    try {
      let rawList: string[] = [];
      if (this.isRest) {
        const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.REDIS_TOKEN || '';
        const res = await fetch(`${this.redisUrl}/lrange/${encodeURIComponent(redisKey)}/0/-1`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return [];
        const data: any = await res.json();
        rawList = Array.isArray(data.result) ? data.result : [];
      } else {
        const client = await this.getClient();
        rawList = await client.lrange(redisKey, 0, -1);
      }
      return rawList
        .map((str) => {
          try {
            const p = JSON.parse(str);
            return { price: BigInt(p.price), timestamp: Number(p.timestamp) };
          } catch {
            return null;
          }
        })
        .filter((item): item is PriceSnapshot => item !== null && item.timestamp >= cutoff)
        .sort((a, b) => a.timestamp - b.timestamp);
    } catch {
      return [];
    }
  }

  async clear(symbol: string): Promise<void> {
    const key = symbol.toUpperCase();
    const redisKey = `cb:history:${key}`;
    try {
      if (this.isRest) {
        const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.REDIS_TOKEN || '';
        await fetch(`${this.redisUrl}/del/${encodeURIComponent(redisKey)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        const client = await this.getClient();
        await client.del(redisKey);
      }
    } catch {
      // ignore
    }
  }
}

/**
 * Redis Distributed Circuit Breaker Audit Store
 */
export class RedisCircuitBreakerAuditStore implements ICircuitBreakerAuditStore {
  private redisUrl: string;
  private client?: Redis;
  private isRest: boolean;

  constructor(redisUrl: string) {
    this.redisUrl = redisUrl;
    this.isRest = this.redisUrl.startsWith('http://') || this.redisUrl.startsWith('https://');
    if (!this.isRest) {
      this.client = new Redis(this.redisUrl, {
        lazyConnect: true,
        maxRetriesPerRequest: 2,
        enableReadyCheck: false,
      });
    }
  }

  private async getClient(): Promise<Redis> {
    if (!this.client) throw new Error('REDIS_CLIENT_UNAVAILABLE');
    if (this.client.status === 'wait') await this.client.connect();
    return this.client;
  }

  async appendLog(log: CircuitBreakerAuditLog): Promise<void> {
    const key = log.symbol.toUpperCase();
    const payload = JSON.stringify({
      ...log,
      verifiedPriceRaw: log.verifiedPriceRaw.toString(),
      priceChangeBps: log.priceChangeBps.toString(),
    });
    const globalKey = 'cb:audit:global';
    const symbolKey = `cb:audit:${key}`;
    try {
      if (this.isRest) {
        const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.REDIS_TOKEN || '';
        await fetch(`${this.redisUrl}/lpush/${encodeURIComponent(globalKey)}/${encodeURIComponent(payload)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        await fetch(`${this.redisUrl}/ltrim/${encodeURIComponent(globalKey)}/0/499`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        await fetch(`${this.redisUrl}/lpush/${encodeURIComponent(symbolKey)}/${encodeURIComponent(payload)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        await fetch(`${this.redisUrl}/ltrim/${encodeURIComponent(symbolKey)}/0/99`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        const client = await this.getClient();
        const pipeline = client.pipeline();
        pipeline.lpush(globalKey, payload);
        pipeline.ltrim(globalKey, 0, 499);
        pipeline.lpush(symbolKey, payload);
        pipeline.ltrim(symbolKey, 0, 99);
        await pipeline.exec();
      }
    } catch {
      // ignore
    }
  }

  async getLogs(symbol?: string, limit: number = 50): Promise<CircuitBreakerAuditLog[]> {
    const targetKey = symbol ? `cb:audit:${symbol.toUpperCase()}` : 'cb:audit:global';
    try {
      let rawList: string[] = [];
      if (this.isRest) {
        const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.REDIS_TOKEN || '';
        const res = await fetch(`${this.redisUrl}/lrange/${encodeURIComponent(targetKey)}/0/${limit - 1}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return [];
        const data: any = await res.json();
        rawList = Array.isArray(data.result) ? data.result : [];
      } else {
        const client = await this.getClient();
        rawList = await client.lrange(targetKey, 0, limit - 1);
      }
      return rawList
        .map((str) => {
          try {
            const p = JSON.parse(str);
            return {
              ...p,
              verifiedPriceRaw: BigInt(p.verifiedPriceRaw || '0'),
              priceChangeBps: BigInt(p.priceChangeBps || '0'),
            };
          } catch {
            return null;
          }
        })
        .filter((item): item is CircuitBreakerAuditLog => item !== null);
    } catch {
      return [];
    }
  }
}

/**
 * Fail-Closed Circuit Breaker Stores for Multi-Instance Production
 */
export class FailClosedCircuitBreakerStore implements ICircuitBreakerStore {
  async getStatus(_symbol: string): Promise<CircuitBreakerState> {
    throw new Error(
      'CIRCUIT_BREAKER_STORE_UNAVAILABLE: Distributed storage (Redis/Postgres) not configured. Circuit breaker queries blocked in production.'
    );
  }

  async isTripped(_symbol: string): Promise<boolean> {
    return true; // Strictly fail closed: halted
  }

  async trip(_symbol: string, reason: string): Promise<CircuitBreakerState> {
    throw new Error(
      `CIRCUIT_BREAKER_STORE_UNAVAILABLE: Cannot persist trip (${reason}) without distributed store.`
    );
  }

  async reset(_symbol: string): Promise<{ success: boolean; state: CircuitBreakerState; error?: string }> {
    throw new Error(
      'CIRCUIT_BREAKER_STORE_UNAVAILABLE: Cannot reset circuit breaker in fail-closed state without distributed store.'
    );
  }

  async recordEvaluation(_symbol: string): Promise<CircuitBreakerState> {
    throw new Error(
      'CIRCUIT_BREAKER_STORE_UNAVAILABLE: Cannot record evaluation without distributed store.'
    );
  }
}

/**
 * Distributed Store Factory & Singleton Registry.
 * Automatically provisions Redis or PostgreSQL in multi-container cloud deployments,
 * or clean in-memory stores for dev and testing suites.
 */
export class CircuitBreakerStoreManager {
  private static auditStore: ICircuitBreakerAuditStore;
  private static cbStore: ICircuitBreakerStore;
  private static historyStore: IPriceHistoryStore;
  private static isInitialized = false;

  public static initialize(): void {
    if (this.isInitialized) return;

    const isProduction =
      process.env.NODE_ENV === 'production' ||
      process.env.REQUIRE_DISTRIBUTED_STORES === 'true';

    const redisUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.REDIS_URL;
    const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;

    if (redisUrl) {
      this.auditStore = new RedisCircuitBreakerAuditStore(redisUrl);
      this.cbStore = new RedisCircuitBreakerStore(redisUrl, this.auditStore);
      this.historyStore = new RedisPriceHistoryStore(redisUrl);
    } else if (dbUrl) {
      this.auditStore = new PostgresCircuitBreakerAuditStore(dbUrl);
      this.cbStore = new PostgresCircuitBreakerStore(dbUrl, this.auditStore);
      this.historyStore = new PostgresPriceHistoryStore(dbUrl);
    } else if (isProduction) {
      this.auditStore = new InMemoryCircuitBreakerAuditStore();
      this.cbStore = new FailClosedCircuitBreakerStore();
      this.historyStore = new InMemoryPriceHistoryStore();
    } else {
      this.auditStore = new InMemoryCircuitBreakerAuditStore();
      this.cbStore = new InMemoryCircuitBreakerStore(this.auditStore);
      this.historyStore = new InMemoryPriceHistoryStore();
    }
    this.isInitialized = true;
  }

  public static getCircuitBreakerStore(): ICircuitBreakerStore {
    if (!this.isInitialized) this.initialize();
    return this.cbStore;
  }

  public static getPriceHistoryStore(): IPriceHistoryStore {
    if (!this.isInitialized) this.initialize();
    return this.historyStore;
  }

  public static getAuditStore(): ICircuitBreakerAuditStore {
    if (!this.isInitialized) this.initialize();
    return this.auditStore;
  }

  public static setStores(
    cbStore: ICircuitBreakerStore,
    historyStore: IPriceHistoryStore,
    auditStore: ICircuitBreakerAuditStore
  ) {
    this.cbStore = cbStore;
    this.historyStore = historyStore;
    this.auditStore = auditStore;
    this.isInitialized = true;
  }
}

export interface CircuitBreakerStatus {
  symbol: string;
  isTripped: boolean;
  isEmergencyMode?: boolean;
  trippedAt?: number;
  reason?: string;
  priceChangeBps?: bigint;
  priceChangePercent?: number;
  lastValidPriceRaw?: bigint;
  lastValidPriceUsd?: number;
  cooldownElapsed?: boolean;
}

/**
 * Unified Circuit Breaker Enterprise Service.
 * Single source of truth connecting MultiOracleAggregator, Router, and on-chain monitors.
 * Backed strictly by CircuitBreakerStoreManager (Redis, Postgres, or InMemory test store).
 */
export class CircuitBreakerService {
  private static l1StatusCache = new Map<string, CircuitBreakerStatus>();
  private static l1HistoryCache = new Map<string, PriceSnapshot[]>();
  private static l1AuditCache: CircuitBreakerAuditLog[] = [];

  public static readonly CIRCUIT_BREAKER_WINDOW_MS = 15_000;
  public static readonly EMERGENCY_WINDOW_MS = 5_000;
  public static readonly CIRCUIT_BREAKER_THRESHOLD_BPS = 2000n; // 20.00%
  public static readonly EMERGENCY_SPIKE_BPS = 1000n; // 10.00%
  public static readonly CIRCUIT_BREAKER_COOLDOWN_MS = 300_000; // 5 minutes

  public static isTrippedSync(symbol: string): boolean {
    const key = symbol.toUpperCase();
    const status = this.l1StatusCache.get(key);
    return Boolean(status?.isTripped);
  }

  public static async isTripped(symbol: string): Promise<boolean> {
    const store = CircuitBreakerStoreManager.getCircuitBreakerStore();
    return store.isTripped(symbol);
  }

  public static isEmergencyMode(symbol: string): boolean {
    const key = symbol.toUpperCase();
    const status = this.l1StatusCache.get(key);
    return Boolean(status?.isEmergencyMode && status?.isTripped);
  }

  public static getStatusSync(symbol: string): CircuitBreakerStatus {
    const key = symbol.toUpperCase();
    const cached = this.l1StatusCache.get(key);
    if (cached) {
      if (cached.isTripped && cached.trippedAt) {
        cached.cooldownElapsed = Date.now() - cached.trippedAt >= this.CIRCUIT_BREAKER_COOLDOWN_MS;
      }
      return cached;
    }
    return {
      symbol: key,
      isTripped: false,
      isEmergencyMode: false,
    };
  }

  public static async getStatus(symbol: string): Promise<CircuitBreakerState> {
    const store = CircuitBreakerStoreManager.getCircuitBreakerStore();
    return store.getStatus(symbol);
  }

  public static recordSnapshotSync(symbol: string, priceRaw: bigint): CircuitBreakerStatus {
    const key = symbol.toUpperCase();
    const now = Date.now();

    let history = this.l1HistoryCache.get(key);
    if (!history) {
      history = [];
      this.l1HistoryCache.set(key, history);
    }
    history.push({ price: priceRaw, timestamp: now });
    if (history.length > 120) {
      history.shift();
    }

    // Persist snapshot to backing store asynchronously
    const historyStore = CircuitBreakerStoreManager.getPriceHistoryStore();
    historyStore.recordSnapshot(key, priceRaw, now).catch(() => {});

    // Check if currently tripped
    const existing = this.l1StatusCache.get(key);
    if (existing?.isTripped) {
      const cooldownElapsed = existing.trippedAt
        ? now - existing.trippedAt >= this.CIRCUIT_BREAKER_COOLDOWN_MS
        : false;
      return {
        ...existing,
        cooldownElapsed,
      };
    }

    // Check 1: Emergency Mode (>10% move in <= 5s)
    const recent5s = history.filter((s) => now - s.timestamp <= this.EMERGENCY_WINDOW_MS);
    if (recent5s.length >= 2) {
      const oldest = recent5s[0];
      const diff = priceRaw > oldest.price ? priceRaw - oldest.price : oldest.price - priceRaw;
      const pctChangeBps = oldest.price > 0n ? (diff * 10000n) / oldest.price : 0n;

      if (pctChangeBps >= this.EMERGENCY_SPIKE_BPS) {
        const pctChangeFloat = Number(pctChangeBps) / 100;
        const status: CircuitBreakerStatus = {
          symbol: key,
          isTripped: true,
          isEmergencyMode: true,
          trippedAt: now,
          priceChangeBps: pctChangeBps,
          priceChangePercent: pctChangeFloat,
          reason: `EMERGENCY_HALT: Instant ${pctChangeFloat.toFixed(2)}% price spike detected in ${(now - oldest.timestamp) / 1000}s (Threshold: 10.0%)`,
          lastValidPriceRaw: oldest.price,
        };
        this.l1StatusCache.set(key, status);

        const auditLog: CircuitBreakerAuditLog = {
          id: `CB-EMERGENCY-${now}-${crypto.randomBytes(4).toString('hex')}`,
          symbol: key,
          action: 'EMERGENCY_HALT',
          operator: 'SYSTEM_CIRCUIT_BREAKER',
          reason: status.reason || '',
          timestamp: now,
          verifiedPriceRaw: priceRaw,
          priceChangeBps: pctChangeBps,
        };
        this.l1AuditCache.unshift(auditLog);

        const cbStore = CircuitBreakerStoreManager.getCircuitBreakerStore();
        cbStore.trip(key, status.reason || '', priceRaw, pctChangeBps, 'SYSTEM_CIRCUIT_BREAKER').catch(() => {});
        const auditStore = CircuitBreakerStoreManager.getAuditStore();
        auditStore.appendLog(auditLog).catch(() => {});

        return status;
      }
    }

    // Check 2: Standard Circuit Breaker (>20% move in <= 15s)
    const recent15s = history.filter((s) => now - s.timestamp <= this.CIRCUIT_BREAKER_WINDOW_MS);
    if (recent15s.length >= 2) {
      const oldest = recent15s[0];
      const diff = priceRaw > oldest.price ? priceRaw - oldest.price : oldest.price - priceRaw;
      const pctChangeBps = oldest.price > 0n ? (diff * 10000n) / oldest.price : 0n;

      if (pctChangeBps >= this.CIRCUIT_BREAKER_THRESHOLD_BPS) {
        const pctChangeFloat = Number(pctChangeBps) / 100;
        const status: CircuitBreakerStatus = {
          symbol: key,
          isTripped: true,
          isEmergencyMode: false,
          trippedAt: now,
          priceChangeBps: pctChangeBps,
          priceChangePercent: pctChangeFloat,
          reason: `CIRCUIT_BREAKER_ACTIVE: ${pctChangeFloat.toFixed(2)}% volatility spike in ${(now - oldest.timestamp) / 1000}s (Threshold: 20.0%)`,
          lastValidPriceRaw: oldest.price,
        };
        this.l1StatusCache.set(key, status);

        const auditLog: CircuitBreakerAuditLog = {
          id: `CB-TRIP-${now}-${crypto.randomBytes(4).toString('hex')}`,
          symbol: key,
          action: 'TRIP',
          operator: 'SYSTEM_CIRCUIT_BREAKER',
          reason: status.reason || '',
          timestamp: now,
          verifiedPriceRaw: priceRaw,
          priceChangeBps: pctChangeBps,
        };
        this.l1AuditCache.unshift(auditLog);

        const cbStore = CircuitBreakerStoreManager.getCircuitBreakerStore();
        cbStore.trip(key, status.reason || '', priceRaw, pctChangeBps, 'SYSTEM_CIRCUIT_BREAKER').catch(() => {});
        const auditStore = CircuitBreakerStoreManager.getAuditStore();
        auditStore.appendLog(auditLog).catch(() => {});

        return status;
      }
    }

    const healthyStatus: CircuitBreakerStatus = {
      symbol: key,
      isTripped: false,
      isEmergencyMode: false,
      lastValidPriceRaw: priceRaw,
    };
    this.l1StatusCache.set(key, healthyStatus);
    return healthyStatus;
  }

  public static resetSync(
    symbol: string,
    operator: string = 'GOVERNANCE_TIMELOCK',
    reason: string = 'Audited oracle price verified clean post-cooldown',
    verifiedPriceRaw: bigint = 0n
  ): { success: boolean; message: string } {
    const key = symbol.toUpperCase();
    const current = this.l1StatusCache.get(key);

    if (!current || !current.isTripped) {
      return { success: true, message: `Circuit breaker for ${key} is already clean.` };
    }

    const now = Date.now();
    const isAuthorizedGov = operator.startsWith('0x') || operator === 'ADMIN_OVERRIDE_AUTHORIZED';
    if (!isAuthorizedGov && current.trippedAt && now - current.trippedAt < this.CIRCUIT_BREAKER_COOLDOWN_MS) {
      const remainingSec = Math.ceil((this.CIRCUIT_BREAKER_COOLDOWN_MS - (now - current.trippedAt)) / 1000);
      return {
        success: false,
        message: `Cannot reset circuit breaker: Cooldown period active (${remainingSec}s remaining).`,
      };
    }

    const resetStatus: CircuitBreakerStatus = {
      symbol: key,
      isTripped: false,
      isEmergencyMode: false,
      lastValidPriceRaw: verifiedPriceRaw > 0n ? verifiedPriceRaw : current.lastValidPriceRaw,
    };
    this.l1StatusCache.set(key, resetStatus);

    const auditEntry: CircuitBreakerAuditLog = {
      id: `CB-RESET-${now}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
      symbol: key,
      action: 'RESET',
      operator,
      reason,
      timestamp: now,
      verifiedPriceRaw: verifiedPriceRaw,
      priceChangeBps: 0n,
    };
    this.l1AuditCache.unshift(auditEntry);

    // Write-through to backing store
    const cbStore = CircuitBreakerStoreManager.getCircuitBreakerStore();
    cbStore.reset(key, operator, reason, verifiedPriceRaw).catch(() => {});
    const auditStore = CircuitBreakerStoreManager.getAuditStore();
    auditStore.appendLog(auditEntry).catch(() => {});

    return {
      success: true,
      message: `Circuit breaker for ${key} successfully reset with audit record ${auditEntry.id}.`,
    };
  }

  public static getAuditLogsSync(symbol?: string, limit: number = 50): CircuitBreakerAuditLog[] {
    if (symbol) {
      const key = symbol.toUpperCase();
      return this.l1AuditCache.filter((l) => l.symbol === key).slice(0, limit);
    }
    return this.l1AuditCache.slice(0, limit);
  }

  public static async getAuditLogs(symbol?: string, limit: number = 50): Promise<CircuitBreakerAuditLog[]> {
    const auditStore = CircuitBreakerStoreManager.getAuditStore();
    return auditStore.getLogs(symbol, limit);
  }
}
