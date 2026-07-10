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
 * Provider nesting:
 *   GestureHandlerRootView -> SafeAreaProvider(initialWindowMetrics) -> NavigationComponent
 * Splash hides only when bootstrap (useBootstrap) and navigation (onReady) are
 * both done — see splashController. Sentry.wrap wraps this in index.ts.
 */
export default function App() {
  useBootstrap();
  // Notifications: channel → permission → token → admin registration
  // (post-render, never blocks splash). Tap routing lives in linkingConfig.
  useNotifications();

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <NavigationComponent />
        {/* OTA overlay — mounts the launch/resume update checks and shows a
            consent banner when an update is ready. Renders null otherwise. */}
        <UpdateBanner />
        {/* Native/binary update gate — mounts the launch/resume config checks;
            blocking modal (forced) / consent prompt (optional). Distinct from the
            OTA banner above: OTA = new JS in the same binary. */}
        <UpdateGateModal />
        {/* Token display/copy + permission diagnostics + crash-test buttons. */}
        <DevPanel />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
