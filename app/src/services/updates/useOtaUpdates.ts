import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useUpdates } from 'expo-updates';
import { isOtaActive } from './otaConfig';
import { applyUpdate, checkAndDownload } from './otaUpdateService';
import type { OtaPhase } from './types';

/**
 * Owns OTA orchestration (task 6 / M5): one launch check + a re-check on each
 * resume, with all state observed through `useUpdates()` — SDK 57's single
 * observation API (the event-listener API was removed). A ref guards against
 * overlapping checks; the lone AppState subscription is cleaned up on unmount
 * (no leaks / duplicate handlers). Mounted post-render (see UpdateBanner) so the
 * launch check stays OFF the cold-start critical path.
 */
export function useOtaUpdates(): {
  phase: OtaPhase;
  downloadProgress: number | undefined;
  reload: () => Promise<void>;
} {
  const { isChecking, isDownloading, isUpdatePending, downloadProgress, checkError, downloadError } =
    useUpdates();
  const inFlight = useRef(false);

  const runCheck = useCallback(async () => {
    if (!isOtaActive() || inFlight.current) return;
    inFlight.current = true;
    try {
      await checkAndDownload();
    } finally {
      inFlight.current = false;
    }
  }, []);

  // Launch check — fires on mount (after first render), non-blocking.
  useEffect(() => {
    void runCheck();
  }, [runCheck]);

  // Resume check — a single subscription, removed on cleanup. AppState only emits
  // on transitions, so this never double-fires with the mount check on cold start.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void runCheck();
    });
    return () => sub.remove();
  }, [runCheck]);

  const phase: OtaPhase = isUpdatePending
    ? 'ready'
    : isDownloading
      ? 'downloading'
      : isChecking
        ? 'checking'
        : checkError || downloadError
          ? 'error'
          : 'idle';

  return { phase, downloadProgress, reload: applyUpdate };
}
