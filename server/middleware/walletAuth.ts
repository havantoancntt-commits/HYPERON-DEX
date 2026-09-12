import { Request, Response, NextFunction } from 'express';
import { verifyMessage, verifyTypedData, isAddress, Address, Hex } from 'viem';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import pg from 'pg';
import Redis from 'ioredis';

export interface WalletAuthPayload {
  userAddress: string;
  signature?: string;
  authMessage?: string;
  authNonce?: string;
  authTimestamp?: number;
}

export interface NonceRecord {
  nonce: string;
  userAddress: string;
  expiresAt: number;
  used: boolean;
  issuedAt: number;
  chainId: string;
  domain?: string;
  action?: string;
}

export interface INonceStore {
  get(key: string): Promise<NonceRecord | null> | NonceRecord | null;
  set(key: string, record: NonceRecord): Promise<void> | void;
  markUsed(key: string): Promise<boolean> | boolean;
  delete(key: string): Promise<void> | void;
  prune(): Promise<void> | void;
}

export type IDistributedNonceStore = INonceStore;

/**
 * Thread-safe atomic in-memory nonce store.
 * Provides atomic CAS (check-and-set) operations and automatic expiration pruning.
 */
export class MemoryAtomicNonceStore implements INonceStore {
  private cache: Map<string, NonceRecord> = new Map();

