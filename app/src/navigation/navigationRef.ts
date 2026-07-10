import { createNavigationContainerRef } from '@react-navigation/native';
import { logger } from '../utils/logger';
import { Routes } from './routes';
import type { DeepLinkScreen, RootStackParamList, TabScreenParams } from './routes';

/** Container ref for imperative navigation from outside React (deep links,
 *  notification taps). */
export const navigationRef = createNavigationContainerRef<RootStackParamList>();

/**
 * Actions requested before the container is ready — e.g. a killed/cold-start
 * notification tap that resolves before the nav tree mounts — are queued and
 * flushed on NavigationContainer `onReady`. Key to correct killed-state routing.
 */
type PendingAction = () => void;
const pendingActions: PendingAction[] = [];

function runWhenReady(action: PendingAction): void {
  if (navigationRef.isReady()) {
    action();
  } else {
    pendingActions.push(action);
  }
}

export function flushPendingNavigation(): void {
  if (!navigationRef.isReady()) return;
  while (pendingActions.length > 0) {
    pendingActions.shift()?.();
  }
}

/** Navigate to a tab screen. Safe to call before the nav tree has mounted. */
export function navigateToScreen(screen: DeepLinkScreen, params?: TabScreenParams): void {
  logger.debug('nav', `navigateToScreen -> ${screen}`, params);
  runWhenReady(() => {
    navigationRef.navigate(Routes.Tabs, { screen, params });
  });
}
