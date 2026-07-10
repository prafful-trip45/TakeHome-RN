import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useUpdates } from 'expo-updates';
import { isOtaActive } from './otaConfig';
import { applyUpdate, checkAndDownload } from './otaUpdateService';
import { OtaPhase } from './types';

/**
 * OTA orchestration: one launch check plus a re-check on each resume. All state
 * is observed via `useUpdates()`, SDK 57's only observation API (the
 * event-listener API was removed). A ref guards against overlapping checks; the
 * AppState subscription is cleaned up on unmount. Mounted post-render (see
 * UpdateBanner) to keep the launch check off the cold-start critical path.
 */
export function useOtaUpdates(): {
  phase: OtaPhase;
  downloadProgress: number | undefined;
  reload: () => Promise<void>;
} {
  const {
    isChecking,
    isDownloading,
    isUpdatePending,
    downloadProgress,
    checkError,
    downloadError,
  } = useUpdates();
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

  // Launch check: fires on mount after first render, non-blocking.
  useEffect(() => {
    void runCheck();
  }, [runCheck]);

  // Resume check. AppState only emits on transitions, so this never double-fires
  // with the mount check on cold start.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void runCheck();
    });
    return () => sub.remove();
  }, [runCheck]);

  const phase: OtaPhase = isUpdatePending
    ? OtaPhase.Ready
    : isDownloading
      ? OtaPhase.Downloading
      : isChecking
        ? OtaPhase.Checking
        : checkError || downloadError
          ? OtaPhase.Error
          : OtaPhase.Idle;

  return { phase, downloadProgress, reload: applyUpdate };
}
