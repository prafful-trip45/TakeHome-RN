/**
 * Shared contracts between the admin panel, its API routes, and the RN app.
 * Keep these in sync with `app/src` — the app reads `data.screen` in the push
 * payload and the `VersionConfig` shape from GET /api/version-config.
 */

/** The three deep-link targets. Sent to the app as a string; the app's
 *  `parseScreen` strips non-digits, so '1' | '2' | '3' is the canonical form. */
export type ScreenTarget = '1' | '2' | '3';

export const SCREEN_TARGETS: readonly ScreenTarget[] = ['1', '2', '3'] as const;

/** A push token registered by a device (Bonus: token registry). */
export interface DeviceToken {
  /** ExponentPushToken[...] — the primary key. */
  token: string;
  platform: 'ios' | 'android' | 'unknown';
  /** Human-friendly device label, if the app sent one. */
  deviceName?: string;
  /** Native app version at registration time (helps debug version-gating). */
  appVersion?: string;
  /** ISO timestamp of first registration. */
  createdAt: string;
  /** ISO timestamp of the most recent (re-)registration. */
  updatedAt: string;
}

/** Remote native-update gate config (Task 8 source of truth). The app fetches
 *  this on launch and drives its forced/optional update state machine off it. */
export interface VersionConfig {
  /** Newest version available to install. */
  latestVersion: string;
  /** Below this, the app must block usage (forced update). */
  minSupportedVersion: string;
  /** Hard override: force even users at/above minSupportedVersion. */
  forceUpdate: boolean;
  /** Where the fallback "open store" branch would send the user (placeholder ok). */
  downloadUrl: string;
  /** Optional copy shown in the update prompt. */
  message?: string;
  /** ISO timestamp of the last edit (last-write-wins; surfaced in the UI). */
  updatedAt?: string;
}

/** Body the app POSTs to /api/register. */
export interface RegisterRequest {
  token: string;
  platform?: DeviceToken['platform'];
  deviceName?: string;
  appVersion?: string;
}

/** Body the admin UI POSTs to /api/send. */
export interface SendRequest {
  /** Explicit recipient list, or omit/empty + `toAll: true` to blast everyone. */
  tokens?: string[];
  toAll?: boolean;
  title: string;
  body: string;
  screen: ScreenTarget;
  /** Bonus: deep-link param the target screen reacts to. */
  highlight?: boolean;
}

/** Per-recipient result we return to the UI after talking to Expo. */
export interface SendResult {
  token: string;
  status: 'ok' | 'error';
  /** Expo ticket id — used later to poll a delivery receipt. */
  ticketId?: string;
  /** Expo error code, e.g. DeviceNotRegistered / MessageTooBig. */
  error?: string;
  message?: string;
}

/** A notification "opened" event the app can POST for the analytics bonus. */
export interface NotificationEvent {
  type: 'delivered' | 'opened';
  screen?: ScreenTarget;
  token?: string;
  at: string;
}
