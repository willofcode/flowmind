/**
 * Updated Today Screen - Neurodivergent-friendly home view
 */

import React, { useEffect, useState } from 'react';
import { View, StyleSheet, RefreshControl, useColorScheme } from 'react-native';
import { TodayView } from '@/components/today-view';
import { CalmUIToggle } from '@/components/calm-ui-toggle';
import { TodayBlock, PersonalNeuroProfile } from '@/types/neuro-profile';
import { loadProfile, updateProfile } from '@/lib/profile-store';
import { notificationManager } from '@/lib/notification-manager';
import * as Haptics from 'expo-haptics';
import { CalmColors } from '@/constants/calm-theme';

export default function TodayScreen() {
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? CalmColors.dark : CalmColors.light;
  
  const [profile, setProfile] = useState<PersonalNeuroProfile | null>(null);
  const [todayBlock, setTodayBlock] = useState<TodayBlock | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [calmUIEnabled, setCalmUIEnabled] = useState(true);

  useEffect(() => {
    loadUserProfile();
    loadTodayBlock();
    setupNotificationListeners();
  }, []);

  const loadUserProfile = async () => {
    const loaded = await loadProfile();
    if (loaded) {
      setProfile(loaded);
      setCalmUIEnabled(loaded.sensory?.reducedAnimation ?? true);
    }
  };

  const loadTodayBlock = async () => {
    // TODO: Fetch today's next block from stored weekly plan
    // For now, mock data
    const mockBlock: TodayBlock = {
      id: '1',
      type: 'workout',
      title: 'Morning Walk',
      start: new Date(Date.now() + 15 * 60000).toISOString(), // 15 min from now
      end: new Date(Date.now() + 45 * 60000).toISOString(),
      microSteps: [
        { id: '1', description: 'Put on comfortable shoes', estimatedMin: 2, completed: false },
        { id: '2', description: 'Fill water bottle', estimatedMin: 1, completed: false },
        { id: '3', description: 'Start 10-minute walk route', estimatedMin: 10, completed: false },
      ],
      alternativeOption: {
        title: 'Indoor Stretching',
        microSteps: [
          { id: 'a1', description: 'Roll out yoga mat', estimatedMin: 1, completed: false },
          { id: 'a2', description: 'Follow 15-min stretch routine', estimatedMin: 15, completed: false },
        ],
      },
      status: 'upcoming',
    };
    setTodayBlock(mockBlock);

    // Schedule nudges
    if (profile && mockBlock) {
      await notificationManager.scheduleNudges(
        mockBlock.id,
        mockBlock.type,
        mockBlock.title,
        mockBlock.start,
        mockBlock.microSteps.map(s => s.description),
        profile.sensory
      );
    }
  };

  const setupNotificationListeners = () => {
    const subscription = notificationManager.addNotificationListener((notification) => {
      // Trigger haptic for gentle nudge
      notificationManager.triggerHaptic('light');
    });

    return () => subscription.remove();
  };

  const handleStart = async () => {
    if (todayBlock) {
      setTodayBlock({ ...todayBlock, status: 'in-progress' });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const handleComplete = async () => {
    if (todayBlock) {
      setTodayBlock({ ...todayBlock, status: 'completed' });
      await notificationManager.cancelNudges(todayBlock.id);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // Load next block
      setTimeout(loadTodayBlock, 1000);
    }
  };

  const handleSwapToAlternative = async () => {
    if (todayBlock?.alternativeOption) {
      const swapped: TodayBlock = {
        ...todayBlock,
        title: todayBlock.alternativeOption.title,
        microSteps: todayBlock.alternativeOption.microSteps,
        alternativeOption: {
          title: todayBlock.title,
          microSteps: todayBlock.microSteps,
        },
      };
      setTodayBlock(swapped);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const handleSkip = async () => {
    if (todayBlock) {
      setTodayBlock({ ...todayBlock, status: 'skipped' });
      await notificationManager.cancelNudges(todayBlock.id);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      // Load next block
      setTimeout(loadTodayBlock, 500);
    }
  };

  const handleCalmUIToggle = async (enabled: boolean) => {
    setCalmUIEnabled(enabled);
    if (profile) {
      await updateProfile({
        sensory: { ...profile.sensory, reducedAnimation: enabled },
      });
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTodayBlock();
    await loadUserProfile();
    setRefreshing(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <CalmUIToggle enabled={calmUIEnabled} onChange={handleCalmUIToggle} />
        <TodayView
          block={todayBlock}
          onStart={handleStart}
          onComplete={handleComplete}
          onSwapToAlternative={handleSwapToAlternative}
          onSkip={handleSkip}
          calmUIEnabled={calmUIEnabled}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
});
