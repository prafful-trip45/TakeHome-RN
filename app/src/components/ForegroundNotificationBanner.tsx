import { memo, useCallback, useEffect, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Linking from 'expo-linking';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { reportNotificationOpened } from '../services/notifications/notificationService';
import { useAppStore } from '../store/useAppStore';
import { logger } from '../utils/logger';

/** Auto-dismiss delay for an untouched banner. */
const AUTO_DISMISS_MS = 5000;
/** Slide/fade animation duration. */
const ANIM_MS = 220;

/**
 * In-app banner for notifications that arrive while the app is foregrounded.
 * Android does not render an OS heads-up banner over our own app, so without this
 * a foreground push is invisible — this is the visible surface for that case.
 *
 * Tap replays the pre-resolved deep-link URL through `Linking.openURL`, which the
 * `linking` resolver's `subscribe` handler picks up — so routing stays the single
 * source of truth (linkingConfig.ts), exactly as a background tap would route.
 * Renders null when there's nothing to show.
 */
function ForegroundNotificationBannerImpl(): React.ReactElement | null {
  const insets = useSafeAreaInsets();
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
      style={[styles.wrap, { top: insets.top + 8, opacity, transform: [{ translateY }] }]}
    >
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={
          routable
            ? `Notification: ${notification.title ?? ''}. ${notification.body ?? ''}. Tap to open.`
            : `Notification: ${notification.title ?? ''}. ${notification.body ?? ''}`
        }
        style={styles.card}
      >
        <View style={styles.content}>
          {notification.title ? (
            <Text style={styles.title} numberOfLines={1}>
              {notification.title}
            </Text>
          ) : null}
          {notification.body ? (
            <Text style={styles.body} numberOfLines={2}>
              {notification.body}
            </Text>
          ) : null}
        </View>
        <Pressable
          onPress={dismiss}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Dismiss notification"
          style={styles.close}
        >
          <Text style={styles.closeLabel}>✕</Text>
        </Pressable>
      </Pressable>
    </Animated.View>
  );
}

export const ForegroundNotificationBanner = memo(ForegroundNotificationBannerImpl);

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 200,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: '#111827',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#374151',
    // Subtle elevation so it reads as an overlay above the screen content.
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  content: { flex: 1 },
  title: { color: '#ffffff', fontSize: 14, fontWeight: '700' },
  body: { color: '#d1d5db', fontSize: 13, marginTop: 2 },
  close: { paddingHorizontal: 4, paddingVertical: 2 },
  closeLabel: { color: '#9ca3af', fontSize: 15, fontWeight: '600' },
});
