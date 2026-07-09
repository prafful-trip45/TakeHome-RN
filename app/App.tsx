// Must be imported before anything renders: holds the native splash via
// preventAutoHideAsync at module scope (SDK 57 guidance).
import './src/services/splash/splashController';

import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { DevPanel } from './src/components/DevPanel';
import { UpdateBanner } from './src/components/UpdateBanner';
import { UpdateGateModal } from './src/components/UpdateGateModal';
import { useBootstrap } from './src/hooks/useBootstrap';
import { useNotifications } from './src/hooks/useNotifications';
import { NavigationComponent } from './src/navigation/NavigationComponent';

/**
 * Provider nesting mirrors the reference app:
 *   GestureHandlerRootView -> SafeAreaProvider(initialWindowMetrics) -> NavigationComponent
 * Splash hides only when bootstrap (useBootstrap) AND navigation (onReady) are
 * both done — see splashController. Sentry.wrap wraps this in M7.
 */
export default function App() {
  useBootstrap();
  // Task 3 (M4): channel → permission → token → admin registration (post-render,
  // never blocks splash). Tap routing lives in linkingConfig (D8), not here.
  useNotifications();

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <NavigationComponent />
        {/* Task 6 (M5): OTA overlay — mounts the launch/resume update checks and
            shows a consent banner when an update is ready. Renders null otherwise. */}
        <UpdateBanner />
        {/* Task 8 (M6): native/binary update gate — mounts the launch/resume config
            checks; blocking modal (forced) / consent prompt (optional). Distinct
            from the OTA banner above: OTA = new JS in the same binary. */}
        <UpdateGateModal />
        {/* Task 3: token display/copy + permission diagnostics (M7 adds crash buttons). */}
        <DevPanel />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
