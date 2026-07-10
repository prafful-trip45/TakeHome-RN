import { Routes } from './routes';
import type { DeepLinkScreen } from './routes';

/** Pure deep-link helpers (no Expo/native imports → unit-testable in isolation). */

const SCREEN_TO_NUMBER: Record<DeepLinkScreen, 1 | 2 | 3> = {
  [Routes.Screen1]: 1,
  [Routes.Screen2]: 2,
  [Routes.Screen3]: 3,
};

/**
 * Normalize a `screen` value from a deep link or notification payload to a route.
 * Accepts `1`, `'2'`, `'Screen3'`, `'screen 1'`, etc. Returns null if unrecognized
 * so the caller no-ops instead of navigating somewhere wrong.
 */
export function parseScreen(value: unknown): DeepLinkScreen | null {
  if (value == null) return null;
  const digits = String(value).replace(/\D/g, '');
  switch (digits) {
    case '1':
      return Routes.Screen1;
    case '2':
      return Routes.Screen2;
    case '3':
      return Routes.Screen3;
    default:
      return null;
  }
}

/** Route → URL path segment (`Screen2` → `screen/2`). */
export function screenToPath(screen: DeepLinkScreen): string {
  return `screen/${SCREEN_TO_NUMBER[screen]}`;
}

/** Build a canonical deep-link URL, used to bridge notification taps into linking. */
export function buildScreenUrl(screen: DeepLinkScreen, highlight?: boolean): string {
  const query = highlight ? '?highlight=true' : '';
  return `swagassignment://${screenToPath(screen)}${query}`;
}
