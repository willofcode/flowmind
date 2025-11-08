/**
 * Profile/Settings Icon Button
 * Appears in tab headers for accessing user profile and settings
 */

import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

export function ProfileIconButton() {
  const colorScheme = useColorScheme();
  const router = useRouter();

  const handlePress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Navigate to profile/settings modal
    router.push('/modal');
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={styles.button}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <IconSymbol
        name="person.circle"
        size={28}
        color={Colors[colorScheme ?? 'light'].tint}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    marginRight: 16,
    padding: 4,
  },
});
