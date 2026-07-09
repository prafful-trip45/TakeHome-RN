import { useEffect, useState } from 'react';
import { initAnalytics } from '../services/analytics/analyticsService';
import { splashController } from '../services/splash/splashController';
import { logger } from '../utils/logger';

/**
 * Required async bootstrap before first meaningful content (task 2).
 * Currently a fast no-op placeholder; M4 slots in notification-permission sync
 * here. Deliberately kept non-blocking-critical: every task is caught so a
 * failure (e.g. offline) never blocks first render.
 */
async function runBootstrapTasks(): Promise<void> {
  const tasks: Promise<unknown>[] = [
    // M2+: Font.loadAsync(...) if custom fonts are added.
    // NOTE (M5): the launch OTA check is owned by useOtaUpdates (mounted
    // post-render via <UpdateBanner/>), kept OFF this awaited path so it never
    // delays splash hide. Do not add checkForUpdateAsync here.
    // M7: Firebase Analytics init (availability-guarded, sync + cheap; also
    // records ota_applied when this launch runs an EAS Update bundle).
    Promise.resolve().then(initAnalytics),
  ];
  await Promise.allSettled(tasks);
}

/** Mount once at root. Marks the splash controller when bootstrap completes. */
export function useBootstrap(): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    runBootstrapTasks()
      .catch((err) => logger.warn('bootstrap', 'bootstrap task failed', err))
      .finally(() => {
        if (cancelled) return;
        setReady(true);
        splashController.markBootstrapReady();
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return ready;
}
