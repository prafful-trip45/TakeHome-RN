import type * as Notifications from 'expo-notifications';
import { buildScreenUrl, parseScreen } from './deeplinks';

/**
 * Bridge an expo-notifications tap into the same URL pipeline as deep links, so a
 * single React Navigation `linking` resolver handles both (foreground/background/
 * killed). The payload carries `data.screen` and optional `data.highlight`; an
 * explicit `data.url` is honored if present.
 *
 * Returns null when the notification has no routable target, so the caller does
 * nothing rather than navigating somewhere wrong.
 */
export function notificationResponseToUrl(
  response: Notifications.NotificationResponse | null,
): string | null {
  return notificationDataToUrl(response?.notification.request.content.data);
}

/**
 * Shared core: resolve a loosely-typed notification `data` bag to a deep-link URL.
 * Exported so the FCM foreground path (@react-native-firebase/messaging's
 * onMessage) can reuse the exact same resolution as the expo-notifications tap
 * path, after normalizing the FCM payload (see extractExpoData).
 */
export function notificationDataToUrl(
  data: Record<string, unknown> | undefined | null,
): string | null {
  if (!data) return null;

  if (typeof data.url === 'string' && data.url.length > 0) return data.url;

  const screen = parseScreen(data.screen);
  if (!screen) return null;

  const highlight = data.highlight === true || data.highlight === 'true';
  return buildScreenUrl(screen, highlight);
}