  get(key: string): NonceRecord | null {
    const record = this.cache.get(key);
    if (!record) return null;
    if (Date.now() > record.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return record;
  }

  set(key: string, record: NonceRecord): void {
    this.cache.set(key, { ...record });
  }

  markUsed(key: string): boolean {
    const record = this.cache.get(key);
    if (!record || record.used || Date.now() > record.expiresAt) {
      return false;
    }
    record.used = true;
    return true;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  prune(): void {
    const now = Date.now();
    for (const [key, record] of this.cache.entries()) {
      if (record.expiresAt < now || record.used) {
        this.cache.delete(key);
      }
    }
  }
}

/**
 * Production Durable Nonce Store with write-through disk persistence
 * and in-memory atomic cache for multi-tick integrity.
 */
export class DurableNonceStore implements INonceStore {
  private cache: Map<string, NonceRecord> = new Map();
  private storagePath: string;

  constructor(filePath?: string) {
    this.storagePath = filePath || path.resolve('.data', 'nonces.json');
    this.init();
  }

  private init(): void {
    try {
      const dir = path.dirname(this.storagePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      if (fs.existsSync(this.storagePath)) {
        const raw = fs.readFileSync(this.storagePath, 'utf8');
        const data = JSON.parse(raw);
        if (Array.isArray(data)) {
          const now = Date.now();
          for (const item of data) {
            if (item.expiresAt > now && !item.used) {
              this.cache.set(`${item.userAddress.toLowerCase()}:${item.nonce}`, item);
            }
          }
        }
      }
    } catch {
      // Fallback to in-memory if disk is restricted
    }
  }

  private persist(): void {
    try {
      const records = Array.from(this.cache.values());
      fs.writeFileSync(this.storagePath, JSON.stringify(records, null, 2), 'utf8');
    } catch {
      // Best-effort disk persistence
    }
  }

  get(key: string): NonceRecord | null {
    const rec = this.cache.get(key);
    if (!rec) return null;
    if (Date.now() > rec.expiresAt) {
      this.cache.delete(key);
      this.persist();
      return null;
    }
    return rec;
  }

  set(key: string, record: NonceRecord): void {
    this.cache.set(key, { ...record });
    this.persist();
  }

  markUsed(key: string): boolean {
    const rec = this.cache.get(key);
    if (!rec || rec.used || Date.now() > rec.expiresAt) {
      return false;
    }
    rec.used = true;
    this.persist();
    return true;
  }

  delete(key: string): void {
    this.cache.delete(key);
    this.persist();
  }

  prune(): void {
    const now = Date.now();
    let modified = false;
    for (const [k, v] of this.cache.entries()) {
      if (v.expiresAt < now || v.used) {
        this.cache.delete(k);
        modified = true;
      }
    }
    if (modified) {
      this.persist();
    }
  }
}

/**
 * Real Distributed Nonce Store Implementation for Redis (ioredis / REST / Upstash)
 * Supports atomic setnx and CAS consumption across multi-instance clusters.
 * Enforces fail-closed semantics: NO silent fallback to process memory in production.
 */
export class RedisDistributedNonceStore implements INonceStore {
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
    if (!this.client) {
      throw new Error('REDIS_CLIENT_UNAVAILABLE: Not a direct TCP/TLS Redis connection');
    }
    if (this.client.status === 'wait') {
      await this.client.connect();
    }
    return this.client;
  }

  async get(key: string): Promise<NonceRecord | null> {
    try {
      if (this.isRest) {
        const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.REDIS_TOKEN || '';
        const res = await fetch(`${this.redisUrl}/get/${encodeURIComponent(key)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return null;
        const data: any = await res.json();
        return data.result ? JSON.parse(data.result) : null;
      }
      const client = await this.getClient();
      const raw = await client.get(key);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (err: any) {
      throw new Error(`REDIS_NONCE_READ_FAILED: ${err?.message || 'Cluster error'}`);
    }
  }

  async set(key: string, record: NonceRecord): Promise<void> {
    try {
      const ttlSec = Math.max(1, Math.ceil((record.expiresAt - Date.now()) / 1000));
      const payload = JSON.stringify(record);

      if (this.isRest) {
        const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.REDIS_TOKEN || '';
        const res = await fetch(
          `${this.redisUrl}/set/${encodeURIComponent(key)}/${encodeURIComponent(payload)}?ex=${ttlSec}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res.ok) {
          throw new Error(`Upstash returned HTTP ${res.status}`);
        }
        return;
      }
      const client = await this.getClient();
      await client.set(key, payload, 'EX', ttlSec);
    } catch (err: any) {
      throw new Error(`REDIS_NONCE_WRITE_FAILED: ${err?.message || 'Cluster error'}`);
    }
  }

  async markUsed(key: string): Promise<boolean> {
    try {
      const luaScript = `
        local r = redis.call('GET', KEYS[1])
        if not r then return 0 end
        local d = cjson.decode(r)
        if d.used or (d.expiresAt and tonumber(d.expiresAt) < tonumber(ARGV[1])) then
          return 0
        end
        d.used = true
        redis.call('SET', KEYS[1], cjson.encode(d), 'KEEPTTL')
        return 1
      `;
      const nowMs = Date.now().toString();

      if (this.isRest) {
        const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.REDIS_TOKEN || '';
        const res = await fetch(`${this.redisUrl}/eval`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ script: luaScript, keys: [key], args: [nowMs] }),
        });
        if (!res.ok) return false;
        const data: any = await res.json();
        return data.result === 1;
      }

      const client = await this.getClient();
      const res = await client.eval(luaScript, 1, key, nowMs);
      return res === 1;
    } catch (err: any) {
      throw new Error(`REDIS_NONCE_CAS_FAILED: ${err?.message || 'Cluster error'}`);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      if (this.isRest) {
        const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.REDIS_TOKEN || '';
        await fetch(`${this.redisUrl}/del/${encodeURIComponent(key)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        return;
      }
      const client = await this.getClient();
      await client.del(key);
    } catch {
      // Best-effort delete
    }
  }

  async prune(): Promise<void> {
    // Redis automatically prunes expired keys using native TTL (EX flag)
  }
}

/**
 * Real Distributed Nonce Store Implementation for PostgreSQL / Supabase
 * Enforces atomic UPDATE ... WHERE used = FALSE and row-level locks for CAS consumption.
 * Enforces fail-closed semantics: NO silent fallback to process memory in production.
 */
export class PostgresDistributedNonceStore implements INonceStore {
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
            CREATE TABLE IF NOT EXISTS wallet_nonces (
              wallet_address VARCHAR(42) NOT NULL,
              chain_id VARCHAR(32) NOT NULL,
              nonce VARCHAR(64) NOT NULL,
              expires_at BIGINT NOT NULL,
              used BOOLEAN NOT NULL DEFAULT FALSE,
              issued_at BIGINT NOT NULL,
              action VARCHAR(64),
              domain VARCHAR(128),
              PRIMARY KEY (wallet_address, nonce)
            );
            CREATE INDEX IF NOT EXISTS idx_wallet_nonces_exp ON wallet_nonces (expires_at);
          `);
          this.initialized = true;
        } finally {
          client.release();
        }
      })();
    }
    return this.initPromise;
  }

  async get(key: string): Promise<NonceRecord | null> {
    try {
      await this.ensureInitialized();
      const parts = key.split(':');
      if (parts.length < 2) return null;
      const walletAddress = parts[0].toLowerCase();
      const nonce = parts.slice(1).join(':');

      const res = await this.pool.query(
        `SELECT wallet_address, chain_id, nonce, expires_at, used, issued_at, action, domain
         FROM wallet_nonces
         WHERE wallet_address = $1 AND nonce = $2`,
        [walletAddress, nonce]
      );
      if (res.rows.length === 0) return null;
      const r = res.rows[0];
      return {
        userAddress: r.wallet_address,
        chainId: r.chain_id,
        nonce: r.nonce,
        expiresAt: Number(r.expires_at),
        used: Boolean(r.used),
        issuedAt: Number(r.issued_at),
        action: r.action || undefined,
        domain: r.domain || undefined,
      };
    } catch (err: any) {
      throw new Error(`POSTGRES_NONCE_READ_FAILED: ${err?.message || 'Database error'}`);
    }
  }

  async set(key: string, record: NonceRecord): Promise<void> {
    try {
      await this.ensureInitialized();
      await this.pool.query(
        `INSERT INTO wallet_nonces (wallet_address, chain_id, nonce, expires_at, used, issued_at, action, domain)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (wallet_address, nonce)
         DO UPDATE SET
           chain_id = EXCLUDED.chain_id,
           expires_at = EXCLUDED.expires_at,
           used = EXCLUDED.used,
           issued_at = EXCLUDED.issued_at,
           action = EXCLUDED.action,
           domain = EXCLUDED.domain`,
        [
          record.userAddress.toLowerCase(),
          record.chainId,
          record.nonce,
          record.expiresAt,
          record.used,
          record.issuedAt,
          record.action || null,
          record.domain || null,
        ]
      );
    } catch (err: any) {
      throw new Error(`POSTGRES_NONCE_WRITE_FAILED: ${err?.message || 'Database error'}`);
    }
  }

  async markUsed(key: string): Promise<boolean> {
    try {
      await this.ensureInitialized();
      const parts = key.split(':');
      if (parts.length < 2) return false;
      const walletAddress = parts[0].toLowerCase();
      const nonce = parts.slice(1).join(':');
      const now = Date.now();

      // Atomic UPDATE with row-level lock where used = FALSE and not expired
      // Guarantees exactly 1 successful execution under arbitrary multi-process concurrency
      const res = await this.pool.query(
        `UPDATE wallet_nonces
         SET used = TRUE
         WHERE wallet_address = $1 AND nonce = $2 AND used = FALSE AND expires_at > $3
         RETURNING wallet_address`,
        [walletAddress, nonce, now]
      );
      return (res.rowCount ?? 0) === 1;
    } catch (err: any) {
      throw new Error(`POSTGRES_NONCE_CAS_FAILED: ${err?.message || 'Database error'}`);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.ensureInitialized();
      const parts = key.split(':');
      if (parts.length < 2) return;
      const walletAddress = parts[0].toLowerCase();
      const nonce = parts.slice(1).join(':');
      await this.pool.query(
        `DELETE FROM wallet_nonces WHERE wallet_address = $1 AND nonce = $2`,
        [walletAddress, nonce]
      );
    } catch {
      // Best-effort delete
    }
  }

  async prune(): Promise<void> {
    try {
      await this.ensureInitialized();
      const now = Date.now();
      await this.pool.query(`DELETE FROM wallet_nonces WHERE expires_at < $1 OR used = TRUE`, [now]);
    } catch {
      // Background prune error handled
    }
  }
}

