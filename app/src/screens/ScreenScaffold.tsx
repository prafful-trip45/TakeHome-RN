import { memo, useCallback } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { setStatusBarStyle } from 'expo-status-bar';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { StatusBarStyle } from 'expo-status-bar';
import type { TabScreenParams } from '../navigation/routes';

/**
 * Shared body background + text for ALL three screens, so the *status bar* is the
 * only thing that varies per screen (task 9) — it can be verified in isolation,
 * not confounded by a different screen background each time.
 */
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
 * Shared plain screen: centered title + a per-screen status bar (task 9).
 *
 * `barStyle` is set imperatively on FOCUS, not declaratively on mount: bottom-tabs
 * keep visited screens mounted, so multiple mounted <StatusBar/> components would
 * fight (last-mounted wins) and go stale on back-navigation. A focus effect
 * re-asserts the style on every focus, in both directions.
 *
 * Android is edge-to-edge on SDK 57 (the native status bar is translucent and has
 * no settable background), so we paint the top inset ourselves to give each screen
 * a distinct, verifiable status bar color while the body stays identical. `barStyle`
 * flips with it so the OS icons/clock stay legible against each band.
 *
 * Deep-link params bonus (task 4): a `?highlight=true` link (or notification
 * `data.highlight`) arrives as `route.params.highlight` — the screen reacts by
 * marking its title, proving the param is carried end-to-end and consumed.
 */
function ScreenScaffoldBase({ title, statusBarColor, statusBarStyle }: ScreenScaffoldProps) {
  const insets = useSafeAreaInsets();
  // `useRoute` here resolves to the enclosing tab screen (Screen1/2/3), so its
  // params carry the parsed `highlight` flag from the deep link / notification.
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
  // Overlays the status bar region (y=0..insets.top); OS icons draw on top of it.
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
  // Deep-link highlight reaction: an unmistakable pill behind the title.
  titleHighlighted: {
    backgroundColor: 'rgba(99,102,241,0.35)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
    overflow: 'hidden',
  },
});
