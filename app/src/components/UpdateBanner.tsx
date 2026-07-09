import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useOtaUpdates } from '../services/updates/useOtaUpdates';
import { OtaPhase } from '../services/updates/types';

/**
 * Non-blocking consent prompt for a ready OTA (task 6 / M5). Renders null unless
 * an update is pending, so it costs nothing on the happy path. Reload is
 * user-initiated — respects consent and avoids the experimental backgrounded
 * reloadAsync() path. This component also mounts useOtaUpdates (the launch +
 * resume checks), so it is the single OTA entry point in the tree.
 */
function UpdateBannerImpl(): React.ReactElement | null {
  const { phase, reload } = useOtaUpdates();
  const insets = useSafeAreaInsets();

  if (phase !== OtaPhase.Ready) return null;

  return (
    <View style={[styles.banner, { top: insets.top + 8 }]}>
      <Text style={styles.text}>A new version is ready.</Text>
      <Pressable onPress={reload} hitSlop={8} accessibilityRole="button">
        <Text style={styles.action}>Reload</Text>
      </Pressable>
    </View>
  );
}

export const UpdateBanner = memo(UpdateBannerImpl);

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 100,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#111',
  },
  text: { color: '#fff' },
  action: { color: '#4da3ff', fontWeight: '600' },
});
