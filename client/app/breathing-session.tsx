/**
 * Breathing Session Screen
 * Animated breathing timer with color transitions
 * Follows calm UI principles with gentle animations
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  interpolateColor,
} from 'react-native-reanimated';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { CalmColors, CalmSpacing } from '@/constants/calm-theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type BreathingProtocol = 'box' | 'rescue';

interface BreathingPhase {
  name: string;
  duration: number; // seconds
  instruction: string;
}

const PROTOCOLS: Record<BreathingProtocol, BreathingPhase[]> = {
  box: [
    { name: 'Inhale', duration: 4, instruction: 'Breathe in slowly through your nose' },
    { name: 'Hold', duration: 4, instruction: 'Hold your breath gently' },
    { name: 'Exhale', duration: 4, instruction: 'Breathe out slowly through your mouth' },
    { name: 'Hold', duration: 4, instruction: 'Rest before the next breath' },
  ],
  rescue: [
    { name: 'Inhale', duration: 4, instruction: 'Breathe in deeply through your nose' },
    { name: 'Hold', duration: 7, instruction: 'Hold your breath comfortably' },
    { name: 'Exhale', duration: 8, instruction: 'Breathe out slowly, releasing tension' },
  ],
};

// Warm, calming colors for breathing states
const BREATHING_COLORS = {
  light: {
    inhale: '#4A9BAF', // Calm blue
    hold: '#7ACF7D', // Soft green
    exhale: '#F59E0B', // Warm amber
    rest: '#B8B8B8', // Neutral gray
  },
  dark: {
    inhale: '#2D7A8F',
    hold: '#5AAF5D',
    exhale: '#D97706',
    rest: '#888888',
  },
};

export default function BreathingSessionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? CalmColors.dark : CalmColors.light;
  const breathColors = colorScheme === 'dark' ? BREATHING_COLORS.dark : BREATHING_COLORS.light;

  const protocol: BreathingProtocol = (params.protocol as BreathingProtocol) || 'box';
  const phases = PROTOCOLS[protocol];

  const [isActive, setIsActive] = useState(false);
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
  const [countdown, setCountdown] = useState(phases[0].duration);
  const [cyclesCompleted, setCyclesCompleted] = useState(0);

  const scale = useSharedValue(0.8);
  const colorProgress = useSharedValue(0);

  const currentPhase = phases[currentPhaseIndex];
  const totalCycles = 3; // Complete 3 full cycles

  // Get color based on phase
  const getPhaseColor = (phaseName: string) => {
    if (phaseName === 'Inhale') return breathColors.inhale;
    if (phaseName === 'Exhale') return breathColors.exhale;
    return breathColors.hold;
  };

  // Animated styles
  const circleStyle = useAnimatedStyle(() => {
    const currentColor = getPhaseColor(currentPhase.name);
    
    return {
      transform: [{ scale: scale.value }],
      backgroundColor: currentColor,
      opacity: withTiming(isActive ? 0.9 : 0.5, { duration: 500 }),
    };
  });

  // Start breathing animation
  const startBreathing = () => {
    setIsActive(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Animate based on phase
    if (currentPhase.name === 'Inhale') {
      scale.value = withTiming(1.2, {
        duration: currentPhase.duration * 1000,
        easing: Easing.inOut(Easing.ease),
      });
    } else if (currentPhase.name === 'Exhale') {
      scale.value = withTiming(0.6, {
        duration: currentPhase.duration * 1000,
        easing: Easing.inOut(Easing.ease),
      });
    } else {
      // Hold - subtle pulse
      scale.value = withTiming(scale.value, { duration: 100 });
    }
  };

  // Timer logic
  useEffect(() => {
    if (!isActive) return;

    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
        
        // Haptic feedback every second
        if (countdown <= 3) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      }, 1000);

      return () => clearTimeout(timer);
    } else {
      // Move to next phase
      const nextIndex = (currentPhaseIndex + 1) % phases.length;
      
      // Check if we completed a full cycle
      if (nextIndex === 0) {
        const newCycleCount = cyclesCompleted + 1;
        setCyclesCompleted(newCycleCount);
        
        if (newCycleCount >= totalCycles) {
          // Session complete!
          handleComplete();
          return;
        }
      }

      setCurrentPhaseIndex(nextIndex);
      setCountdown(phases[nextIndex].duration);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [countdown, isActive]);

  const handleComplete = () => {
    setIsActive(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    // Navigate back with success
    setTimeout(() => {
      router.back();
    }, 2000);
  };

  const handlePause = () => {
    setIsActive(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Close button */}
      <Pressable style={styles.closeButton} onPress={handleClose}>
        <IconSymbol name="xmark.circle.fill" size={32} color={colors.textSecondary} />
      </Pressable>

      {/* Progress indicator */}
      <View style={styles.progressContainer}>
        <Text style={[styles.cycleText, { color: colors.textSecondary }]}>
          Cycle {cyclesCompleted + 1} of {totalCycles}
        </Text>
      </View>

      {/* Breathing circle */}
      <View style={styles.circleContainer}>
        <Animated.View style={[styles.circle, circleStyle]}>
          <Text style={styles.countdownText}>{countdown}</Text>
        </Animated.View>
      </View>

      {/* Instructions */}
      <View style={styles.instructionContainer}>
        <Text style={[styles.phaseTitle, { color: colors.text }]}>
          {currentPhase.name}
        </Text>
        <Text style={[styles.instruction, { color: colors.textSecondary }]}>
          {currentPhase.instruction}
        </Text>
      </View>

      {/* Control button */}
      <Pressable
        style={({ pressed }) => [
          styles.controlButton,
          {
            backgroundColor: isActive ? colors.warning : colors.primary,
            opacity: pressed ? 0.8 : 1,
          },
        ]}
        onPress={isActive ? handlePause : startBreathing}
      >
        <Text style={styles.controlButtonText}>
          {!isActive && cyclesCompleted === 0 ? 'Start' : isActive ? 'Pause' : 'Resume'}
        </Text>
      </Pressable>

      {/* Completion message */}
      {cyclesCompleted >= totalCycles && (
        <View style={styles.completeContainer}>
          <Text style={[styles.completeText, { color: colors.success }]}>
            ✨ Session Complete! Well done.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: CalmSpacing.lg,
  },
  closeButton: {
    position: 'absolute',
    top: CalmSpacing.xl,
    right: CalmSpacing.lg,
    zIndex: 10,
  },
  progressContainer: {
    alignItems: 'center',
    marginTop: CalmSpacing.xxl,
    marginBottom: CalmSpacing.xl,
  },
  cycleText: {
    fontSize: 16,
    fontWeight: '600',
  },
  circleContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  circle: {
    width: 240,
    height: 240,
    borderRadius: 120,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  countdownText: {
    fontSize: 72,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  instructionContainer: {
    alignItems: 'center',
    paddingVertical: CalmSpacing.xl,
  },
  phaseTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: CalmSpacing.sm,
  },
  instruction: {
    fontSize: 18,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  controlButton: {
    paddingVertical: CalmSpacing.lg,
    paddingHorizontal: CalmSpacing.xl,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: CalmSpacing.lg,
    minHeight: CalmSpacing.comfortableTouchTarget,
    justifyContent: 'center',
  },
  controlButtonText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  completeContainer: {
    alignItems: 'center',
    padding: CalmSpacing.lg,
  },
  completeText: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
});
