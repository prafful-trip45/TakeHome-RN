import { Platform } from 'react-native';
import * as Application from 'expo-application';
import * as Sentry from '@sentry/react-native';
import { env } from '../../config/env';
import { logger } from '../../utils/logger';

const SCOPE = 'sentry';

/**
 * Sentry owns all error/crash reporting (JS errors, unhandled rejections, native
 * crashes); analytics never sees errors, so the two tools can't double-report.
 * Initialized from index.ts before the root component renders; the root is
 * wrapped with Sentry.wrap there.
 *
 * DSN comes from env, never committed. No DSN → Sentry stays off and the app runs
 * normally (e.g. fresh clones / CI).
 */

let initialized = false;

export function initSentry(): void {
  if (initialized) return;
  if (!env.sentryDsn) {
    logger.info(SCOPE, 'no DSN configured — Sentry disabled');
    return;
  }
  try {
    Sentry.init({
      dsn: env.sentryDsn,
      environment: __DEV__ ? 'development' : 'production',
      // Error/crash reporting only: no tracing, no replay.
      tracesSampleRate: 0,
      // Keep identifiers non-PII — never collect defaults like IP.
      sendDefaultPii: false,
    });
    initialized = true;
    void tagInstall();
    logger.info(SCOPE, 'initialized');
  } catch (err) {
    logger.warn(SCOPE, 'init failed — continuing without Sentry', err);
  }
}

/** Non-PII, device-scoped identifier. androidId / identifierForVendor are
 *  app/vendor-scoped and resettable — no personal data, no persistence needed.
 *  Release/version/platform are tagged automatically by the SDK + config plugin. */
async function tagInstall(): Promise<void> {
  try {
    const id =
      Platform.OS === 'android'
        ? Application.getAndroidId()
        : await Application.getIosIdForVendorAsync();
    if (id) Sentry.setUser({ id });
  } catch (err) {
    logger.debug(SCOPE, 'install id unavailable', err);
  }
}

export function isSentryEnabled(): boolean {
  return initialized;
}

/** DevPanel: a handled error — proves captureException + breadcrumbs land. */
export function triggerTestError(): void {
  logger.info(SCOPE, 'sending test error');
  Sentry.captureException(new Error('SWAG test error (captured) — DevPanel'));
}

/** DevPanel: a native crash — proves native crash reporting + symbolication.
 *  Kills the process immediately; the report uploads on next launch. */
export function triggerNativeCrash(): void {
  logger.info(SCOPE, 'triggering native crash');
  Sentry.nativeCrash();
}
