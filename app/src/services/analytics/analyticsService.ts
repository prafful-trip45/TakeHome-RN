import { getApp } from '@react-native-firebase/app';
import {
  getAnalytics,
  logEvent,
  logScreenView,
  setAnalyticsCollectionEnabled,
  setUserProperties,
} from '@react-native-firebase/analytics';
import { Platform } from 'react-native';
import * as Updates from 'expo-updates';
import { logger } from '../../utils/logger';
import type { GateDecision } from '../versionGate/types';

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
    setInitialUserProperties();
    // OTA visibility: record ota_applied ONLY on a real build running a downloaded
    // EAS Update (not the embedded bundle). `isEnabled` gates out dev-clients, where
    // updates are inert yet `isEmbeddedLaunch` is false — which would false-fire this.
    if (Updates.isEnabled && Updates.isEmbeddedLaunch === false) {
      track('ota_applied', { update_id: Updates.updateId ?? 'unknown' });
    }
  } catch (err) {
    analytics = null;
    logger.info(SCOPE, 'Firebase unavailable (no native config) — analytics disabled', err);
  }
}

/**
 * Non-PII user properties for segmentation — shown in DebugView "User Properties"
 * and associated with every event (incl. screen_view). All values are strings,
 * ≤36 chars, non-PII (spec).
 */
function setInitialUserProperties(): void {
  if (!analytics) return;
  const hermes = !!(global as { HermesInternal?: unknown }).HermesInternal;
  void setUserProperties(analytics, {
    platform: Platform.OS,
    js_engine: hermes ? 'hermes' : 'jsc',
    runtime_version: Updates.runtimeVersion ?? 'unknown',
    ota_channel: Updates.channel ?? (Updates.isEnabled ? 'default' : 'dev'),
  }).catch((err) => logger.debug(SCOPE, 'setUserProperties failed', err));
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
  /** Update-gate funnel (task 8 / M6). `kind` is only ever Optional/Forced here. */
  updatePromptShown(kind: GateDecision, latest: string): void {
    track('update_prompt_shown', { kind, latest_version: latest });
  },
  updatePromptAccepted(latest: string): void {
    track('update_prompt_accepted', { latest_version: latest });
  },
  updatePromptDismissed(latest: string): void {
    track('update_prompt_dismissed', { latest_version: latest });
  },
};
