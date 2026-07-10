import { memo, useCallback, useEffect, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  Pressable,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import * as Linking from 'expo-linking';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { reportNotificationOpened } from '../services/notifications/notificationService';
import { useAppStore } from '../store/useAppStore';
import { logger } from '../utils/logger';

/** Auto-dismiss delay for an untouched banner. */
const AUTO_DISMISS_MS = 5000;
/** Slide/fade animation duration. */
const ANIM_MS = 220;

/** App name shown in the notification header (matches OS heads-up styling). */
const APP_NAME = 'SWAG';
/** Small app glyph shown in the header, like the OS status-bar notification. */
const APP_ICON = require('../../assets/notification-icon.png');

/**
 * In-app banner for notifications that arrive while the app is foregrounded.
 * Android does not render an OS heads-up banner over our own app, so without this
 * a foreground push is invisible — this is the visible surface for that case.
 *
 * Styled to mirror a native Android 13+ heads-up notification: a header row with
 * the app icon, app name, and "now" timestamp, then the title + body — on a
 * rounded Material-You-style surface that adapts to the OS light/dark theme.
 *
 * Tap replays the pre-resolved deep-link URL through `Linking.openURL`, which the
 * `linking` resolver's `subscribe` handler picks up — so routing stays the single
 * source of truth (linkingConfig.ts), exactly as a background tap would route.
 * Renders null when there's nothing to show.
 */
function ForegroundNotificationBannerImpl(): React.ReactElement | null {
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const theme = scheme === 'light' ? lightTheme : darkTheme;
  const notification = useAppStore((s) => s.foregroundNotification);
  const clear = useAppStore((s) => s.setForegroundNotification);

  // Lazy-init so each instance keeps one stable Animated.Value across renders
  // (useState initializer runs once) without touching a ref during render.
  const [translateY] = useState(() => new Animated.Value(-120));
  const [opacity] = useState(() => new Animated.Value(0));

  const dismiss = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -120,
        duration: ANIM_MS,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: ANIM_MS,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      // Only clear if this animation ran to completion (not interrupted by a new
      // banner arriving), so a fresh notification isn't wiped mid-slide-in.
      if (finished) clear(null);
    });
  }, [translateY, opacity, clear]);

  const onPress = useCallback(() => {
    // Tapping an in-app banner is a notification "open" just like an OS tap — the
    // linking subscribe handler only fires for OS taps, so report it here.
    if (notification?.url) {
      reportNotificationOpened(notification.screen);
      Linking.openURL(notification.url).catch((err) =>
        logger.warn('notifications', 'foreground banner openURL failed', err),
      );
    }
    dismiss();
  }, [notification, dismiss]);

  // Animate in on each new notification id; arm the auto-dismiss timer.
  useEffect(() => {
    if (!notification) return;
    translateY.setValue(-120);
    opacity.setValue(0);
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: ANIM_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: ANIM_MS,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(dismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
    // Keyed on id so an identical re-send re-runs the entrance + timer.
  }, [notification?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!notification) return null;

  const routable = Boolean(notification.url);

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[styles.wrap, { top: insets.top + 6, opacity, transform: [{ translateY }] }]}
    >
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={
          routable
            ? `${APP_NAME} notification: ${notification.title ?? ''}. ${notification.body ?? ''}. Tap to open.`
            : `${APP_NAME} notification: ${notification.title ?? ''}. ${notification.body ?? ''}`
        }
        android_ripple={{ color: theme.ripple }}
        style={[styles.card, { backgroundColor: theme.surface }]}
      >
        {/* Header row: app icon · app name · "now" — mirrors the OS heads-up header. */}
        <View style={styles.header}>
          <Image
            source={APP_ICON}
            style={[styles.appIcon, { tintColor: theme.iconTint }]}
            resizeMode="contain"
          />
          <Text style={[styles.appName, { color: theme.subtle }]} numberOfLines={1}>
            {APP_NAME}
          </Text>
          <Text style={[styles.dot, { color: theme.subtle }]}>·</Text>
          <Text style={[styles.time, { color: theme.subtle }]}>now</Text>
          <View style={styles.headerSpacer} />
          <Pressable
            onPress={dismiss}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Dismiss notification"
            style={styles.close}
          >
            <Text style={[styles.closeLabel, { color: theme.subtle }]}>✕</Text>
          </Pressable>
        </View>

        {/* Body: title (emphasized) + message, like a standard notification. */}
        {notification.title ? (
          <Text style={[styles.title, { color: theme.title }]} numberOfLines={1}>
            {notification.title}
          </Text>
        ) : null}
        {notification.body ? (
          <Text style={[styles.body, { color: theme.body }]} numberOfLines={3}>
            {notification.body}
          </Text>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

export const ForegroundNotificationBanner = memo(ForegroundNotificationBannerImpl);

/** Native-heads-up palettes for the OS light/dark themes. */
const darkTheme = {
  surface: '#1F1F22',
  title: '#F5F5F5',
  body: '#C7C7CC',
  subtle: '#9A9AA0',
  iconTint: '#C7C7CC',
  ripple: '#FFFFFF22',
};
const lightTheme = {
  surface: '#FFFFFF',
  title: '#1A1A1A',
  body: '#4A4A4A',
  subtle: '#6B6B6F',
  iconTint: '#6B6B6F',
  ripple: '#00000014',
};

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 8,
    right: 8,
    zIndex: 200,
  },
  card: {
    // Material-You notification shape: generous radius + soft elevation.
    borderRadius: 28,
    paddingVertical: 14,
    paddingHorizontal: 18,
    // Elevation/shadow tuned to read as a floating OS notification.
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  appIcon: {
    width: 16,
    height: 16,
    marginRight: 7,
  },
  appName: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
    maxWidth: '55%',
  },
  dot: { fontSize: 12, marginHorizontal: 5 },
  time: { fontSize: 12 },
  headerSpacer: { flex: 1 },
  close: { paddingHorizontal: 2, paddingVertical: 2 },
  closeLabel: { fontSize: 14, fontWeight: '600' },
  title: { fontSize: 15, fontWeight: '700', marginTop: 1 },
  body: { fontSize: 14, lineHeight: 19, marginTop: 2 },
});
