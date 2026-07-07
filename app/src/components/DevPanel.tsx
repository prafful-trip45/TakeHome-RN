import { memo, useCallback, useEffect, useState } from 'react';
import { Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { isAnalyticsEnabled } from '../services/analytics/analyticsService';
import { syncNotifications } from '../services/notifications/notificationService';
import {
  isSentryEnabled,
  triggerNativeCrash,
  triggerTestError,
} from '../services/sentry/sentryService';
import {
  checkVersionGate,
  getInstalledVersion,
  resetGatePersistence,
} from '../services/versionGate/versionGateService';
import { useAppStore } from '../store/useAppStore';
import { logger } from '../utils/logger';

/**
 * Dev/diagnostics overlay (spec: "display the Expo push token somewhere in-app
 * so it can be copied/registered with the admin panel"). Kept as an overlay so
 * the three screens stay pure centered text (task 1). M7 adds the
 * test-crash/test-error buttons here.
 */
function DevPanelBase() {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const pushToken = useAppStore((s) => s.pushToken);
  const permission = useAppStore((s) => s.permission);
  const tokenStatus = useAppStore((s) => s.tokenStatus);
  const tokenError = useAppStore((s) => s.tokenError);
  const adminRegistration = useAppStore((s) => s.adminRegistration);
  const gatePhase = useAppStore((s) => s.gatePhase);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  const copyToken = useCallback(async () => {
    if (!pushToken) return;
    try {
      await Clipboard.setStringAsync(pushToken);
      setCopied(true);
    } catch (err) {
      logger.warn('devpanel', 'clipboard copy failed', err);
    }
  }, [pushToken]);

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open developer panel"
        onPress={() => setOpen(true)}
        style={[styles.fab, { top: insets.top + 8 }]}>
        <Text style={styles.fabLabel}>i</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.backdrop}>
          <View style={styles.card}>
            <Text style={styles.heading}>Diagnostics</Text>

            <Text style={styles.label}>Notification permission</Text>
            <Text style={styles.value}>{permission}</Text>

            <Text style={styles.label}>Expo push token — tap to copy</Text>
            <Pressable onPress={copyToken} disabled={!pushToken}>
              <Text style={styles.token} numberOfLines={3}>
                {pushToken ?? `(${tokenStatus}${tokenError ? `: ${tokenError}` : ''})`}
              </Text>
            </Pressable>
            {copied && <Text style={styles.copied}>Copied ✓</Text>}

            <Text style={styles.label}>Admin registration</Text>
            <Text style={styles.value}>{adminRegistration}</Text>

            <Text style={styles.label}>Update gate (task 8)</Text>
            <Text style={styles.value}>
              v{getInstalledVersion()} · {gatePhase}
            </Text>
            <Pressable style={styles.button} onPress={() => void checkVersionGate()}>
              <Text style={styles.buttonLabel}>Re-check update gate</Text>
            </Pressable>
            <Pressable
              style={[styles.button, styles.closeButton]}
              onPress={() => {
                resetGatePersistence();
                void checkVersionGate();
              }}>
              <Text style={styles.buttonLabel}>Reset gate persistence (demo)</Text>
            </Pressable>

            <Text style={styles.label}>Observability (task 10)</Text>
            <Text style={styles.value}>
              Sentry: {isSentryEnabled() ? 'enabled' : 'off (no DSN)'} · Analytics:{' '}
              {isAnalyticsEnabled() ? 'enabled' : 'off (no Firebase config)'}
            </Text>
            <Pressable style={styles.button} onPress={triggerTestError}>
              <Text style={styles.buttonLabel}>Send test error (captured)</Text>
            </Pressable>
            <Pressable
              style={styles.button}
              onPress={() => {
                // Unhandled on purpose: proves the global JS error handler +
                // Sentry capture path (in dev the RedBox intercepts first —
                // verify on a release/preview build).
                throw new Error('SWAG unhandled JS error — DevPanel');
              }}>
              <Text style={styles.buttonLabel}>Throw unhandled JS error</Text>
            </Pressable>
            <Pressable style={styles.button} onPress={triggerNativeCrash}>
              <Text style={styles.buttonLabel}>Trigger native crash (kills app)</Text>
            </Pressable>

            {permission === 'denied' && (
              <Pressable style={styles.button} onPress={() => void Linking.openSettings()}>
                <Text style={styles.buttonLabel}>Open Settings to enable notifications</Text>
              </Pressable>
            )}
            <Pressable style={styles.button} onPress={() => void syncNotifications()}>
              <Text style={styles.buttonLabel}>Retry sync</Text>
            </Pressable>
            <Pressable style={[styles.button, styles.closeButton]} onPress={() => setOpen(false)}>
              <Text style={styles.buttonLabel}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

export const DevPanel = memo(DevPanelBase);

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#11182799',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  fabLabel: { color: '#9ca3af', fontSize: 15, fontStyle: 'italic', fontWeight: '700' },
  backdrop: {
    flex: 1,
    backgroundColor: '#000000aa',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    alignSelf: 'stretch',
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 20,
    gap: 4,
  },
  heading: { color: '#ffffff', fontSize: 18, fontWeight: '700', marginBottom: 8 },
  label: { color: '#6b7280', fontSize: 11, textTransform: 'uppercase', marginTop: 10 },
  value: { color: '#e5e7eb', fontSize: 14 },
  token: { color: '#a5b4fc', fontSize: 12, fontFamily: 'monospace' },
  copied: { color: '#34d399', fontSize: 12, marginTop: 2 },
  button: {
    marginTop: 14,
    backgroundColor: '#4f46e5',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  closeButton: { backgroundColor: '#374151', marginTop: 8 },
  buttonLabel: { color: '#ffffff', fontSize: 13, fontWeight: '600' },
});
