import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

/**
 * Detached, rounded (pill) bottom bar with margin + shadow that respects
 * safe-area insets so it never overlaps the home indicator / gesture bar (task 1).
 * Active tab is indicated by a filled pill + brightened label.
 */
function FloatingTabBarBase({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View pointerEvents="box-none" style={[styles.container, { bottom: insets.bottom + 16 }]}>
      <View style={styles.pill}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label = options.title ?? route.name;
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              accessibilityRole="button"
              accessibilityState={{ selected: isFocused }}
              accessibilityLabel={label}
              style={[styles.item, isFocused && styles.itemActive]}>
              <Text style={[styles.label, isFocused && styles.labelActive]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export const FloatingTabBar = memo(FloatingTabBarBase);

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827',
    borderRadius: 999,
    marginHorizontal: 24,
    paddingHorizontal: 6,
    paddingVertical: 6,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  item: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
  },
  itemActive: {
    backgroundColor: '#4f46e5',
  },
  label: {
    color: '#9ca3af',
    fontSize: 13,
    fontWeight: '600',
  },
  labelActive: {
    color: '#ffffff',
  },
});
