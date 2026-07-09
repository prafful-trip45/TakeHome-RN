import type { ScreenTarget } from './types';

/**
 * Pure, client-safe helpers that mirror what the server sends and what the app
 * resolves — used by the Notification Builder to show a live preview WITHOUT
 * importing any server code. Keep in sync with `expo-push.buildMessage` (payload)
 * and the app's `deeplinks.buildScreenUrl` (deep link).
 */

/** The canonical deep link the app derives from `data.screen` (+ highlight). */
export function buildDeepLink(screen: ScreenTarget, highlight: boolean): string {
  return `swagassignment://screen/${screen}${highlight ? '?highlight=true' : ''}`;
}

/** The exact JSON the server posts to Expo for one recipient (token elided). */
export function buildPreviewPayload(
  title: string,
  body: string,
  screen: ScreenTarget,
  highlight: boolean,
): Record<string, unknown> {
  return {
    to: 'ExponentPushToken[…]',
    title,
    body,
    data: highlight ? { screen, highlight: true } : { screen },
    sound: 'default',
    priority: 'high',
    channelId: 'default',
  };
}

export interface Preset {
  label: string;
  title: string;
  body: string;
  screen: ScreenTarget;
  highlight: boolean;
}

/** Quick-fill templates so common notifications are one click. */
export const PRESETS: Preset[] = [
  { label: 'Open Screen 1', title: 'SWAG', body: 'Jump to Screen 1', screen: '1', highlight: false },
  { label: 'Open Screen 2', title: 'SWAG', body: 'Jump to Screen 2', screen: '2', highlight: false },
  { label: 'Open Screen 3', title: 'SWAG', body: 'Jump to Screen 3', screen: '3', highlight: false },
  {
    label: 'Screen 2 + highlight',
    title: 'SWAG',
    body: 'Screen 2 with highlight param',
    screen: '2',
    highlight: true,
  },
];
