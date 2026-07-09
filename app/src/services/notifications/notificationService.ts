import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { env } from '../../config/env';
import { analyticsEvents } from '../analytics/analyticsService';
import {
  useAppStore,
  AdminRegistration,
  NotificationPermission,
  TokenStatus,
} from '../../store/useAppStore';
import { logger } from '../../utils/logger';

/**
 * Push-notification service (task 3). Plain-function module that writes results
 * into the Zustand store (EduBridge services idiom). Orchestrated once at root
 * by useNotifications; DevPanel calls syncNotifications() for retries.
 *
 * NOT here by design (D8): notification *tap* listeners — the unified React
 * Navigation `linking` resolver in navigation/linkingConfig.ts owns those, so
 * they exist exactly once.
 */

// Foreground presentation (module scope per SDK 57 docs — registered before any
// notification can arrive). SDK 57 shape: banner/list, not the old shouldShowAlert.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/** Admin sends with `channelId: 'default'` + `priority: 'high'` — this channel
 *  must exist (and at HIGH importance for heads-up) before the first delivery. */
export async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.HIGH,
    });
  } catch (err) {
    logger.warn('notifications', 'channel setup failed', err);
  }
}

function toPermission(status: Notifications.PermissionStatus): NotificationPermission {
  if (status === Notifications.PermissionStatus.GRANTED) return NotificationPermission.Granted;
  if (status === Notifications.PermissionStatus.DENIED) return NotificationPermission.Denied;
  return NotificationPermission.Undetermined;
}

export async function getPermission(): Promise<NotificationPermission> {
  const { status } = await Notifications.getPermissionsAsync();
  return toPermission(status);
}

export async function requestPermission(): Promise<NotificationPermission> {
  const { status } = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: true, allowSound: true },
  });
  return toPermission(status);
}

/** Expo push token. Android needs FCM creds in the build (M7's google-services);
 *  iOS needs APNs. Simulators/emulators may or may not support tokens — errors
 *  are surfaced to the store, never thrown to the UI. */
async function fetchExpoPushToken(): Promise<string> {
  const { data } = await Notifications.getExpoPushTokenAsync(
    env.easProjectId ? { projectId: env.easProjectId } : undefined,
  );
  return data;
}

/** Best-effort POST to the admin registry (contract: admin /api/register).
 *  Failure must never disrupt startup (admin doc B4). */
async function registerTokenWithAdmin(token: string): Promise<AdminRegistration> {
  if (!env.apiBaseUrl) {
    logger.info('notifications', 'no apiBaseUrl configured — skipping admin registration');
    return AdminRegistration.Skipped;
  }
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    const res = await fetch(`${env.apiBaseUrl}/api/register`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        token,
        platform: Platform.OS === 'ios' || Platform.OS === 'android' ? Platform.OS : 'unknown',
        deviceName: Device.deviceName ?? undefined,
        appVersion: Constants.expoConfig?.version ?? undefined,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) {
      logger.warn('notifications', `admin registration failed (${res.status})`);
      return AdminRegistration.Failed;
    }
    return AdminRegistration.Registered;
  } catch (err) {
    logger.warn('notifications', 'admin registration unreachable', err);
    return AdminRegistration.Failed;
  }
}

/** Report a notification-open: Firebase product event (task 10 / D5) + the
 *  admin's /api/events counter (bonus). Fire-and-forget — must never block or
 *  break the tap-navigation path. */
export function reportNotificationOpened(screen?: unknown): void {
  const screenStr =
    typeof screen === 'string' || typeof screen === 'number' ? String(screen) : undefined;
  analyticsEvents.notificationOpened(screenStr);
  if (!env.apiBaseUrl) return;
  const token = useAppStore.getState().pushToken ?? undefined;
  fetch(`${env.apiBaseUrl}/api/events`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ type: 'opened', screen: screenStr, token }),
  }).catch((err) => logger.debug('notifications', 'opened-event report failed', err));
}

let syncInFlight = false;
// Ask the OS at most ONCE automatically per app launch. After a denial Android
// keeps canAskAgain=true, so without this we'd re-prompt on every sync (nagging).
// A fresh launch resets this; DevPanel "Retry" passes { manual: true } to re-ask
// on an explicit user action.
let autoPromptedThisSession = false;

/**
 * The full startup/retry flow: channel → permission (granted/denied/undetermined
 * each handled) → token → admin registration. Writes every step into the store;
 * a denied permission is a terminal-but-graceful state (UI shows fallback, no
 * crash, re-runnable after the user changes Settings).
 */
export async function syncNotifications({
  manual = false,
}: { manual?: boolean } = {}): Promise<void> {
  if (syncInFlight) return;
  syncInFlight = true;
  const store = useAppStore.getState();
  try {
    await ensureAndroidChannel();

    // Android reports `denied` (with canAskAgain=true) BEFORE the first prompt —
    // it does NOT use `undetermined` like iOS — so gate on canAskAgain, not status.
    // And prompt at most once automatically per launch: after a denial canAskAgain
    // stays true, so auto-re-asking on every sync would nag. `manual` (DevPanel
    // Retry) bypasses the session guard for an explicit user re-request.
    const current = await Notifications.getPermissionsAsync();
    let permission = toPermission(current.status);
    const mayPrompt =
      permission !== NotificationPermission.Granted &&
      current.canAskAgain &&
      (manual || !autoPromptedThisSession);
    if (mayPrompt) {
      autoPromptedThisSession = true;
      permission = await requestPermission();
    }
    store.setPermission(permission);

    if (permission !== NotificationPermission.Granted) {
      // Graceful denied fallback: app fully usable, token simply unavailable.
      store.setPushToken(null);
      store.setTokenStatus(TokenStatus.Unavailable);
      store.setAdminRegistration(AdminRegistration.Skipped);
      logger.info('notifications', `permission ${permission} — push disabled, app continues`);
      return;
    }

    store.setTokenStatus(TokenStatus.Fetching);
    const token = await fetchExpoPushToken();
    store.setPushToken(token);
    store.setTokenStatus(TokenStatus.Ready);
    logger.info('notifications', 'expo push token acquired');

    store.setAdminRegistration(AdminRegistration.Registering);
    store.setAdminRegistration(await registerTokenWithAdmin(token));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    store.setTokenStatus(TokenStatus.Error, message);
    logger.warn('notifications', 'token sync failed', err);
  } finally {
    syncInFlight = false;
  }
}
