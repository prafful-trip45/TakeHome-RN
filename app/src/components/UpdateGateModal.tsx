import { memo } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useVersionGate } from '../services/versionGate/useVersionGate';
import {
  acknowledgeInstalled,
  dismissOptionalUpdate,
  getInstalledVersion,
  installMockUpdate,
  openStoreFallback,
  startMockDownload,
} from '../services/versionGate/versionGateService';
import { GatePhase, useAppStore } from '../store/useAppStore';

/**
 * Native/binary update gate UI (task 8 / M6). Renders null on the happy path.
 *
 *  - forced   → blocking modal: no dismiss action, onRequestClose no-ops
 *               (Android back does nothing) — usage is blocked until "updated".
 *  - optional → consent modal: Update now / Not now (dismissal persisted).
 *  - then the MOCKED in-app flow: downloading (fake progress) → ready →
 *    installing → installed — the user never leaves the app (spec-allowed mock).
 *  - fallback → "Open store page" link (placeholder URL), the documented branch
 *    for when an in-app update path is unavailable.
 *
 * Also mounts useVersionGate (launch/resume checks) — the single gate entry
 * point in the tree, same pattern as UpdateBanner ↔ useOtaUpdates.
 */
function UpdateGateModalImpl(): React.ReactElement | null {
  useVersionGate();

  const phase = useAppStore((s) => s.gatePhase);
  const config = useAppStore((s) => s.gateConfig);
  const progress = useAppStore((s) => s.gateProgress);

  const visible =
    phase === GatePhase.Forced ||
    phase === GatePhase.Optional ||
    phase === GatePhase.Downloading ||
    phase === GatePhase.Ready ||
    phase === GatePhase.Installing ||
    phase === GatePhase.Installed;

  if (!visible || !config) return null;

  const dismissible = phase === GatePhase.Optional;

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      // Forced flow: Android back is swallowed; optional flow: back == "Not now".
      onRequestClose={dismissible ? dismissOptionalUpdate : () => undefined}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          {(phase === GatePhase.Forced || phase === GatePhase.Optional) && (
            <>
              <Text style={styles.heading}>
                {phase === GatePhase.Forced ? 'Update required' : 'Update available'}
              </Text>
              <Text style={styles.body}>
                {config.message ??
                  (phase === GatePhase.Forced
                    ? 'This version is no longer supported. Please update to continue.'
                    : 'A new version of SWAG is available.')}
              </Text>
              <Text style={styles.versions}>
                v{getInstalledVersion()} → v{config.latestVersion}
              </Text>
              <Pressable style={styles.primary} onPress={startMockDownload}>
                <Text style={styles.primaryLabel}>Update now</Text>
              </Pressable>
              {dismissible && (
                <Pressable style={styles.secondary} onPress={dismissOptionalUpdate}>
                  <Text style={styles.secondaryLabel}>Not now</Text>
                </Pressable>
              )}
              <Pressable onPress={() => void openStoreFallback()} hitSlop={8}>
                <Text style={styles.fallback}>Open store page instead</Text>
              </Pressable>
            </>
          )}

          {phase === GatePhase.Downloading && (
            <>
              <Text style={styles.heading}>Downloading update…</Text>
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${Math.round(progress * 100)}%` }]} />
              </View>
              <Text style={styles.body}>{Math.round(progress * 100)}% (simulated)</Text>
            </>
          )}

          {phase === GatePhase.Ready && (
            <>
              <Text style={styles.heading}>Update ready</Text>
              <Text style={styles.body}>v{config.latestVersion} has been downloaded.</Text>
              <Pressable style={styles.primary} onPress={installMockUpdate}>
                <Text style={styles.primaryLabel}>Install & restart</Text>
              </Pressable>
            </>
          )}

          {phase === GatePhase.Installing && (
            <>
              <Text style={styles.heading}>Installing…</Text>
              <Text style={styles.body}>Applying v{config.latestVersion} (simulated)</Text>
            </>
          )}

          {phase === GatePhase.Installed && (
            <>
              <Text style={styles.heading}>Up to date</Text>
              <Text style={styles.body}>
                You&apos;re now on v{config.latestVersion} (simulated install).
              </Text>
              <Pressable style={styles.primary} onPress={acknowledgeInstalled}>
                <Text style={styles.primaryLabel}>Continue</Text>
              </Pressable>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

export const UpdateGateModal = memo(UpdateGateModalImpl);

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: '#000000cc',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    alignSelf: 'stretch',
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 22,
    gap: 10,
  },
  heading: { color: '#ffffff', fontSize: 18, fontWeight: '700' },
  body: { color: '#d1d5db', fontSize: 14 },
  versions: { color: '#9ca3af', fontSize: 12, fontFamily: 'monospace' },
  primary: {
    marginTop: 6,
    backgroundColor: '#4f46e5',
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },
  primaryLabel: { color: '#ffffff', fontSize: 14, fontWeight: '600' },
  secondary: {
    backgroundColor: '#374151',
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },
  secondaryLabel: { color: '#e5e7eb', fontSize: 14, fontWeight: '600' },
  fallback: {
    color: '#93c5fd',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    textDecorationLine: 'underline',
  },
  track: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#374151',
    overflow: 'hidden',
  },
  fill: { height: '100%', backgroundColor: '#4f46e5' },
});
