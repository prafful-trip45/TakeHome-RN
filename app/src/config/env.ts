import Constants from 'expo-constants';

/** Typed view over `app.config.ts` -> `extra`. Add keys here (not scattered
 *  `Constants.expoConfig?.extra?.x` reads) so config access stays type-safe. */
export interface AppEnv {
  apiBaseUrl: string | null;
  /** EAS project id — push tokens (M4) and the updates URL derive from it. */
  easProjectId: string | null;
  /** Sentry DSN (task 10) — supplied via env, never committed. Null → disabled. */
  sentryDsn: string | null;
}

interface RawExtra {
  apiBaseUrl?: unknown;
  eas?: { projectId?: unknown };
  sentryDsn?: unknown;
}

const extra = (Constants.expoConfig?.extra ?? {}) as RawExtra;

export const env: AppEnv = {
  // Runtime-safe: only accept a real string, else null (dynamic-config `extra`
  // can serialize an unset value as an empty object).
  apiBaseUrl: typeof extra.apiBaseUrl === 'string' ? extra.apiBaseUrl : null,
  easProjectId: typeof extra.eas?.projectId === 'string' ? extra.eas.projectId : null,
  sentryDsn: typeof extra.sentryDsn === 'string' ? extra.sentryDsn : null,
};
