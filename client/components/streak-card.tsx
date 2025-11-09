/**
 * Streak Card Component
 * Shows user's calm/completion streak
 * - 1-7: Shows dots
 * - 8+: Shows star with number and subtle pulse animation
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { CalmColors, CalmSpacing } from '@/constants/calm-theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { StreakData } from '@/types/neuro-profile';

interface StreakCardProps {
  streak: StreakData;
  reducedAnimation?: boolean;
}

export function StreakCard({ streak, reducedAnimation = false }: StreakCardProps) {
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? CalmColors.dark : CalmColors.light;
  
  const scale = useSharedValue(1);

  // Safety check: ensure streak values are valid numbers
  const currentStreak = Number.isFinite(streak.currentStreak) ? streak.currentStreak : 0;
  const longestStreak = Number.isFinite(streak.longestStreak) ? streak.longestStreak : 0;

  useEffect(() => {
    // Only animate if streak > 7 and animations are enabled
    if (currentStreak > 7 && !reducedAnimation) {
      scale.value = withRepeat(
        withTiming(1.15, {
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
        }),
        -1, // infinite
        true // reverse
      );
    } else {
      scale.value = 1;
    }
  }, [currentStreak, reducedAnimation]);

  const animatedStarStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surfaceElevated,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={styles.header}>
        <Text style={[styles.label, { color: colors.text }]}>
          Your Calm Streak
        </Text>
        {longestStreak > currentStreak && (
          <Text style={[styles.bestLabel, { color: colors.textTertiary }]}>
            Best: {longestStreak}
          </Text>
        )}
      </View>

      {/* Streak Display */}
      {currentStreak <= 7 ? (
        // Show dots for 1-7
        <View style={styles.dotsRow}>
          {Array.from({ length: Math.max(0, currentStreak) }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor: colors.primary,
                },
              ]}
            />
          ))}
          {/* Empty dots for remaining */}
          {Array.from({ length: Math.max(0, 7 - currentStreak) }).map((_, i) => (
            <View
              key={`empty-${i}`}
              style={[
                styles.dot,
                styles.dotEmpty,
                {
                  borderColor: colors.border,
                },
              ]}
            />
          ))}
        </View>
      ) : (
        // Show star + number for 8+
        <View style={styles.starRow}>
          <Animated.Text style={[styles.star, animatedStarStyle]}>
            ⭐
          </Animated.Text>
          <Text style={[styles.streakNumber, { color: colors.text }]}>
            {currentStreak}
          </Text>
        </View>
      )}

      {/* Encouragement Text */}
      <Text style={[styles.encouragement, { color: colors.textSecondary }]}>
        {currentStreak === 0 && 'Start your streak today!'}
        {currentStreak === 1 && 'Great start! Keep going.'}
        {currentStreak >= 2 && currentStreak <= 6 && 'You\'re building momentum!'}
        {currentStreak === 7 && 'One full week! Amazing!'}
        {currentStreak > 7 && 'Incredible consistency! 🎉'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: CalmSpacing.lg,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: CalmSpacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: CalmSpacing.md,
  },
  label: {
    fontSize: 18,
    fontWeight: '600',
  },
  bestLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: CalmSpacing.sm,
    marginVertical: CalmSpacing.md,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  dotEmpty: {
    backgroundColor: 'transparent',
    borderWidth: 2,
  },
  starRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: CalmSpacing.md,
    marginVertical: CalmSpacing.lg,
  },
  star: {
    fontSize: 36,
  },
  streakNumber: {
    fontSize: 36,
    fontWeight: '700',
  },
  encouragement: {
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