/**
 * Fail-Closed Nonce Store for Multi-Instance Production.
 * If Redis/PostgreSQL is unconfigured in production, authentication fails closed with explicit 503.
 */
export class FailClosedNonceStore implements INonceStore {
  get(_key: string): NonceRecord | null {
    throw new Error(
      'NONCE_STORE_UNAVAILABLE: Multi-instance production requires a verified distributed persistent store (Redis via REDIS_URL or PostgreSQL via DATABASE_URL). Authentication fails closed.'
    );
  }
  set(_key: string, _record: NonceRecord): void {
    throw new Error(
      'NONCE_STORE_UNAVAILABLE: Multi-instance production requires a verified distributed persistent store (Redis via REDIS_URL or PostgreSQL via DATABASE_URL). Authentication fails closed.'
    );
  }
  markUsed(_key: string): boolean {
    throw new Error(
      'NONCE_STORE_UNAVAILABLE: Multi-instance production requires a verified distributed persistent store (Redis via REDIS_URL or PostgreSQL via DATABASE_URL). Authentication fails closed.'
    );
  }
  delete(_key: string): void {}
  prune(): void {}
}

/**
 * Distributed Nonce Store Adapter for multi-instance clusters.
 * Enforces strict fail-closed behavior when running in production.
 * In production: strictly requires REDIS_URL or DATABASE_URL; fails closed otherwise.
 * In development / test: utilizes local persistent store with explicit warning.
 */
export class DistributedNonceStoreAdapter implements INonceStore {
  private activeStore: INonceStore;
  public readonly mode: 'DISTRIBUTED_REDIS' | 'DISTRIBUTED_POSTGRES' | 'DEV_LOCAL_STORE' | 'FAIL_CLOSED';

  constructor(options?: { forceStore?: INonceStore }) {
    if (options?.forceStore) {
      this.activeStore = options.forceStore;
      this.mode = 'DEV_LOCAL_STORE';
      return;
    }

    const isProduction =
      process.env.NODE_ENV === 'production' ||
      process.env.REQUIRE_DISTRIBUTED_NONCE_STORE === 'true';

    const redisUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.REDIS_URL;
    const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;

    if (redisUrl) {
      this.activeStore = new RedisDistributedNonceStore(redisUrl);
      this.mode = 'DISTRIBUTED_REDIS';
    } else if (dbUrl) {
      this.activeStore = new PostgresDistributedNonceStore(dbUrl);
      this.mode = 'DISTRIBUTED_POSTGRES';
    } else if (isProduction) {
      // Production without distributed store: fail-closed at runtime rather than crashing module import
      this.activeStore = new FailClosedNonceStore();
      this.mode = 'FAIL_CLOSED';
    } else {
      this.activeStore = new DurableNonceStore();
      this.mode = 'DEV_LOCAL_STORE';
    }
  }

  get(key: string): Promise<NonceRecord | null> | NonceRecord | null {
    return this.activeStore.get(key);
  }

  set(key: string, record: NonceRecord): Promise<void> | void {
    return this.activeStore.set(key, record);
  }

  markUsed(key: string): Promise<boolean> | boolean {
    return this.activeStore.markUsed(key);
  }

  delete(key: string): Promise<void> | void {
    return this.activeStore.delete(key);
  }

  prune(): Promise<void> | void {
    return this.activeStore.prune();
  }
}

/**
 * Dedicated Store for tracking EIP-712 Relay Swap commitments and preventing nonce replay
 */
export interface IRelayNonceStore {
  isNonceUsed(chainId: string | number, verifyingContract: string, user: string, nonce: bigint): Promise<boolean> | boolean;
  consume(chainId: string | number, verifyingContract: string, user: string, nonce: bigint): Promise<boolean> | boolean;
  delete(chainId: string | number, verifyingContract: string, user: string, nonce: bigint): Promise<void> | void;
}

export class MemoryRelayNonceStore implements IRelayNonceStore {
  private consumedNonces: Set<string> = new Set();

  private buildKey(chainId: string | number, verifyingContract: string, user: string, nonce: bigint): string {
    return `${chainId}:${verifyingContract.toLowerCase()}:${user.toLowerCase()}:${nonce.toString()}`;
  }

