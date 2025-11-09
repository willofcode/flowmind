/**
 * Task Bubble Component
 * Swipeable oval task card for Today tab
 * - Swipe right: Accept/Start task
 * - Swipe left: Skip task (with confirmation)
 */

import React from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import type { DayTask } from '@/types/neuro-profile';
import { CalmColors, CalmSpacing } from '@/constants/calm-theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface TaskBubbleProps {
  task: DayTask;
  onAccept: (taskId: string) => void;
  onSkip: (taskId: string) => void;
  reducedAnimation?: boolean;
}

const SWIPE_THRESHOLD = 80;

export function TaskBubble({ task, onAccept, onSkip, reducedAnimation = false }: TaskBubbleProps) {
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? CalmColors.dark : CalmColors.light;
  const router = useRouter();
  
  const translateX = useSharedValue(0);

  const handleAccept = (taskId: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    // If it's a breathing/meditation activity, launch calm session instead
    if (task.type === 'BREATHING' || task.isBreathing) {
      // Extract duration from task (default 5 minutes)
      const durationMatch = task.title.match(/(\d+)-min/);
      const duration = durationMatch ? parseInt(durationMatch[1]) : 5;
      
      // Determine protocol based on title keywords
      let protocol = 'meditation';
      if (task.title.toLowerCase().includes('box')) protocol = 'box';
      if (task.title.toLowerCase().includes('rescue')) protocol = 'rescue';
      
      router.push(`/calm-session?protocol=${protocol}&duration=${duration}&fromWelcome=false`);
    } else {
      onAccept(taskId);
    }
  };

  const confirmSkip = (taskId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Skip task?',
      'No worries! Want to skip this one?',
      [
        {
          text: 'Keep it',
          style: 'cancel',
          onPress: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
        },
        {
          text: 'Skip',
          style: 'default',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            onSkip(taskId);
          },
        },
      ]
    );
  };

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      if (reducedAnimation) return;
      translateX.value = event.translationX;
    })
    .onEnd((event) => {
      if (event.translationX > SWIPE_THRESHOLD) {
        // Swipe right → accept
        translateX.value = withSpring(0);
        runOnJS(handleAccept)(task.id);
      } else if (event.translationX < -SWIPE_THRESHOLD) {
        // Swipe left → skip
        translateX.value = withSpring(0);
        runOnJS(confirmSkip)(task.id);
      } else {
        translateX.value = withSpring(0);
      }
    });

  const bubbleAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: reducedAnimation ? 0 : translateX.value }],
  }));

  // Task type colors
  const getTaskColor = () => {
    switch (task.type) {
      case 'WORKOUT':
        return colors.primaryLight;
      case 'BREATHING':
        return colors.primary;
      case 'MEAL':
        return colors.success;
      default:
        return colors.surfaceElevated;
    }
  };

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[styles.container, bubbleAnimatedStyle]}>
        <View
          style={[
            styles.bubble,
            {
              backgroundColor: getTaskColor(),
              minHeight: CalmSpacing.comfortableTouchTarget,
            },
          ]}
        >
          <View style={styles.content}>
            <Text style={[styles.title, { color: '#FFFFFF' }]} numberOfLines={1}>
              {task.title}
            </Text>
            <Text style={[styles.time, { color: 'rgba(255, 255, 255, 0.9)' }]}>
              {task.startTime} – {task.endTime}
            </Text>
            {task.description && (
              <Text style={[styles.description, { color: 'rgba(255, 255, 255, 0.85)' }]} numberOfLines={2}>
                {task.description}
              </Text>
            )}
          </View>
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: CalmSpacing.sm,
  },
  bubble: {
    paddingVertical: CalmSpacing.md,
    paddingHorizontal: CalmSpacing.lg,
    borderRadius: 16, // Rounded rectangular shape
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  content: {
    gap: CalmSpacing.xs,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  time: {
    fontSize: 14,
    fontWeight: '500',
  },
  description: {
    fontSize: 13,
    fontStyle: 'italic',
  },
});
