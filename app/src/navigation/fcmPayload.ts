import { logger } from '../utils/logger';

/**
 * Normalize the FCM `data` bag delivered by the Expo push service into the flat
 * `{ screen, highlight, url, ... }` shape the rest of the app already understands
 * (deeplinks.ts / notificationDataToUrl).
 *
 * Why this exists: this app has @react-native-firebase/messaging installed, whose
 * native FirebaseMessagingService outranks expo-notifications' service for the
 * `com.google.firebase.MESSAGING_EVENT` intent. So a FOREGROUND push is delivered
 * to `messaging().onMessage(remoteMessage)` — NOT to expo-notifications'
 * addNotificationReceivedListener. The `remoteMessage.data` we get there is FCM's
 * string-map, and the Expo push service packs the developer `data` object into a
 * JSON-encoded string under the `body` key (alongside top-level `experienceId`,
 * `projectId`, etc.). We unwrap that here.
 *
 * Defensive: handles both the nested-`body` shape and a already-flat `data`
 * (older/simple senders), and tolerates values arriving as strings.
 */
export function extractExpoData(
  data: Record<string, string | object> | undefined,
): Record<string, unknown> {
  if (!data) return {};

  // Expo packs the developer payload under `body` as a JSON string.
  const rawBody = data.body;
  if (typeof rawBody === 'string' && rawBody.length > 0) {
    try {
      const parsed = JSON.parse(rawBody);
      if (parsed && typeof parsed === 'object') return parsed as Record<string, unknown>;
    } catch (err) {
      logger.debug('notifications', 'fcm body was not JSON, using flat data', err);
    }
  }
  // Some SDKs already deliver `body` as an object.
  if (rawBody && typeof rawBody === 'object') return rawBody as Record<string, unknown>;

  // Fallback: treat the FCM data map itself as the payload (flat senders).
  return data as Record<string, unknown>;
}
