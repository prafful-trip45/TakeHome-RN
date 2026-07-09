import * as SplashScreen from 'expo-splash-screen';
import { logger } from '../../utils/logger';

/**
 * Native splash lifecycle (task 2). Singleton module mirroring EduBridge's
 * SplashScreenManager: the splash hides only when BOTH the async bootstrap and
 * the navigation container are ready — no premature flash of empty screen —
 * with a failsafe timeout so a failed/offline bootstrap can never strand the
 * user on the splash.
 *
 * `preventAutoHideAsync` is called at module scope (per SDK 57 docs: global
 * scope, not awaited, before any render).
 */

// Keep the native splash up until we explicitly release it.
SplashScreen.preventAutoHideAsync().catch(() => {
  /* Already hidden / unavailable (e.g. web) — nothing to hold. */
});

// Smooth fade-out instead of an abrupt jump to first frame.
SplashScreen.setOptions({ fade: true, duration: 300 });

/** If bootstrap or navigation never report ready, release the splash anyway. */
const FAILSAFE_TIMEOUT_MS = 8000;

let bootstrapReady = false;
let navigationReady = false;
let hidden = false;

function hide(reason: string): void {
  if (hidden) return;
  hidden = true;
  logger.debug('splash', `hiding (${reason})`);
  SplashScreen.hideAsync().catch((err) => {
    logger.warn('splash', 'hideAsync failed', err);
  });
}

function maybeHide(): void {
  if (bootstrapReady && navigationReady) hide('ready');
}

const failsafe = setTimeout(() => hide('failsafe-timeout'), FAILSAFE_TIMEOUT_MS);

export const splashController = {
  /** Async bootstrap (fonts, initial checks) finished. */
  markBootstrapReady(): void {
    bootstrapReady = true;
    maybeHide();
  },
  /** NavigationContainer fired onReady — first meaningful content is mounted. */
  markNavigationReady(): void {
    navigationReady = true;
    maybeHide();
  },
  /** True once the splash has been released (idempotent afterwards). */
  isHidden(): boolean {
    return hidden;
  },
  /** Test hook / cleanup. */
  cancelFailsafe(): void {
    clearTimeout(failsafe);
  },
};
