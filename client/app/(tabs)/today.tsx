/**
 * Today Tab - Task Timeline View
 * Shows tasks in 4-hour chunks with swipeable bubbles
 * Follows calm UI principles from DESIGN_PATTERNS.md
 * 
 * DATA SOURCES (merged intelligently):
 * 1. Google Calendar - User's existing commitments (meetings, appointments)
 * 2. NeuralSeek Agentic Activities - AI-generated wellness tasks to help with:
 *    - Mental health support (breathing, meditation)
 *    - Stress management (breaks, calm activities)
 *    - Neurodivergent needs (structured routines, sensory breaks)
 *    - Physical wellness (fitness, movement snacks)
 *    - Nutrition (meal planning, hydration reminders)
 * 
 * INTELLIGENT SCHEDULING:
 * - Max 4 activities shown at once (prevent overwhelm)
 * - 15-minute buffer between tasks (reduce stress)
 * - Sorted by time, merged from both sources
 * - Real-time sync with webhooks
 */

import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as SecureStore from 'expo-secure-store';
import { TaskBubble } from '@/components/task-bubble';
import { CalmColors, CalmSpacing } from '@/constants/calm-theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getCalendarAccessToken } from '@/lib/google-calendar-auth';
import type { DayTask } from '@/types/neuro-profile';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3001';

// Calendar events are user's existing commitments (meetings, appointments, etc)
interface CalendarEvent {
  id: string;
  summary: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  description?: string;
}

