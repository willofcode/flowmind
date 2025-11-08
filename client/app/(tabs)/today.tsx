/**
 * Today Tab - Task Timeline View
 * Shows tasks in 4-hour chunks with swipeable bubbles
 * Follows calm UI principles from DESIGN_PATTERNS.md
 */

import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { TaskBubble } from '@/components/task-bubble';
import { CalmColors, CalmSpacing } from '@/constants/calm-theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { DayTask } from '@/types/neuro-profile';

// Mock tasks for demo - will be replaced with API data
const mockTasks: DayTask[] = [
  {
    id: '1',
    type: 'WORKOUT',
    title: '20-min Morning Walk',
    startTime: '09:00',
    endTime: '09:20',
    status: 'PENDING',
    durationSec: 1200,
    description: 'Light walk around the neighborhood',
  },
  {
    id: '2',
    type: 'BREATHING',
    title: '2-min Calm Session',
    startTime: '09:30',
    endTime: '09:32',
    status: 'PENDING',
    durationSec: 120,
    isBreathing: true,
    description: 'Box breathing: 4-4-4-4',
  },
  {
    id: '3',
    type: 'MEAL',
    title: 'Healthy Lunch',
    startTime: '12:30',
    endTime: '13:00',
    status: 'PENDING',
    durationSec: 1800,
    description: 'Mediterranean bowl with chicken',
  },
  {
    id: '4',
    type: 'WORKOUT',
    title: 'Afternoon Stretch',
    startTime: '15:00',
    endTime: '15:15',
    status: 'PENDING',
    durationSec: 900,
    description: 'Gentle yoga stretches',
  },
];

// Group tasks into 4-hour chunks
interface TimeChunk {
  label: string;
  start: string;
  end: string;
  tasks: DayTask[];
}

function getTimeChunks(tasks: DayTask[]): TimeChunk[] {
  const chunks: TimeChunk[] = [
    { label: 'Morning', start: '06:00', end: '10:00', tasks: [] },
    { label: 'Late Morning', start: '10:00', end: '14:00', tasks: [] },
    { label: 'Afternoon', start: '14:00', end: '18:00', tasks: [] },
    { label: 'Evening', start: '18:00', end: '22:00', tasks: [] },
  ];

  tasks.forEach((task) => {
    const hour = parseInt(task.startTime.split(':')[0], 10);
    if (hour >= 6 && hour < 10) chunks[0].tasks.push(task);
    else if (hour >= 10 && hour < 14) chunks[1].tasks.push(task);
    else if (hour >= 14 && hour < 18) chunks[2].tasks.push(task);
    else if (hour >= 18 && hour < 22) chunks[3].tasks.push(task);
  });

  return chunks.filter(chunk => chunk.tasks.length > 0);
}

export default function TodayScreen() {
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? CalmColors.dark : CalmColors.light;
  const router = useRouter();
  
  const [tasks, setTasks] = useState<DayTask[]>(mockTasks);
  const [completedCount, setCompletedCount] = useState(0);

  const timeChunks = getTimeChunks(tasks.filter(t => 
    t.status !== 'COMPLETED' && t.status !== 'SKIPPED'
  ));

  const handleAccept = useCallback((taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    
    setTasks(prev =>
      prev.map(t =>
        t.id === taskId ? { ...t, status: 'IN_PROGRESS' } : t
      )
    );

    // For breathing tasks, navigate to breathing session screen
    if (task?.isBreathing) {
      console.log('🧘 Opening breathing session for:', task.title);
      router.push({
        pathname: '/breathing-session',
        params: { protocol: 'box' }, // Default to box breathing
      });
    } else {
      // Start timer for regular tasks
      console.log('⏱️ Starting timer for:', task?.title);
      
      // Simulate task completion after duration (shortened for demo)
      setTimeout(() => {
        setTasks(prev =>
          prev.map(t =>
            t.id === taskId ? { ...t, status: 'COMPLETED' } : t
          )
        );
        
        // Celebrate with haptics
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setCompletedCount(c => c + 1);
        
        console.log('✅ Task completed:', task?.title);
      }, 3000); // 3 seconds for demo instead of real duration
    }
  }, [tasks]);

  const handleSkip = useCallback((taskId: string) => {
    setTasks(prev =>
      prev.map(t =>
        t.id === taskId ? { ...t, status: 'SKIPPED' } : t
      )
    );
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>
            Today
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {completedCount > 0 
              ? `${completedCount} task${completedCount > 1 ? 's' : ''} completed 🎉`
              : 'Swipe right to start, left to skip'
            }
          </Text>
        </View>

        {/* Time Chunks */}
        {timeChunks.length > 0 ? (
          timeChunks.map((chunk) => (
            <View key={chunk.label} style={styles.chunk}>
              <View style={styles.chunkHeader}>
                <Text style={[styles.chunkLabel, { color: colors.textSecondary }]}>
                  {chunk.label}
                </Text>
                <Text style={[styles.chunkTime, { color: colors.textTertiary }]}>
                  {chunk.start} – {chunk.end}
                </Text>
              </View>
              
              <View style={styles.taskList}>
                {chunk.tasks.map((task) => (
                  <TaskBubble
                    key={task.id}
                    task={task}
                    onAccept={handleAccept}
                    onSkip={handleSkip}
                  />
                ))}
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              All caught up! 🎉
            </Text>
            <Text style={[styles.emptySubtext, { color: colors.textTertiary }]}>
              No more tasks for today
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: CalmSpacing.lg,
    paddingBottom: CalmSpacing.xxl,
  },
  header: {
    marginBottom: CalmSpacing.xl,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: CalmSpacing.xs,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  chunk: {
    marginBottom: CalmSpacing.xl,
  },
  chunkHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: CalmSpacing.md,
    paddingHorizontal: CalmSpacing.sm,
  },
  chunkLabel: {
    fontSize: 18,
    fontWeight: '600',
  },
  chunkTime: {
    fontSize: 14,
    fontWeight: '500',
  },
  taskList: {
    gap: CalmSpacing.sm,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: CalmSpacing.xxl * 2,
  },
  emptyText: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: CalmSpacing.sm,
  },
  emptySubtext: {
    fontSize: 16,
  },
});
