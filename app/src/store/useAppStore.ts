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
 * A notification that arrived while the app was in the foreground. Android does
 * not render an OS heads-up banner over our own foregrounded app, so we present
 * an in-app banner from this transient state instead. `url` is the pre-resolved
 * deep-link (from notificationResponseToUrl) that a tap replays through `linking`.
 * Ephemeral — never persisted.
 */
export interface ForegroundNotification {
  /** Monotonic key so a re-arrival of the "same" notification re-triggers the banner. */
  id: string;
  title: string | null;
  body: string | null;
  /** Canonical deep-link URL for tap routing, or null when not routable. */
  url: string | null;
  /** Raw `data.screen` from the payload, forwarded to open-analytics on tap. */
  screen: unknown;
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
  /** Latest foreground-arrived notification for the in-app banner; null when dismissed. */
  foregroundNotification: ForegroundNotification | null;
  // Version gate — written only by versionGateService.
  gatePhase: GatePhase;
  gateConfig: VersionConfig | null;
  /** Simulated download progress, 0..1. */
  gateProgress: number;
  setPushToken: (token: string | null) => void;
  setPermission: (permission: NotificationPermission) => void;
  setTokenStatus: (status: TokenStatus, error?: string | null) => void;
  setAdminRegistration: (state: AdminRegistration) => void;
  setForegroundNotification: (notification: ForegroundNotification | null) => void;
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
  foregroundNotification: null,
  gatePhase: GatePhase.Idle,
  gateConfig: null,
  gateProgress: 0,
  setPushToken: (pushToken) => set({ pushToken }),
  setPermission: (permission) => set({ permission }),
  setTokenStatus: (tokenStatus, tokenError = null) => set({ tokenStatus, tokenError }),
  setAdminRegistration: (adminRegistration) => set({ adminRegistration }),
  setForegroundNotification: (foregroundNotification) => set({ foregroundNotification }),
  setGatePhase: (gatePhase) => set({ gatePhase }),
  setGateConfig: (gateConfig) => set({ gateConfig }),
  setGateProgress: (gateProgress) => set({ gateProgress }),
}));
