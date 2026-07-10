import { useCallback, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { analyticsEvents } from '../services/analytics/analyticsService';
import { splashController } from '../services/splash/splashController';
import { logger } from '../utils/logger';
import { BottomTabs } from './BottomTabs';
import { linking } from './linkingConfig';
import { flushPendingNavigation, navigationRef } from './navigationRef';
import { Routes } from './routes';
import type { RootStackParamList } from './routes';

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * The single NavigationContainer + root native-stack. The tab navigator is the
 * only root screen for now; modal/error roots can be added later. Queued
 * deep-link/notification navigation flushes on `onReady`.
 */
export function NavigationComponent() {
  // screen_view analytics — fires once per focused-route change (the ref dedupes
  // tab re-presses / param-only updates). No-ops when Firebase is unavailable.
  const lastRouteRef = useRef<string | undefined>(undefined);
  const trackCurrentRoute = useCallback(() => {
    const name = navigationRef.isReady() ? navigationRef.getCurrentRoute()?.name : undefined;
    if (name && name !== lastRouteRef.current) {
      lastRouteRef.current = name;
      analyticsEvents.screenView(name);
    }
  }, []);

  return (
    <NavigationContainer
      ref={navigationRef}
      linking={linking}
      onStateChange={trackCurrentRoute}
      onReady={() => {
        logger.debug('nav', 'container ready');
        flushPendingNavigation();
        splashController.markNavigationReady();
        trackCurrentRoute();
      }}
    >
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name={Routes.Tabs} component={BottomTabs} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