// NeuralSeek agentic activities (AI-generated wellness tasks)
// These are created by the AI agent to help with mental health/stress/neurodivergent needs
// Examples: breathing exercises, fitness activities, meal planning, breaks
// TODO: Backend endpoint needed - POST /agentic/generate-activities
//   Input: { userId, scheduleIntensity, moodScore, energyLevel, timeWindow }
//   Output: { activities: DayTask[] } with proper timing and types
const mockAgenticTasks: DayTask[] = [];

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
  
  const [tasks, setTasks] = useState<DayTask[]>(mockAgenticTasks);
  const [completedCount, setCompletedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [lastSyncCheck, setLastSyncCheck] = useState(new Date());

  // Fetch calendar events on mount
  useEffect(() => {
    fetchTodaySchedule();
  }, []);

  // Poll for updates every 10 seconds
  useEffect(() => {
    const pollInterval = setInterval(async () => {
      await checkForUpdates();
    }, 10000);

    return () => clearInterval(pollInterval);
  }, [lastSyncCheck]);

  const checkForUpdates = async () => {
    try {
      const userEmail = await SecureStore.getItemAsync('google_calendar_user_email');
      if (!userEmail) return;

      const response = await fetch(
        `${API_BASE_URL}/calendar-sync/check-updates?userId=${encodeURIComponent(userEmail)}&since=${lastSyncCheck.toISOString()}`
      );

      if (response.ok) {
        const data = await response.json();
        if (data.hasUpdates) {
          console.log('🔄 Calendar updates detected, refreshing today...');
          await fetchTodaySchedule();
          setLastSyncCheck(new Date());
        }
      }
    } catch (error) {
      console.log('ℹ️  Sync check failed (normal if offline)');
    }
  };

  // Fetch BOTH calendar events AND agentic activities
  const fetchTodaySchedule = async () => {
    setLoading(true);
    try {
      // Fetch calendar events (user's commitments)
      const calendarEvents = await fetchCalendarEvents();
      
      // Fetch NeuralSeek agentic activities
      const agenticActivities = await fetchAgenticActivities(calendarEvents);

      // Merge both sources and sort by time
      const allTasks = [...calendarEvents, ...agenticActivities].sort((a, b) => {
        const timeA = a.startTime.split(':').map(Number);
        const timeB = b.startTime.split(':').map(Number);
        return (timeA[0] * 60 + timeA[1]) - (timeB[0] * 60 + timeB[1]);
      });

      // Apply intelligent filtering (max 4 tasks with time constraints)
      const filteredTasks = filterTasksWithTimeConstraints(allTasks);
      
      setTasks(filteredTasks);
      console.log('✅ Today schedule loaded:', filteredTasks.length, 'tasks');
      console.log('  - Calendar events:', calendarEvents.length);
      console.log('  - Agentic activities:', agenticActivities.length);
    } catch (error) {
      console.error('❌ Fetch today schedule error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCalendarEvents = async (): Promise<DayTask[]> => {
    try {
      const isCalendarConnected = await SecureStore.getItemAsync('google_calendar_connected');
      
      if (!isCalendarConnected || isCalendarConnected !== 'true') {
        console.log('📅 Google Calendar not connected');
        return [];
      }

      const token = await getCalendarAccessToken();
      
      if (!token) {
        console.log('❌ No access token found');
        return [];
      }

      // Get today's events
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

      console.log('📅 Fetching calendar events from:', API_BASE_URL);
      
      const response = await fetch(`${API_BASE_URL}/calendar/get-calendar-events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessToken: token,
          timeMin: startOfDay.toISOString(),
          timeMax: endOfDay.toISOString(),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        
        // Filter to upcoming events only
        const upcomingEvents = (data.events || [])
          .filter((event: CalendarEvent) => {
            const eventStart = new Date(event.start.dateTime || event.start.date || '');
            return eventStart >= now;
          })
          .sort((a: CalendarEvent, b: CalendarEvent) => {
            const aStart = new Date(a.start.dateTime || a.start.date || '');
            const bStart = new Date(b.start.dateTime || b.start.date || '');
            return aStart.getTime() - bStart.getTime();
          });

        // Convert calendar events to DayTask format (these are user commitments, not wellness tasks)
        return upcomingEvents.map((event: CalendarEvent): DayTask => {
          const startTime = event.start.dateTime || event.start.date || '';
          const endTime = event.end.dateTime || event.end.date || '';
          const startDate = new Date(startTime);
          const endDate = new Date(endTime);
          
          const formatTime = (date: Date) => {
            return date.toLocaleTimeString('en-US', { 
              hour: '2-digit', 
              minute: '2-digit',
              hour12: false 
            });
          };

          return {
            id: event.id,
            type: 'MEAL', // Calendar events are neutral (meetings/appointments)
            title: event.summary || 'Untitled Event',
            startTime: formatTime(startDate),
            endTime: formatTime(endDate),
            status: 'PENDING',
            durationSec: Math.floor((endDate.getTime() - startDate.getTime()) / 1000),
            description: event.description,
            isBreathing: false,
          };
        });
      } else {
        console.error('❌ Calendar API error:', response.status);
        return [];
      }
    } catch (error) {
      console.error('❌ Fetch calendar events error:', error);
      return [];
    }
  };

  const fetchAgenticActivities = async (calendarEvents: DayTask[]): Promise<DayTask[]> => {
    try {
      const userEmail = await SecureStore.getItemAsync('google_calendar_user_email');
      if (!userEmail) {
        console.log('📅 No user email for agentic activities');
        return [];
      }

      // Get user context for AI generation
      const scheduleIntensity = calculateScheduleIntensity(calendarEvents);
      
      // Get latest mood data (if available)
      // TODO: Fetch from mood check-in endpoint
      const moodScore = 6.5; // Default
      const energyLevel = 'medium';
      const stressLevel = scheduleIntensity === 'high' ? 'high' : 'medium';

      // Prepare request
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

      const requestBody = {
        userId: userEmail,
        scheduleIntensity,
        moodScore,
        energyLevel,
        stressLevel,
        timeWindow: {
          start: startOfDay.toISOString(),
          end: endOfDay.toISOString()
        },
        existingEvents: calendarEvents.map(event => ({
          start: `2025-11-09T${event.startTime}:00`,
          end: `2025-11-09T${event.endTime}:00`
        }))
      };

      console.log('🤖 Requesting agentic activities...');
      console.log('📊 Context:', { scheduleIntensity, moodScore, energyLevel, stressLevel });

      const response = await fetch(`${API_BASE_URL}/agentic/generate-activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Agentic activities received:', data.activities.length);
        console.log('💡 Reasoning:', data.reasoning);
        return data.activities || [];
      } else {
        console.error('❌ Agentic API error:', response.status);
        return [];
      }
    } catch (error) {
      console.error('❌ Fetch agentic activities error:', error);
      return [];
    }
  };

  const calculateScheduleIntensity = (events: DayTask[]): 'high' | 'medium' | 'low' => {
    if (events.length === 0) return 'low';
    if (events.length >= 5) return 'high';
    
    // Calculate total busy time
    const totalMinutes = events.reduce((sum, event) => sum + (event.durationSec / 60), 0);
    const availableMinutes = 15 * 60; // 15 hours (7am-10pm)
    const intensity = totalMinutes / availableMinutes;
    
    if (intensity > 0.7) return 'high';
    if (intensity > 0.4) return 'medium';
    return 'low';
  };

  // Filter tasks to avoid stress/overstimulation (max 4 tasks with 15-min buffer)
  const filterTasksWithTimeConstraints = (allTasks: DayTask[]): DayTask[] => {
    const filtered: DayTask[] = [];
    const MIN_BUFFER_MINUTES = 15;
    
    for (let i = 0; i < allTasks.length && filtered.length < 4; i++) {
      const task = allTasks[i];
      
      if (filtered.length > 0) {
        const lastTask = filtered[filtered.length - 1];
        
        // Calculate buffer between tasks
        const lastEndTime = lastTask.endTime.split(':').map(Number);
        const currentStartTime = task.startTime.split(':').map(Number);
        
        const lastEndMinutes = lastEndTime[0] * 60 + lastEndTime[1];
        const currentStartMinutes = currentStartTime[0] * 60 + currentStartTime[1];
        const bufferMinutes = currentStartMinutes - lastEndMinutes;
        
        if (bufferMinutes < MIN_BUFFER_MINUTES) {
          console.log(`⚠️  Skipping "${task.title}" - too close (${bufferMinutes}min buffer)`);
          continue;
        }
      }
      
      filtered.push(task);
    }
    
    return filtered;
  };

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
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Loading today's schedule...
          </Text>
        </View>
      ) : (
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
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: CalmSpacing.md,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
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
