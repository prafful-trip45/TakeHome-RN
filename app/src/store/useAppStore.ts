import { create } from 'zustand';
import type { VersionConfig } from '../services/versionGate/types';

/** Notification permission tri-state. String values mirror expo-notifications'
 *  `PermissionStatus` so API results map 1:1. */
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
 * Native update gate state machine. Download/install legs are mocked:
 * `Downloading` ticks fake progress; `Installing` → `Installed` simulates the
 * binary swap without a store round-trip.
 *
 *   Idle → Checking → UpToDate | Optional | Forced | Skipped | Error
 *   Optional/Forced → Downloading(progress) → Ready → Installing → Installed
 *
 * `Skipped` = no apiBaseUrl configured. `Error` = config fetch failed; fails open
 * so the app stays usable. String values kept stable for logs.
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
 * Lean global store (Zustand over Redux — real global state is tiny). Written by
 * plain-function services via getState(); read by DevPanel/screens.
 */
interface AppState {
  pushToken: string | null;
  permission: NotificationPermission;
  tokenStatus: TokenStatus;
  tokenError: string | null;
  adminRegistration: AdminRegistration;
  // Version gate — written only by versionGateService.
  gatePhase: GatePhase;
  gateConfig: VersionConfig | null;
  /** Simulated download progress, 0..1. */
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
