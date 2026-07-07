import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import * as Notifications from 'expo-notifications';
import type { LinkingOptions } from '@react-navigation/native';
import { reportNotificationOpened } from '../services/notifications/notificationService';
import { logger } from '../utils/logger';
import { notificationResponseToUrl } from './notificationLinking';
import { Routes } from './routes';
import type { RootStackParamList } from './routes';

/**
 * Deep-link prefixes: the custom scheme (swagassignment://), the dev/exp scheme
 * from `Linking.createURL`, and the https universal-link host (swap for the real
 * Vercel domain once the admin panel is deployed).
 */
export const linkPrefixes: string[] = [
  Linking.createURL('/'),
  'swagassignment://',
  'https://swag-rn-assignment.vercel.app',
];

/** `screen/N` (+ optional `?highlight=true`, the deep-link-params bonus). */
const screenPath = (n: 1 | 2 | 3) => ({
  path: `screen/${n}`,
  parse: { highlight: (value: string) => value === 'true' },
});

/**
 * ONE resolver for BOTH URL deep links and notification taps, across
 * foreground / background / killed. Notification responses are bridged into the
 * same URL pipeline via `getInitialURL` (cold start) and `subscribe` (running),
 * so there is a single routing source of truth — no redux/AuthSlice, no auth
 * coupling (unlike MudraApp, which disables `linking` and resolves in redux).
 */
export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: linkPrefixes,
  config: {
    screens: {
      [Routes.Tabs]: {
        screens: {
          [Routes.Screen1]: screenPath(1),
          [Routes.Screen2]: screenPath(2),
          [Routes.Screen3]: screenPath(3),
        },
      },
    },
  },

  async getInitialURL() {
    // 1. App opened by a URL (cold start).
    const url = await Linking.getInitialURL();
    if (url) {
      logger.debug('linking', 'initial url', url);
      return url;
    }
    // 2. App opened by tapping a notification (killed / cold start).
    if (Platform.OS === 'web') return null;
    try {
      const response = await Notifications.getLastNotificationResponseAsync();
      const notifUrl = notificationResponseToUrl(response);
      if (notifUrl) {
        logger.debug('linking', 'initial url (notification)', notifUrl);
        // Bonus analytics: killed/cold-start open (fire-and-forget).
        reportNotificationOpened(response?.notification.request.content.data?.screen);
      }
      return notifUrl;
    } catch (err) {
      logger.warn('linking', 'getLastNotificationResponse failed', err);
      return null;
    }
  },

  subscribe(listener) {
    // URL deep links while the app is running (warm start).
    const urlSub = Linking.addEventListener('url', ({ url }) => {
      logger.debug('linking', 'url event', url);
      listener(url);
    });

    // Notification taps while the app is foreground / background.
    let notifSub: { remove: () => void } | undefined;
    if (Platform.OS !== 'web') {
      try {
        notifSub = Notifications.addNotificationResponseReceivedListener((response) => {
          const url = notificationResponseToUrl(response);
          if (url) {
            logger.debug('linking', 'notification response', url);
            // Bonus analytics: foreground/background open (fire-and-forget).
            reportNotificationOpened(response.notification.request.content.data?.screen);
            listener(url);
          }
        });
      } catch (err) {
        logger.warn('linking', 'notification listener registration failed', err);
      }
    }

    return () => {
      urlSub.remove();
      notifSub?.remove();
    };
  },
};
