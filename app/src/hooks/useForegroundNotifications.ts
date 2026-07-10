import { useEffect } from 'react';
import { Platform } from 'react-native';
import { getMessaging, onMessage } from '@react-native-firebase/messaging';
import { extractExpoData } from '../navigation/fcmPayload';
import { notificationDataToUrl } from '../navigation/notificationLinking';
import { useAppStore } from '../store/useAppStore';
import { logger } from '../utils/logger';

/**
 * Mount once at root. Presents an in-app banner for pushes that arrive while the
 * app is FOREGROUNDED.
 *
 * Critical detail — why this uses @react-native-firebase/messaging and not
 * expo-notifications: this app has RN-Firebase installed, and its native
 * FirebaseMessagingService (priority 0) outranks expo-notifications'
 * ExpoFirebaseMessagingService (priority -1) for the FCM MESSAGING_EVENT intent.
 * Android delivers each message to exactly one service, so a foreground push goes
 * to RN-Firebase's `onMessage(...)` — expo-notifications' addNotificationReceivedListener
 * never fires. (Background/killed still works because the OS auto-renders the
 * `notification` block into the tray.)
 *
 * We do NOT navigate here — tap routing stays in linkingConfig.ts. We only
 * pre-resolve the deep-link URL so the banner can replay it through `linking`.
 */
export function useForegroundNotifications(): void {
  useEffect(() => {
    if (Platform.OS === 'web') return;

    let counter = 0;
    // onMessage fires ONLY when the app is in the foreground (modular API).
    const unsubscribe = onMessage(getMessaging(), (remoteMessage) => {
      try {
        const title = remoteMessage.notification?.title ?? null;
        const body = remoteMessage.notification?.body ?? null;
        const data = extractExpoData(remoteMessage.data);
        const url = notificationDataToUrl(data);

        // Unique, monotonic id so an identical re-send still re-triggers the banner.
        const id = `${remoteMessage.messageId ?? 'msg'}:${(counter += 1)}`;
        logger.debug('notifications', 'foreground FCM message', { id, url });

        useAppStore.getState().setForegroundNotification({
          id,
          title,
          body,
          url,
          screen: data.screen,
        });
      } catch (err) {
        logger.warn('notifications', 'foreground onMessage handling failed', err);
      }
    });

    return unsubscribe;
  }, []);
}
