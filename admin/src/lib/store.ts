import { Redis } from '@upstash/redis';
import { logger } from './logger';
import type { DeviceToken, NotificationEvent, VersionConfig } from './types';

/**
 * Storage abstraction with two interchangeable drivers:
 *
 *   1. Upstash Redis (durable)  — used when REST creds are present in env. Works
 *      with both Upstash-native (`UPSTASH_REDIS_REST_*`) and Vercel KV /
 *      Marketplace (`KV_REST_API_*`) variable names.
 *   2. In-memory Map (ephemeral) — automatic fallback when no creds are set.
 *      IMPORTANT: on Vercel this is per-lambda-instance and is wiped on cold
 *      start, so registered tokens and config edits are NOT durable. Fine for a
 *      quick local demo; attach a KV store for anything real. See ARCHITECTURE.md.
 *
 * All callers depend only on the `Store` interface, so swapping drivers never
 * touches route code.
 */

const KEYS = {
  tokens: 'swag:tokens', // hash: token -> JSON(DeviceToken)
  versionConfig: 'swag:version-config', // string: JSON(VersionConfig)
  events: 'swag:events', // hash: counter name -> count
} as const;

export interface Store {
  readonly driver: 'upstash' | 'memory';
  listTokens(): Promise<DeviceToken[]>;
  upsertToken(t: DeviceToken): Promise<void>;
  deleteToken(token: string): Promise<void>;
  getVersionConfig(): Promise<VersionConfig | null>;
  setVersionConfig(c: VersionConfig): Promise<void>;
  recordEvent(e: NotificationEvent): Promise<void>;
  getEventCounts(): Promise<Record<string, number>>;
}

// ── Upstash driver ───────────────────────────────────────────────────────────
function makeUpstashStore(redis: Redis): Store {
  const parse = (raw: unknown): DeviceToken | null => {
    if (raw == null) return null;
    // Upstash auto-deserializes JSON; older payloads may still be strings.
    if (typeof raw === 'string') {
      try {
        return JSON.parse(raw) as DeviceToken;
      } catch {
        return null;
      }
    }
    return raw as DeviceToken;
  };

  return {
    driver: 'upstash',
    async listTokens() {
      const map = await redis.hgetall<Record<string, unknown>>(KEYS.tokens);
      if (!map) return [];
      return Object.values(map)
        .map(parse)
        .filter((t): t is DeviceToken => t !== null)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    },
    async upsertToken(t) {
      await redis.hset(KEYS.tokens, { [t.token]: JSON.stringify(t) });
    },
    async deleteToken(token) {
      await redis.hdel(KEYS.tokens, token);
    },
    async getVersionConfig() {
      const raw = await redis.get<string | VersionConfig>(KEYS.versionConfig);
      if (raw == null) return null;
      return typeof raw === 'string' ? (JSON.parse(raw) as VersionConfig) : raw;
    },
    async setVersionConfig(c) {
      await redis.set(KEYS.versionConfig, JSON.stringify(c));
    },
    async recordEvent(e) {
      const field = e.type === 'opened' ? `opened:${e.screen ?? 'unknown'}` : e.type;
      await redis.hincrby(KEYS.events, field, 1);
    },
    async getEventCounts() {
      const map = await redis.hgetall<Record<string, number>>(KEYS.events);
      return map ?? {};
    },
  };
}

// ── In-memory driver (ephemeral fallback) ────────────────────────────────────
interface MemoryState {
  tokens: Map<string, DeviceToken>;
  versionConfig: VersionConfig | null;
  events: Map<string, number>;
}

// Persist across Next.js dev HMR reloads via globalThis so tokens don't vanish
// on every hot-reload while developing.
const g = globalThis as typeof globalThis & { __swagMemoryStore?: MemoryState };
function memoryState(): MemoryState {
  if (!g.__swagMemoryStore) {
    g.__swagMemoryStore = { tokens: new Map(), versionConfig: null, events: new Map() };
  }
  return g.__swagMemoryStore;
}

function makeMemoryStore(): Store {
  return {
    driver: 'memory',
    async listTokens() {
      return Array.from(memoryState().tokens.values()).sort((a, b) =>
        b.updatedAt.localeCompare(a.updatedAt),
      );
    },
    async upsertToken(t) {
      memoryState().tokens.set(t.token, t);
    },
    async deleteToken(token) {
      memoryState().tokens.delete(token);
    },
    async getVersionConfig() {
      return memoryState().versionConfig;
    },
    async setVersionConfig(c) {
      memoryState().versionConfig = c;
    },
    async recordEvent(e) {
      const field = e.type === 'opened' ? `opened:${e.screen ?? 'unknown'}` : e.type;
      const events = memoryState().events;
      events.set(field, (events.get(field) ?? 0) + 1);
    },
    async getEventCounts() {
      return Object.fromEntries(memoryState().events);
    },
  };
}

// ── Driver selection (singleton) ─────────────────────────────────────────────
let cached: Store | null = null;

export function getStore(): Store {
  if (cached) return cached;

  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;

  if (url && token) {
    try {
      cached = makeUpstashStore(new Redis({ url, token }));
      logger.info('Store driver: upstash');
      return cached;
    } catch (err) {
      // Bad creds shouldn't take the whole panel down — degrade to memory.
      logger.error('Upstash init failed; falling back to in-memory store.', err);
    }
  } else {
    logger.warn('No KV creds — using in-memory store (ephemeral, per-instance).');
  }

  cached = makeMemoryStore();
  return cached;
}
