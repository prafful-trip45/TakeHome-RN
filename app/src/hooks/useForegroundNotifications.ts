import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { notificationToUrl } from '../navigation/notificationLinking';
import { useAppStore } from '../store/useAppStore';
import { logger } from '../utils/logger';

/**
 * Mount once at root. Registers the foreground *received* listener that the tap
 * pipeline (linkingConfig.ts) intentionally does not: on Android the OS does not
 * render a heads-up banner over our own foregrounded app, so a push that lands
 * while the app is open would otherwise be invisible until the user backgrounds
 * the app. We surface it as an in-app banner (ForegroundNotificationBanner) fed
 * from the store.
 *
 * Tap routing still lives solely in linkingConfig.ts — here we only pre-resolve
 * the deep-link URL (notificationToUrl) so the banner can replay it through the
 * same `linking` resolver. No navigation happens in this hook.
 */
export function useForegroundNotifications(): void {
  useEffect(() => {
    if (Platform.OS === 'web') return;

    let counter = 0;
    let sub: { remove: () => void } | undefined;
    try {
      sub = Notifications.addNotificationReceivedListener((notification) => {
        const { title, body, data } = notification.request.content;
        const url = notificationToUrl(notification);
        // Unique, monotonic id so an identical re-send still re-triggers the banner
        // (the store setter with a fresh id is a state change even if text repeats).
        const id = `${notification.request.identifier}:${(counter += 1)}`;
        logger.debug('notifications', 'foreground notification received', { id, url });
        useAppStore.getState().setForegroundNotification({
          id,
          title,
          body,
          url,
          screen: data?.screen,
        });
      });
    } catch (err) {
      logger.warn('notifications', 'foreground listener registration failed', err);
    }

    return () => sub?.remove();
  }, []);
}