  isNonceUsed(chainId: string | number, verifyingContract: string, user: string, nonce: bigint): boolean {
    return this.consumedNonces.has(this.buildKey(chainId, verifyingContract, user, nonce));
  }

  consume(chainId: string | number, verifyingContract: string, user: string, nonce: bigint): boolean {
    const key = this.buildKey(chainId, verifyingContract, user, nonce);
    if (this.consumedNonces.has(key)) {
      return false;
    }
    this.consumedNonces.add(key);
    return true;
  }

  delete(chainId: string | number, verifyingContract: string, user: string, nonce: bigint): void {
    this.consumedNonces.delete(this.buildKey(chainId, verifyingContract, user, nonce));
  }
}

/**
 * Redis-backed distributed store for EIP-712 relay nonces
 */
export class RedisRelayNonceStore implements IRelayNonceStore {
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
    if (!this.client) {
      throw new Error('REDIS_CLIENT_UNAVAILABLE: Not a direct TCP/TLS Redis connection');
    }
    if (this.client.status === 'wait') {
      await this.client.connect();
    }
    return this.client;
  }

  private buildKey(chainId: string | number, verifyingContract: string, user: string, nonce: bigint): string {
    return `relay:${chainId}:${verifyingContract.toLowerCase()}:${user.toLowerCase()}:${nonce.toString()}`;
  }

  async isNonceUsed(chainId: string | number, verifyingContract: string, user: string, nonce: bigint): Promise<boolean> {
    const key = this.buildKey(chainId, verifyingContract, user, nonce);
    try {
      if (this.isRest) {
        const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.REDIS_TOKEN || '';
        const res = await fetch(`${this.redisUrl}/get/${encodeURIComponent(key)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return true; // fail closed
        const data: any = await res.json();
        return data.result !== null;
      }
      const client = await this.getClient();
      const val = await client.get(key);
      return val !== null;
    } catch {
      return true; // fail closed
    }
  }

  async consume(chainId: string | number, verifyingContract: string, user: string, nonce: bigint): Promise<boolean> {
    const key = this.buildKey(chainId, verifyingContract, user, nonce);
    try {
      if (this.isRest) {
        const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.REDIS_TOKEN || '';
        const res = await fetch(`${this.redisUrl}/set/${encodeURIComponent(key)}/1?nx&ex=86400`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return false;
        const data: any = await res.json();
        return data.result === 'OK';
      }
      const client = await this.getClient();
      const res = await client.set(key, '1', 'EX', 86400, 'NX');
      return res === 'OK';
    } catch {
      return false; // fail closed
    }
  }

  async delete(chainId: string | number, verifyingContract: string, user: string, nonce: bigint): Promise<void> {
    const key = this.buildKey(chainId, verifyingContract, user, nonce);
    try {
      if (this.isRest) {
        const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.REDIS_TOKEN || '';
        await fetch(`${this.redisUrl}/del/${encodeURIComponent(key)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        const client = await this.getClient();
        await client.del(key);
      }
    } catch {
      // Best-effort delete
    }
  }
}

/**
 * PostgreSQL-backed distributed store for EIP-712 relay nonces
 */
export class PostgresRelayNonceStore implements IRelayNonceStore {
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
            CREATE TABLE IF NOT EXISTS relay_nonces (
              chain_id VARCHAR(32) NOT NULL,
              verifying_contract VARCHAR(42) NOT NULL,
              user_address VARCHAR(42) NOT NULL,
              nonce VARCHAR(78) NOT NULL,
              consumed_at BIGINT NOT NULL,
              PRIMARY KEY (chain_id, verifying_contract, user_address, nonce)
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

  async isNonceUsed(chainId: string | number, verifyingContract: string, user: string, nonce: bigint): Promise<boolean> {
    try {
      await this.ensureInitialized();
      const res = await this.pool.query(
        `SELECT 1 FROM relay_nonces
         WHERE chain_id = $1 AND verifying_contract = $2 AND user_address = $3 AND nonce = $4`,
        [String(chainId), verifyingContract.toLowerCase(), user.toLowerCase(), nonce.toString()]
      );
      return (res.rowCount ?? 0) > 0;
    } catch {
      return true; // fail closed
    }
  }

  async consume(chainId: string | number, verifyingContract: string, user: string, nonce: bigint): Promise<boolean> {
    try {
      await this.ensureInitialized();
      const res = await this.pool.query(
        `INSERT INTO relay_nonces (chain_id, verifying_contract, user_address, nonce, consumed_at)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (chain_id, verifying_contract, user_address, nonce) DO NOTHING
         RETURNING nonce`,
        [String(chainId), verifyingContract.toLowerCase(), user.toLowerCase(), nonce.toString(), Date.now()]
      );
      return (res.rowCount ?? 0) === 1;
    } catch {
      return false; // fail closed
    }
  }

  async delete(chainId: string | number, verifyingContract: string, user: string, nonce: bigint): Promise<void> {
    try {
      await this.ensureInitialized();
      await this.pool.query(
        `DELETE FROM relay_nonces
         WHERE chain_id = $1 AND verifying_contract = $2 AND user_address = $3 AND nonce = $4`,
        [String(chainId), verifyingContract.toLowerCase(), user.toLowerCase(), nonce.toString()]
      );
    } catch {
      // Best-effort delete
    }
  }
}

/**
 * Fail-Closed Relay Nonce Store for production without distributed backend
 */
export class FailClosedRelayNonceStore implements IRelayNonceStore {
  isNonceUsed(_chainId: string | number, _verifyingContract: string, _user: string, _nonce: bigint): boolean {
    return true; // fail closed: all nonces treated as consumed
  }
  consume(_chainId: string | number, _verifyingContract: string, _user: string, _nonce: bigint): boolean {
    throw new Error(
      'RELAY_NONCE_STORE_UNAVAILABLE: Production requires a verified distributed persistent store for relay nonces. Relaying fails closed.'
    );
  }
  delete(_chainId: string | number, _verifyingContract: string, _user: string, _nonce: bigint): void {}
}

/**
 * Distributed Relay Nonce Store Adapter for multi-container production environments
 */
export class DistributedRelayNonceStoreAdapter implements IRelayNonceStore {
  private activeStore: IRelayNonceStore;

  constructor(options?: { forceStore?: IRelayNonceStore }) {
    if (options?.forceStore) {
      this.activeStore = options.forceStore;
      return;
    }

    const isProduction =
      process.env.NODE_ENV === 'production' ||
      process.env.REQUIRE_DISTRIBUTED_NONCE_STORE === 'true';

    const redisUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.REDIS_URL;
    const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;

    if (redisUrl) {
      this.activeStore = new RedisRelayNonceStore(redisUrl);
    } else if (dbUrl) {
      this.activeStore = new PostgresRelayNonceStore(dbUrl);
    } else if (isProduction) {
      this.activeStore = new FailClosedRelayNonceStore();
    } else {
      this.activeStore = new MemoryRelayNonceStore();
    }
  }

  isNonceUsed(chainId: string | number, verifyingContract: string, user: string, nonce: bigint): Promise<boolean> | boolean {
    return this.activeStore.isNonceUsed(chainId, verifyingContract, user, nonce);
  }

  consume(chainId: string | number, verifyingContract: string, user: string, nonce: bigint): Promise<boolean> | boolean {
    return this.activeStore.consume(chainId, verifyingContract, user, nonce);
  }

  delete(chainId: string | number, verifyingContract: string, user: string, nonce: bigint): Promise<void> | void {
    return this.activeStore.delete(chainId, verifyingContract, user, nonce);
  }
}

export const nonceStore: INonceStore = new DistributedNonceStoreAdapter();
export const relayNonceStore: IRelayNonceStore = new DistributedRelayNonceStoreAdapter();
const NONCE_TTL_MS = 5 * 60 * 1000; // 5 minutes validity
export const DEFAULT_AUTH_DOMAIN = 'hyperon.dex';

const cleanupTimer = setInterval(() => nonceStore.prune(), 60 * 1000);
if (cleanupTimer && typeof cleanupTimer.unref === 'function') {
  cleanupTimer.unref();
}

/**
 * Issues a cryptographically random, single-use nonce bound to userAddress, chainId, and domain.
 */
export function issueWalletNonce(
  userAddress: string,
  chainId: string = 'ethereum',
  domain: string = DEFAULT_AUTH_DOMAIN,
  action: string = 'AUTHENTICATE_SESSION'
): {
  nonce: string;
  expiresAt: number;
  authMessage: string;
  domain: string;
  chainId: string;
} {
  if (!userAddress || !isAddress(userAddress)) {
    throw new Error('INVALID_ADDRESS: Must provide a valid EVM address to issue nonce');
  }

  const normalized = userAddress.toLowerCase();
  const nonce = `hyp_${crypto.randomBytes(16).toString('hex')}`;
  const now = Date.now();
  const expiresAt = now + NONCE_TTL_MS;

  const record: NonceRecord = {
    nonce,
    userAddress: normalized,
    expiresAt,
    used: false,
    issuedAt: now,
    chainId: chainId.toLowerCase(),
    domain,
    action,
  };

  nonceStore.set(`${normalized}:${nonce}`, record);

  const authMessage = buildWalletAuthMessage(userAddress, action, nonce, now, chainId, domain);

  return {
    nonce,
    expiresAt,
    authMessage,
    domain,
    chainId,
  };
}

/**
 * Standard SIWE / EIP-4361 Auth Message Builder
 */
export function buildWalletAuthMessage(
  userAddress: string,
  action: string,
  nonce: string,
  timestamp: number,
  chainId: string = 'ethereum',
  domain: string = DEFAULT_AUTH_DOMAIN
): string {
  return [
    `${domain} wants you to sign in with your Ethereum account:`,
    userAddress,
    '',
    `HYPERON-DEX Non-Custodial Protocol Authorization`,
    '',
    `URI: https://${domain}`,
    `Version: 1`,
    `Chain ID: ${chainId}`,
    `Nonce: ${nonce}`,
    `Action: ${action}`,
    `Issued At: ${new Date(timestamp).toISOString()}`,
    `Expiration Time: ${new Date(timestamp + NONCE_TTL_MS).toISOString()}`,
    '',
    'Signing this message will not trigger a blockchain transaction or cost any gas.',
  ].join('\n');
}

export interface ParsedAuthMessage {
  domain?: string;
  address?: string;
  nonce?: string;
  chainId?: string;
  action?: string;
  issuedAt?: number;
  expirationTime?: number;
}

export function parseAuthMessage(msg: string): ParsedAuthMessage {
  const parsed: ParsedAuthMessage = {};

  const domainMatch = msg.match(/^([a-zA-Z0-9.-]+)\s+wants you to sign in/i);
  if (domainMatch) parsed.domain = domainMatch[1];

  const nonceMatch = msg.match(/Nonce:\s*([^\r\n]+)/i);
  if (nonceMatch) parsed.nonce = nonceMatch[1].trim();

  const chainMatch = msg.match(/Chain ID:\s*([^\r\n]+)/i);
  if (chainMatch) parsed.chainId = chainMatch[1].trim().toLowerCase();

  const actionMatch = msg.match(/Action:\s*([^\r\n]+)/i);
  if (actionMatch) parsed.action = actionMatch[1].trim();

  const issuedMatch = msg.match(/Issued At:\s*([^\r\n]+)/i);
  if (issuedMatch) {
    const t = Date.parse(issuedMatch[1].trim());
    if (!isNaN(t)) parsed.issuedAt = t;
  }

  const expMatch = msg.match(/Expiration Time:\s*([^\r\n]+)/i);
  if (expMatch) {
    const t = Date.parse(expMatch[1].trim());
    if (!isNaN(t)) parsed.expirationTime = t;
  }

  const addrMatch = msg.match(/(0x[a-fA-F0-9]{40})/);
  if (addrMatch) parsed.address = addrMatch[1];

  return parsed;
}

/**
 * Validates cryptographic wallet signatures for authenticated actions.
 * Enforces:
 * 1. Valid EVM address
 * 2. Non-empty signature and message
 * 3. Mandatory, registered, unexpired, unused nonce (replay attack prevention)
 * 4. User address binding (message address == claimed address)
 * 5. Domain, chainId, and action consistency
 * 6. Exact ECDSA verification via viem verifyMessage
 * 7. Immediate consumption of nonce upon success
 */
export async function verifyWalletAuth(
  userAddressOrParams:
    | string
    | {
        address: string;
        signature: string;
        message?: string;
        authMessage?: string;
        nonce?: string;
        authNonce?: string;
        expectedAction?: string;
        expectedChainId?: string;
        expectedDomain?: string;
      },
  paramSignature?: string,
  paramAuthMessage?: string,
  paramAuthNonce?: string,
  expectedAction?: string,
  expectedChainId?: string,
  expectedDomain?: string
): Promise<{ verified: boolean; code?: string; reason?: string }> {
  let userAddress: string;
  let signature: string;
  let authMessage: string;
  let authNonce: string | undefined;
  let actionExpected = expectedAction;
  let chainExpected = expectedChainId;
  let domainExpected = expectedDomain;

  if (typeof userAddressOrParams === 'string') {
    userAddress = userAddressOrParams;
    signature = paramSignature || '';
    authMessage = paramAuthMessage || '';
    authNonce = paramAuthNonce;
  } else {
    userAddress = userAddressOrParams.address;
    signature = userAddressOrParams.signature;
    authMessage = userAddressOrParams.authMessage || userAddressOrParams.message || '';
    authNonce = userAddressOrParams.authNonce || userAddressOrParams.nonce;
    actionExpected = userAddressOrParams.expectedAction || expectedAction;
    chainExpected = userAddressOrParams.expectedChainId || expectedChainId;
    domainExpected = userAddressOrParams.expectedDomain || expectedDomain;
  }

  if (!userAddress || !isAddress(userAddress)) {
    return { verified: false, code: 'INVALID_ADDRESS', reason: 'INVALID_ADDRESS: Invalid EVM address' };
  }

  if (!signature || typeof signature !== 'string' || !signature.startsWith('0x')) {
    return { verified: false, code: 'SIGNATURE_REQUIRED', reason: 'SIGNATURE_REQUIRED: Missing or malformed cryptographic signature' };
  }

  if (!authMessage || typeof authMessage !== 'string') {
    return { verified: false, code: 'AUTH_MESSAGE_REQUIRED', reason: 'AUTH_MESSAGE_REQUIRED: Missing authMessage payload' };
  }

  const normalized = userAddress.toLowerCase();
  const parsed = parseAuthMessage(authMessage);

  // 1. Address in message must match claimed address
  if (parsed.address && parsed.address.toLowerCase() !== normalized) {
    return { verified: false, code: 'ADDRESS_MISMATCH', reason: 'ADDRESS_MISMATCH: Message address does not match claimed signer' };
  }

  // 2. Extract and validate nonce
  const nonceToVerify = authNonce || parsed.nonce;
  if (!nonceToVerify) {
    return { verified: false, code: 'NONCE_REQUIRED', reason: 'NONCE_REQUIRED: Cryptographic auth requires single-use nonce' };
  }
  if (authNonce && parsed.nonce && authNonce !== parsed.nonce) {
    return { verified: false, code: 'NONCE_INVALID', reason: 'NONCE_INVALID: Submitted nonce does not match message nonce' };
  }

  const key = `${normalized}:${nonceToVerify}`;
  let record: NonceRecord | null;
  try {
    record = await nonceStore.get(key);
  } catch (err: any) {
    if (err?.message?.includes('NONCE_STORE_UNAVAILABLE')) {
      return { verified: false, code: 'AUTH_STORE_UNAVAILABLE', reason: err.message };
    }
    throw err;
  }

  if (!record) {
    return { verified: false, code: 'NONCE_INVALID', reason: 'NONCE_INVALID: Nonce not recognized or not found' };
  }

  if (record.userAddress.toLowerCase() !== normalized) {
    return { verified: false, code: 'ADDRESS_MISMATCH', reason: 'ADDRESS_MISMATCH: Stored nonce belongs to a different wallet' };
  }

  if (record.nonce !== nonceToVerify) {
    return { verified: false, code: 'NONCE_INVALID', reason: 'NONCE_INVALID: Stored nonce value does not match target' };
  }

  if (record.used) {
    return { verified: false, code: 'NONCE_ALREADY_USED', reason: 'NONCE_ALREADY_USED: Replay attack detected. Nonce was already consumed.' };
  }

  const now = Date.now();
  if (now > record.expiresAt) {
    await nonceStore.delete(key);
    return { verified: false, code: 'NONCE_EXPIRED', reason: 'NONCE_EXPIRED: Authentication session timed out' };
  }

  // 3. Chain ID Binding
  if (parsed.chainId && record.chainId && parsed.chainId.toLowerCase() !== record.chainId.toLowerCase()) {
    return { verified: false, code: 'CHAIN_MISMATCH', reason: `CHAIN_MISMATCH: Message chainId (${parsed.chainId}) does not match record chainId (${record.chainId})` };
  }
  if (chainExpected && parsed.chainId && parsed.chainId.toLowerCase() !== chainExpected.toLowerCase()) {
    return { verified: false, code: 'CHAIN_MISMATCH', reason: `CHAIN_MISMATCH: Message chainId (${parsed.chainId}) does not match expected chainId (${chainExpected})` };
  }
  if (chainExpected && record.chainId && record.chainId.toLowerCase() !== chainExpected.toLowerCase()) {
    return { verified: false, code: 'CHAIN_MISMATCH', reason: `CHAIN_MISMATCH: Stored chainId (${record.chainId}) does not match expected chainId (${chainExpected})` };
  }

  // 4. Domain Binding
  if (parsed.domain && record.domain && parsed.domain.toLowerCase() !== record.domain.toLowerCase()) {
    return { verified: false, code: 'DOMAIN_MISMATCH', reason: `DOMAIN_MISMATCH: Message domain (${parsed.domain}) does not match record domain (${record.domain})` };
  }
  if (domainExpected && parsed.domain && parsed.domain.toLowerCase() !== domainExpected.toLowerCase()) {
    return { verified: false, code: 'DOMAIN_MISMATCH', reason: `DOMAIN_MISMATCH: Message domain (${parsed.domain}) does not match expected domain (${domainExpected})` };
  }
  if (domainExpected && record.domain && record.domain.toLowerCase() !== domainExpected.toLowerCase()) {
    return { verified: false, code: 'DOMAIN_MISMATCH', reason: `DOMAIN_MISMATCH: Stored domain (${record.domain}) does not match expected domain (${domainExpected})` };
  }

  // 5. Action Binding
  if (parsed.action && record.action && parsed.action !== record.action) {
    return { verified: false, code: 'ACTION_MISMATCH', reason: `ACTION_MISMATCH: Message action (${parsed.action}) does not match record action (${record.action})` };
  }
  if (actionExpected && parsed.action && parsed.action !== actionExpected) {
    return { verified: false, code: 'ACTION_MISMATCH', reason: `ACTION_MISMATCH: Expected action ${actionExpected}, got ${parsed.action}` };
  }
  if (actionExpected && record.action && record.action !== actionExpected) {
    return { verified: false, code: 'ACTION_MISMATCH', reason: `ACTION_MISMATCH: Expected action ${actionExpected}, got record ${record.action}` };
  }

  // 6. Timestamp Validation
  if (!parsed.issuedAt || isNaN(parsed.issuedAt) || parsed.issuedAt <= 0) {
    return { verified: false, code: 'TIMESTAMP_INVALID', reason: 'TIMESTAMP_INVALID: Missing or invalid Issued At timestamp' };
  }
  if (parsed.issuedAt > now + 60000) {
    return { verified: false, code: 'TIMESTAMP_INVALID', reason: 'TIMESTAMP_INVALID: Issued At timestamp is in the future beyond clock skew tolerance' };
  }
  if (parsed.issuedAt < now - 24 * 60 * 60 * 1000) {
    return { verified: false, code: 'TIMESTAMP_INVALID', reason: 'TIMESTAMP_INVALID: Issued At timestamp is older than 24 hours' };
  }
  if (parsed.expirationTime) {
    if (isNaN(parsed.expirationTime) || parsed.expirationTime <= parsed.issuedAt) {
      return { verified: false, code: 'TIMESTAMP_INVALID', reason: 'TIMESTAMP_INVALID: Expiration time is invalid or prior to issue time' };
    }
    if (now > parsed.expirationTime) {
      return { verified: false, code: 'NONCE_EXPIRED', reason: 'NONCE_EXPIRED: Message expiration time has elapsed' };
    }
  }

  try {
    const isValid = await verifyMessage({
      address: userAddress as Address,
      message: authMessage,
      signature: signature as Hex,
    });

    if (!isValid) {
      return { verified: false, code: 'INVALID_SIGNATURE', reason: 'INVALID_SIGNATURE: Cryptographic signature does not match claimed address' };
    }

    // Atomic consumption of single-use nonce
    let marked: boolean;
    try {
      marked = await nonceStore.markUsed(key);
    } catch (err: any) {
      if (err?.message?.includes('NONCE_STORE_UNAVAILABLE')) {
        return { verified: false, code: 'AUTH_STORE_UNAVAILABLE', reason: err.message };
      }
      throw err;
    }
    if (!marked) {
      return { verified: false, code: 'NONCE_ALREADY_USED', reason: 'NONCE_ALREADY_USED: Race condition / replay detected during consumption' };
    }

    return { verified: true };
  } catch (err: any) {
    if (err?.message?.includes('NONCE_STORE_UNAVAILABLE')) {
      return { verified: false, code: 'AUTH_STORE_UNAVAILABLE', reason: err.message };
    }
    return { verified: false, code: 'INVALID_SIGNATURE', reason: `INVALID_SIGNATURE: ${err?.message || 'Verification error'}` };
  }
}

/**
 * Express Middleware strictly enforcing cryptographic wallet authentication for privileged endpoints.
 */
export async function requireWalletAuth(req: Request, res: Response, next: NextFunction) {
  const userAddress = req.body?.userAddress || (req.headers['x-wallet-address'] as string);
  const signature = req.body?.signature || (req.headers['authorization']?.replace(/^Bearer\s+/i, '') as string);
  const authMessage = req.body?.authMessage || (req.headers['x-auth-message'] as string);
  const authNonce = req.body?.authNonce || (req.headers['x-auth-nonce'] as string);

  if (!userAddress) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'USER_ADDRESS_REQUIRED',
        message: 'User wallet address is required for authenticated operation.',
        retryable: false,
      },
      code: 'USER_ADDRESS_REQUIRED',
      message: 'User wallet address is required for authenticated operation.',
    });
  }

  if (!isAddress(userAddress)) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_ADDRESS',
        message: 'Supplied address is not a valid EVM address.',
        retryable: false,
      },
      code: 'INVALID_ADDRESS',
      message: 'Supplied address is not a valid EVM address.',
    });
  }

  if (!signature || !authMessage) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'SIGNATURE_REQUIRED',
        message: 'Cryptographic signature and authMessage are strictly required for this endpoint.',
        retryable: false,
      },
      code: 'SIGNATURE_REQUIRED',
      message: 'Cryptographic signature and authMessage are strictly required for this endpoint.',
    });
  }

  const authResult = await verifyWalletAuth(userAddress, signature, authMessage, authNonce);
  if (!authResult.verified) {
    const errCode = authResult.code || 'UNAUTHORIZED_SIGNATURE';
    const isRetryable = errCode === 'NONCE_EXPIRED' || errCode === 'TIMESTAMP_INVALID';
    const httpStatus = errCode === 'AUTH_STORE_UNAVAILABLE' ? 503 : 401;
    return res.status(httpStatus).json({
      success: false,
      error: {
        code: errCode,
        message: authResult.reason || 'Cryptographic signature verification failed',
        retryable: isRetryable,
      },
      code: errCode,
      message: authResult.reason || 'Cryptographic signature verification failed',
    });
  }

  (req as any).authenticatedUser = userAddress.toLowerCase();
  next();
}

