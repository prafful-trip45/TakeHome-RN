import { create } from 'zustand';
import type { VersionConfig } from '../services/versionGate/types';

/** Notification permission tri-state (task 3 handles all three explicitly). */
export type NotificationPermission = 'granted' | 'denied' | 'undetermined';

/** Push-token acquisition lifecycle (drives the DevPanel status display). */
export type TokenStatus = 'idle' | 'fetching' | 'ready' | 'unavailable' | 'error';

/** Best-effort registration with the admin panel's /api/register. */
export type AdminRegistration = 'idle' | 'registering' | 'registered' | 'failed' | 'skipped';

/**
 * Native update gate state machine (task 8 / M6). The download/install legs are
 * MOCKED per the spec — 'downloading' ticks fake progress; 'installing' →
 * 'installed' simulates the binary swap without a store round-trip.
 *
 *   idle → checking → up-to-date | optional | forced | skipped | error
 *   optional/forced → downloading(progress) → ready → installing → installed
 *
 * 'skipped' = no apiBaseUrl configured. 'error' = config fetch failed → FAIL-OPEN
 * (app stays usable; documented assumption).
 */
export type GatePhase =
  | 'idle'
  | 'checking'
  | 'up-to-date'
  | 'optional'
  | 'forced'
  | 'downloading'
  | 'ready'
  | 'installing'
  | 'installed'
  | 'skipped'
  | 'error';

/**
 * Lean global store (decision D4: Zustand over Redux — the app's real global
 * state is tiny). Written by services (EduBridge idiom: plain-function services
 * update the store singleton via getState()); read by DevPanel/screens.
 */
interface AppState {
  pushToken: string | null;
  permission: NotificationPermission;
  tokenStatus: TokenStatus;
  tokenError: string | null;
  adminRegistration: AdminRegistration;
  // Version gate (task 8 / M6) — written only by versionGateService.
  gatePhase: GatePhase;
  gateConfig: VersionConfig | null;
  /** Fake download progress, 0..1 (spec allows a simulated download). */
  gateProgress: number;
  setPushToken: (token: string | null) => void;
  setPermission: (permission: NotificationPermission) => void;
  setTokenStatus: (status: TokenStatus, error?: string | null) => void;
  setAdminRegistration: (state: AdminRegistration) => void;
  setGatePhase: (phase: GatePhase) => void;
  setGateConfig: (config: VersionConfig | null) => void;
  setGateProgress: (progress: number) => void;
}

export const useAppStore = create<AppState>((set) => ({
  pushToken: null,
  permission: 'undetermined',
  tokenStatus: 'idle',
  tokenError: null,
  adminRegistration: 'idle',
  gatePhase: 'idle',
  gateConfig: null,
  gateProgress: 0,
  setPushToken: (pushToken) => set({ pushToken }),
  setPermission: (permission) => set({ permission }),
  setTokenStatus: (tokenStatus, tokenError = null) => set({ tokenStatus, tokenError }),
  setAdminRegistration: (adminRegistration) => set({ adminRegistration }),
  setGatePhase: (gatePhase) => set({ gatePhase }),
  setGateConfig: (gateConfig) => set({ gateConfig }),
  setGateProgress: (gateProgress) => set({ gateProgress }),
}));
