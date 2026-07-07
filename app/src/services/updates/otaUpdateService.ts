import * as Updates from 'expo-updates';
import { logger } from '../../utils/logger';
import { isOtaActive } from './otaConfig';
import type { OtaCheckResult } from './types';

const SCOPE = 'ota';

/**
 * Check for an update and, if present, download it. Fully guarded: returns a value
 * for every branch and never throws to the caller. Offline / fetch failure →
 * 'error' (logged); the app keeps running the current bundle.
 */
export async function checkAndDownload(): Promise<OtaCheckResult> {
  if (!isOtaActive()) {
    logger.debug(SCOPE, 'updates disabled (dev/Expo Go) — skipping check');
    return 'disabled';
  }
  try {
    const check = await Updates.checkForUpdateAsync();
    // A roll-back-to-embedded directive also means "there's something to apply".
    if (!check.isAvailable && !check.isRollBackToEmbedded) {
      logger.debug(SCOPE, 'up to date');
      return 'up-to-date';
    }
    logger.info(SCOPE, 'update available', { rollback: check.isRollBackToEmbedded });
    const result = await Updates.fetchUpdateAsync();
    logger.info(SCOPE, 'update downloaded', { isNew: result.isNew });
    return result.isNew || result.isRollBackToEmbedded ? 'downloaded' : 'up-to-date';
  } catch (err) {
    // Offline or fetch failure: degrade silently, keep running the current bundle.
    logger.warn(SCOPE, 'check/download failed (likely offline)', err);
    return 'error';
  }
}

/** Apply a downloaded update by reloading onto it. Guarded so a failed reload no-ops. */
export async function applyUpdate(): Promise<void> {
  if (!isOtaActive()) return;
  try {
    logger.info(SCOPE, 'reloading to apply update');
    await Updates.reloadAsync();
  } catch (err) {
    logger.error(SCOPE, 'reloadAsync failed', err);
  }
}