/**
 * EIP-712 Relay Swap Typed Data Schema & Verification
 */
export const RELAY_SWAP_TYPES = {
  RelaySwap: [
    { name: 'user', type: 'address' },
    { name: 'tokenIn', type: 'address' },
    { name: 'tokenOut', type: 'address' },
    { name: 'amountIn', type: 'uint256' },
    { name: 'amountOutMinimum', type: 'uint256' },
    { name: 'recipient', type: 'address' },
    { name: 'feeTier', type: 'uint24' },
    { name: 'routeHash', type: 'bytes32' },
    { name: 'deadline', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
  ],
} as const;

export interface RelaySwapMessage {
  user: Address;
  tokenIn: Address;
  tokenOut: Address;
  amountIn: bigint;
  amountOutMinimum: bigint;
  recipient: Address;
  feeTier: number;
  routeHash: Hex;
  deadline: bigint;
  nonce: bigint;
}

/**
 * Cryptographically verifies an EIP-712 relay swap signature against the verifying contract
 */
export async function verifyRelaySwapSignature(params: {
  message: RelaySwapMessage;
  signature: Hex;
  verifyingContract: Address;
  chainId: number;
}): Promise<{ verified: boolean; reason?: string }> {
  try {
    const nowEpoch = BigInt(Math.floor(Date.now() / 1000));
    if (params.message.deadline < nowEpoch) {
      return { verified: false, reason: 'EXPIRED_DEADLINE: Relay swap deadline has expired' };
    }

    if (params.message.tokenIn.toLowerCase() === params.message.tokenOut.toLowerCase()) {
      return { verified: false, reason: 'IDENTICAL_TOKENS: tokenIn and tokenOut cannot be identical' };
    }

    if (!isAddress(params.message.user) || !isAddress(params.message.recipient)) {
      return { verified: false, reason: 'INVALID_ADDRESS: user and recipient must be valid EVM addresses' };
    }

    const domain = {
      name: 'HyperonRouter',
      version: '1',
      chainId: params.chainId,
      verifyingContract: params.verifyingContract,
    } as const;

    const isValid = await verifyTypedData({
      address: params.message.user,
      domain,
      types: RELAY_SWAP_TYPES,
      primaryType: 'RelaySwap',
      message: params.message,
      signature: params.signature,
    });

    if (!isValid) {
      return { verified: false, reason: 'INVALID_EIP712_SIGNATURE: Signature does not match message parameters' };
    }

    return { verified: true };
  } catch (err: any) {
    return { verified: false, reason: `EIP712_VERIFICATION_ERROR: ${err?.message || 'Signature parse error'}` };
  }
}
