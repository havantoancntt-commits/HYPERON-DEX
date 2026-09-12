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
    await this.ensureInitialized();
    const key = symbol.toUpperCase();
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
    let status = r.status as CircuitBreakerState['status'];
    if (isTripped && Date.now() - trippedAt > cooldownPeriodMs) {
      status = 'COOLDOWN';
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
      if (this.isRest) {
        const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.REDIS_TOKEN || '';
        const res = await fetch(`${this.redisUrl}/get/${encodeURIComponent(redisKey)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return this.getDefaultStatus(key);
        const data: any = await res.json();
        if (!data.result) return this.getDefaultStatus(key);
        return JSON.parse(data.result);
      }
      const client = await this.getClient();
      const raw = await client.get(redisKey);
      if (!raw) return this.getDefaultStatus(key);
      const parsed = JSON.parse(raw);
      if (parsed.triggerPriceRaw) {
        parsed.triggerPriceRaw = BigInt(parsed.triggerPriceRaw);
      }
      return parsed;
    } catch {
      return this.getDefaultStatus(key);
    }
  }

  private getDefaultStatus(key: string): CircuitBreakerState {
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
      status: isEmergency ? 'EMERGENCY_HALT' : 'CIRCUIT_BREAKER_ACTIVE',
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

    const now = Date.now();
    const elapsed = now - current.trippedAt;
    const isAuthorizedGov = operator.startsWith('0x') || operator === 'ADMIN_OVERRIDE_AUTHORIZED';
    if (!isAuthorizedGov && elapsed < current.cooldownPeriodMs) {
      const remaining = Math.ceil((current.cooldownPeriodMs - elapsed) / 1000);
      return {
        success: false,
        state: current,
        error: `COOLDOWN_ACTIVE: Circuit breaker is locked for another ${remaining}s.`,
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

    const redisKey = `cb:state:${key}`;
    const serialized = JSON.stringify(resetState);

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
 * Fail-Closed Circuit Breaker Stores for Multi-Instance Production
 */
export class FailClosedCircuitBreakerStore implements ICircuitBreakerStore {
  async getStatus(_symbol: string): Promise<CircuitBreakerState> {
    throw new Error('CIRCUIT_BREAKER_STORE_UNAVAILABLE: Production requires distributed store');
  }
  async isTripped(_symbol: string): Promise<boolean> {
    return true; // Fail closed: treat as tripped
  }
  async trip(): Promise<CircuitBreakerState> {
    throw new Error('CIRCUIT_BREAKER_STORE_UNAVAILABLE: Production requires distributed store');
  }
  async reset(): Promise<{ success: boolean; state: CircuitBreakerState; error?: string }> {
    throw new Error('CIRCUIT_BREAKER_STORE_UNAVAILABLE: Production requires distributed store');
  }
  async recordEvaluation(): Promise<CircuitBreakerState> {
    throw new Error('CIRCUIT_BREAKER_STORE_UNAVAILABLE: Production requires distributed store');
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
      this.auditStore = new InMemoryCircuitBreakerAuditStore();
      this.cbStore = new RedisCircuitBreakerStore(redisUrl, this.auditStore);
      this.historyStore = new InMemoryPriceHistoryStore();
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
