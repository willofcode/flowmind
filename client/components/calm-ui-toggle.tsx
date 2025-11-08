/**
 * Calm UI Toggle - Switch between standard and reduced-stimulation mode
 */

import React from 'react';
import { View, Text, Switch, StyleSheet, useColorScheme } from 'react-native';
import { CalmColors, CalmSpacing, CalmTypography, CalmBorderRadius } from '../constants/calm-theme';

interface CalmUIToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}

export function CalmUIToggle({ enabled, onChange }: CalmUIToggleProps) {
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? CalmColors.dark : CalmColors.light;

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <View style={styles.content}>
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: colors.text }]}>Calm UI Mode</Text>
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            Reduced motion, high contrast, larger touch targets
          </Text>
        </View>
        <Switch
          value={enabled}
          onValueChange={onChange}
          trackColor={{
            false: colors.disabled,
            true: colors.primary,
          }}
          thumbColor="#FFFFFF"
          ios_backgroundColor={colors.disabled}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: CalmBorderRadius.lg,
    padding: CalmSpacing.lg,
    marginBottom: CalmSpacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  textContainer: {
    flex: 1,
    marginRight: CalmSpacing.md,
  },
  title: {
    fontSize: CalmTypography.fontSize.lg,
    fontWeight: CalmTypography.fontWeight.semibold as any,
    marginBottom: CalmSpacing.xs,
  },
  description: {
    fontSize: CalmTypography.fontSize.sm,
    lineHeight: CalmTypography.fontSize.sm * CalmTypography.lineHeight.relaxed,
  },
});
