import { getApp } from '@react-native-firebase/app';
import {
  getAnalytics,
  logEvent,
  logScreenView,
  setAnalyticsCollectionEnabled,
} from '@react-native-firebase/analytics';
import * as Updates from 'expo-updates';
import { logger } from '../../utils/logger';

const SCOPE = 'analytics';

/**
 * Firebase Analytics owns PRODUCT EVENTS only (decision D5) — screen views,
 * notification opens, update funnel. It never receives errors/crashes (Sentry's
 * job), so there is zero duplicate reporting between the two tools.
 *
 * Availability-guarded: without google-services.json / GoogleService-Info.plist
 * in the build (pre-O8 accounts, or Expo Go) the native module has no default
 * app — init fails softly and every track call becomes a no-op. v25 modular API.
 */

type Analytics = ReturnType<typeof getAnalytics>;
let analytics: Analytics | null = null;

export function initAnalytics(): void {
  if (analytics) return;
  try {
    analytics = getAnalytics(getApp());
    void setAnalyticsCollectionEnabled(analytics, true);
    logger.info(SCOPE, 'initialized');
    // OTA visibility: when this launch is running an EAS Update bundle (not the
    // binary-embedded one), record that the OTA actually applied (task 6 demo).
    if (Updates.isEmbeddedLaunch === false) {
      track('ota_applied', { update_id: Updates.updateId ?? 'unknown' });
    }
  } catch (err) {
    analytics = null;
    logger.info(SCOPE, 'Firebase unavailable (no native config) — analytics disabled', err);
  }
}

export function isAnalyticsEnabled(): boolean {
  return analytics !== null;
}

function track(name: string, params?: Record<string, string | number>): void {
  if (!analytics) return;
  logEvent(analytics, name, params).catch((err) =>
    logger.debug(SCOPE, `event ${name} failed`, err),
  );
}

/** The app's whole event vocabulary — one place, so the no-dup division (D5)
 *  and the README event table stay honest. */
export const analyticsEvents = {
  /** Fired by NavigationComponent on every focused-route change. */
  screenView(screenName: string): void {
    if (!analytics) return;
    logScreenView(analytics, { screen_name: screenName, screen_class: screenName }).catch((err) =>
      logger.debug(SCOPE, 'screen_view failed', err),
    );
  },
  /** Fired in the unified tap funnel (linkingConfig → notificationService). */
  notificationOpened(screen?: string): void {
    track('notification_opened', screen ? { screen } : undefined);
  },
  /** Update-gate funnel (task 8 / M6). */
  updatePromptShown(kind: 'optional' | 'forced', latest: string): void {
    track('update_prompt_shown', { kind, latest_version: latest });
  },
  updatePromptAccepted(latest: string): void {
    track('update_prompt_accepted', { latest_version: latest });
  },
  updatePromptDismissed(latest: string): void {
    track('update_prompt_dismissed', { latest_version: latest });
  },
};
