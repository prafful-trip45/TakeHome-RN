import { memo, useCallback } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { setStatusBarStyle } from 'expo-status-bar';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { StatusBarStyle } from 'expo-status-bar';
import type { TabScreenParams } from '../navigation/routes';

// Shared body across all three screens so the status bar is the only per-screen variable.
const SHARED_BACKGROUND = '#2a2d34';
const SHARED_TEXT = '#ffffff';

interface ScreenScaffoldProps {
  title: string;
  /** Color painted into the top safe-area inset — i.e. the status bar region. */
  statusBarColor: string;
  /** OS status bar icon/text color (light icons vs dark icons). */
  statusBarStyle: StatusBarStyle;
}

/**
 * Centered-title screen with a per-screen status bar.
 *
 * Status bar style is set imperatively on focus, not on mount: bottom-tabs keep
 * visited screens mounted, so multiple mounted <StatusBar/> would fight and go
 * stale on back-navigation. A focus effect re-asserts it on every focus.
 *
 * Android is edge-to-edge on SDK 57 (translucent native status bar, no settable
 * background), so we paint the top inset ourselves for a distinct per-screen color;
 * barStyle flips with it to keep OS icons legible.
 *
 * A `?highlight=true` deep link (or notification `data.highlight`) arrives as
 * `route.params.highlight`; the screen marks its title in response.
 */
function ScreenScaffoldBase({ title, statusBarColor, statusBarStyle }: ScreenScaffoldProps) {
  const insets = useSafeAreaInsets();
  // useRoute resolves to the enclosing tab screen, whose params carry `highlight`.
  const highlight = (useRoute().params as TabScreenParams)?.highlight ?? false;

  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle(statusBarStyle, true);
    }, [statusBarStyle]),
  );

  return (
    <View style={[styles.container, { backgroundColor: SHARED_BACKGROUND }]}>
      <View
        style={[styles.statusBarBand, { height: insets.top, backgroundColor: statusBarColor }]}
      />
      <View style={styles.center}>
        <Text style={[styles.title, { color: SHARED_TEXT }, highlight && styles.titleHighlighted]}>
          {highlight ? `${title} ✨` : title}
        </Text>
      </View>
    </View>
  );
}

export const ScreenScaffold = memo(ScreenScaffoldBase);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // Overlays the status bar region; OS icons draw on top.
  statusBarBand: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  // Pill behind the title when the highlight param is set.
  titleHighlighted: {
    backgroundColor: 'rgba(99,102,241,0.35)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
    overflow: 'hidden',
  },
});
