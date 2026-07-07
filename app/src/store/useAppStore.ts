import { create } from 'zustand';
import type { VersionConfig } from '../services/versionGate/types';

/** Notification permission tri-state (task 3 handles all three explicitly).
 *  String values mirror expo-notifications' `PermissionStatus` so API results map 1:1. */
export enum NotificationPermission {
  Granted = 'granted',
  Denied = 'denied',
  Undetermined = 'undetermined',
}

/** Push-token acquisition lifecycle (drives the DevPanel status display). */
export enum TokenStatus {
  Idle = 'idle',
  Fetching = 'fetching',
  Ready = 'ready',
  Unavailable = 'unavailable',
  Error = 'error',
}

/** Best-effort registration with the admin panel's /api/register. */
export enum AdminRegistration {
  Idle = 'idle',
  Registering = 'registering',
  Registered = 'registered',
  Failed = 'failed',
  Skipped = 'skipped',
}

/**
 * Native update gate state machine (task 8 / M6). The download/install legs are
 * MOCKED per the spec — `Downloading` ticks fake progress; `Installing` →
 * `Installed` simulates the binary swap without a store round-trip.
 *
 *   Idle → Checking → UpToDate | Optional | Forced | Skipped | Error
 *   Optional/Forced → Downloading(progress) → Ready → Installing → Installed
 *
 * `Skipped` = no apiBaseUrl configured. `Error` = config fetch failed → FAIL-OPEN
 * (app stays usable; documented assumption). String values kept stable for logs.
 */
export enum GatePhase {
  Idle = 'idle',
  Checking = 'checking',
  UpToDate = 'up-to-date',
  Optional = 'optional',
  Forced = 'forced',
  Downloading = 'downloading',
  Ready = 'ready',
  Installing = 'installing',
  Installed = 'installed',
  Skipped = 'skipped',
  Error = 'error',
}

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
  permission: NotificationPermission.Undetermined,
  tokenStatus: TokenStatus.Idle,
  tokenError: null,
  adminRegistration: AdminRegistration.Idle,
  gatePhase: GatePhase.Idle,
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
