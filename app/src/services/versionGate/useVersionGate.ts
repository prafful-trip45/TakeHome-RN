import { useEffect } from 'react';
import { AppState } from 'react-native';
import { checkVersionGate } from './versionGateService';

/**
 * Mounts the version-gate checks: one launch check + a re-check on each resume,
 * so an admin config change shows up on the next foreground without a restart.
 * Mounted once (by UpdateGateModal, post-render → off the cold-start critical
 * path); in-flight/mid-flow guards live in the service.
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
