import { useEffect } from 'react';
import { AppState } from 'react-native';
import { checkVersionGate } from './versionGateService';

/**
 * Mounts the version-gate checks (task 8 / M6): one launch check + a re-check on
 * each resume — so flipping the config in the admin panel shows up on the next
 * foreground without a restart. Mirrors useOtaUpdates: mounted once (by
 * UpdateGateModal, post-render → off the cold-start critical path), single
 * AppState subscription with cleanup, in-flight/mid-flow guards live in the
 * service. State is read from the store by the consuming component.
 */
export function useVersionGate(): void {
  // Launch check — after first render, non-blocking.
  useEffect(() => {
    void checkVersionGate();
  }, []);

  // Resume check — AppState only emits on transitions, so no double-fire with
  // the mount check on cold start.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void checkVersionGate();
    });
    return () => sub.remove();
  }, []);
}
