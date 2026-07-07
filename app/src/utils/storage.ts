import { createMMKV } from 'react-native-mmkv';
import { logger } from './logger';

/**
 * Single shared MMKV instance — the app-wide persistence layer (user directive:
 * MMKV over AsyncStorage everywhere). Synchronous, so startup-path reads (e.g.
 * the version-gate's persisted dismissal) never add async ceremony.
 *
 * API verified against the installed react-native-mmkv v4 typings (v4 is a Nitro
 * module: `createMMKV()` factory, `remove()` not `delete()`). Needs a dev/EAS
 * build (not Expo Go), which this project already requires (D1). Construction is
 * guarded so a missing native module degrades to a no-op in-memory store instead
 * of crashing the bundle at import time.
 */
export interface KeyValueStorage {
  getString(key: string): string | undefined;
  set(key: string, value: string): void;
  remove(key: string): void;
}

function createStorage(): KeyValueStorage {
  try {
    const mmkv = createMMKV({ id: 'swag' });
    return {
      getString: (key) => mmkv.getString(key),
      set: (key, value) => mmkv.set(key, value),
      remove: (key) => {
        mmkv.remove(key);
      },
    };
  } catch (err) {
    logger.warn('storage', 'MMKV unavailable — falling back to in-memory (non-persistent)', err);
    const mem = new Map<string, string>();
    return {
      getString: (key) => mem.get(key),
      set: (key, value) => {
        mem.set(key, value);
      },
      remove: (key) => {
        mem.delete(key);
      },
    };
  }
}

export const storage = createStorage();
