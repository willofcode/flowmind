/**
 * Today Tab - Task Timeline View
 * Shows tasks in 4-hour chunks with swipeable bubbles
 * Follows calm UI principles from DESIGN_PATTERNS.md
 * 
 * DATA SOURCES (merged intelligently):
 * 1. Google Calendar - User's existing commitments (meetings, appointments)
 * 2. NeuralSeek Agentic Activities - AI-generated wellness tasks
 * 
 * INTELLIGENT SCHEDULING:
 * - Dynamic activity count based on schedule intensity and available windows
 * - 15-minute buffer between tasks (reduce stress)
 * - Sorted by time, merged from both sources
 * - Real-time sync with webhooks
 */

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  StyleSheet, 
  ActivityIndicator, 
  RefreshControl, 
  Pressable, 
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Animated
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as SecureStore from 'expo-secure-store';
import { TaskBubble } from '@/components/task-bubble';
import { CalmColors, CalmSpacing } from '@/constants/calm-theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getCalendarAccessToken, createCalendarEventsForActivities } from '@/lib/google-calendar-auth';
import { loadProfile } from '@/lib/profile-store';
import type { DayTask, PersonalNeuroProfile } from '@/types/neuro-profile';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3001';
const MIN_BUFFER_MINUTES = 15;
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes
const SYNC_CHECK_INTERVAL_MS = 10000; // 10 seconds

// Calendar events are user's existing commitments
interface CalendarEvent {
  id: string;
  summary: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  description?: string;
}

// Group tasks into 4-hour chunks
interface TimeChunk {
  label: string;
  start: string;
  end: string;
  tasks: DayTask[];
}

// Loading stages for animated feedback
const LOADING_STAGES = [
  '🔍 Getting your profile...',
  '🧠 Processing your preferences...',
  '📊 Analyzing mood and schedule intensity...',
  '🎯 Determining activity strategy...',
  '✨ Generating your personalized activities...',
  '📅 Syncing to Google Calendar...',
  '✅ Almost ready...'
];

/**
 * Group tasks into dynamic time chunks based on user's active hours
 * Adapts to user's wake/bed time instead of hardcoded 6AM-10PM
 */
function getTimeChunks(tasks: DayTask[], userProfile?: PersonalNeuroProfile | null): TimeChunk[] {
  // Get user's wake/bed time or use defaults
  let wakeHour = 7;
  let bedHour = 22;
  
  if (userProfile?.sleep) {
    const [wh] = userProfile.sleep.usualWake.split(':').map(Number);
    const [bh] = userProfile.sleep.usualBed.split(':').map(Number);
    wakeHour = wh;
    bedHour = bh;
  }
  
  // Calculate 4-hour chunks dynamically based on active hours
  const totalActiveHours = bedHour - wakeHour;
  const chunkSize = Math.max(3, Math.floor(totalActiveHours / 4)); // At least 3-hour chunks
  
  const chunks: TimeChunk[] = [];
  const labels = ['Early', 'Morning', 'Midday', 'Afternoon', 'Evening', 'Night'];
  
  for (let i = 0; i < 4; i++) {
    const startHour = wakeHour + (i * chunkSize);
    const endHour = Math.min(wakeHour + ((i + 1) * chunkSize), bedHour);
    
    if (startHour >= bedHour) break; // Don't create chunks past bedtime
    
    chunks.push({
      label: labels[i] || `Block ${i + 1}`,
      start: `${String(startHour).padStart(2, '0')}:00`,
      end: `${String(endHour).padStart(2, '0')}:00`,
      tasks: []
    });
  }

  // Distribute tasks into chunks
  tasks.forEach((task) => {
    const hour = parseInt(task.startTime.split(':')[0], 10);
    
    // Find the appropriate chunk for this task
    for (let i = 0; i < chunks.length; i++) {
      const chunkStartHour = parseInt(chunks[i].start.split(':')[0], 10);
      const chunkEndHour = parseInt(chunks[i].end.split(':')[0], 10);
      
      if (hour >= chunkStartHour && hour < chunkEndHour) {
        chunks[i].tasks.push(task);
        break;
      }
    }
  });

  return chunks.filter(chunk => chunk.tasks.length > 0);
}

/**
 * Parse time string to minutes since midnight
 */
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Get today's date in YYYY-MM-DD format
 */
function getTodayDateString(date?: Date): string {
  return (date || new Date()).toISOString().split('T')[0];
}

/**
 * Get target date based on selected day offset
 * @param dayOffset 0 = today, 1 = tomorrow, 2 = day after, etc.
 */
function getTargetDate(dayOffset: number = 0): Date {
  const date = new Date();
  date.setDate(date.getDate() + dayOffset);
  return date;
}

/**
 * Get friendly day label for display
 */
function getDayLabel(dayOffset: number): string {
  if (dayOffset === 0) return 'Today';
  if (dayOffset === 1) return 'Tomorrow';
  // Future: could support "Day After Tomorrow" etc.
  return `Day +${dayOffset}`;
}

export default function TodayScreen() {
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? CalmColors.dark : CalmColors.light;
  const router = useRouter();
  
  // State
  const [selectedDay, setSelectedDay] = useState<0 | 1>(0); // NEW: 0 = today, 1 = tomorrow
  const [tasks, setTasks] = useState<DayTask[]>([]);
  const [completedCount, setCompletedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [addingActivity, setAddingActivity] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [taskName, setTaskName] = useState('');
  const [activityLabel, setActivityLabel] = useState('');
  const [lastSyncCheck, setLastSyncCheck] = useState(new Date());
  const [loadingStage, setLoadingStage] = useState(0);
  const [userProfile, setUserProfile] = useState<PersonalNeuroProfile | null>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Animate loading stages with fade effect
  useEffect(() => {
    if (!loading) {
      setLoadingStage(0);
      return;
    }

    const stageInterval = setInterval(() => {
      // Fade out
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        // Change text
        setLoadingStage((prev) => (prev + 1) % LOADING_STAGES.length);
        // Fade in
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      });
    }, 2500); // Change stage every 2.5 seconds

    return () => clearInterval(stageInterval);
  }, [loading, fadeAnim]);

  // Fetch calendar events on mount and when selectedDay changes
  useEffect(() => {
    loadUserProfile();
    fetchTodaySchedule();
  }, [selectedDay]); // Re-fetch when switching between today/tomorrow

  const loadUserProfile = async () => {
    try {
      const profile = await loadProfile();
      if (profile) {
        setUserProfile(profile);
        console.log('👤 Loaded user profile with active hours:', profile.activeHours || profile.sleep);
      }
    } catch (error) {
      console.error('Failed to load user profile:', error);
    }
  };

  // Poll for updates every 10 seconds
  useEffect(() => {
    const pollInterval = setInterval(checkForUpdates, SYNC_CHECK_INTERVAL_MS);
    return () => clearInterval(pollInterval);
  }, [lastSyncCheck]);

  // Memoize time chunks to avoid recalculation
  const timeChunks = useMemo(() => 
    getTimeChunks(tasks.filter(t => t.status !== 'COMPLETED' && t.status !== 'SKIPPED'), userProfile),
    [tasks, userProfile]
  );

  // Check for calendar updates from webhooks
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
          // Check if updates are only from FlowMind-generated events
          // If so, skip refresh to avoid re-fetching our own activities
          const lastSyncedToday = await SecureStore.getItemAsync('agentic_activities_synced_today');
          const today = getTodayDateString();
          
          if (lastSyncedToday === today) {
            console.log('ℹ️  Calendar updates detected but likely from FlowMind sync, skipping refresh');
            setLastSyncCheck(new Date());
            return;
          }
          
          console.log('🔄 External calendar updates detected, refreshing today...');
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          await fetchTodaySchedule();
          setLastSyncCheck(new Date());
        }
      }
    } catch (error) {
      console.log('ℹ️  Sync check failed (normal if offline)');
    }
  };

  // Pull-to-refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    try {
      // Only refresh calendar data, DO NOT clear activity generation cache
      console.log('🔄 Refreshing calendar data (cache preserved)...');
      
      await fetchTodaySchedule();
      setLastSyncCheck(new Date());
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('❌ Refresh error:', error);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  // Fetch BOTH calendar events AND agentic activities
  const fetchTodaySchedule = async () => {
    console.log('🔄 Starting fetchTodaySchedule...');
    setLoading(true);
    try {
      // Fetch calendar events (user's commitments)
      console.log('📅 Fetching calendar events...');
      const calendarEvents = await fetchCalendarEvents();
      console.log(`📅 Got ${calendarEvents.length} calendar events`);
      
      // DON'T set loading to false yet - keep animation showing
      // while AI activities are being generated
      
      // Fetch NeuralSeek agentic activities (this takes time with multi-stage prompts)
      console.log('🧠 Fetching AI activities (this may take 10-30 seconds)...');
      const agenticActivities = await fetchAgenticActivities(calendarEvents);
      console.log(`🧠 Got ${agenticActivities.length} AI activities`);

      // Merge both sources and sort by time
      const allTasks = [...calendarEvents, ...agenticActivities].sort((a, b) => {
        const timeA = a.startTime.split(':').map(Number);
        const timeB = b.startTime.split(':').map(Number);
        return (timeA[0] * 60 + timeA[1]) - (timeB[0] * 60 + timeB[1]);
      });

      // Backend already validated gaps and spacing - show ALL events
      console.log('📊 Task results:');
      console.log(`  - Total tasks (calendar + agentic): ${allTasks.length}`);
      console.log(`  - Calendar events: ${calendarEvents.length}`);
      console.log(`  - AI activities: ${agenticActivities.length}`);
      allTasks.forEach((task, idx) => {
        console.log(`  ${idx + 1}. ${task.title} (${task.startTime}-${task.endTime})`);
      });
      
      setTasks(allTasks);
      console.log('✅ Today schedule loaded:', allTasks.length, 'tasks');
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

      // Use selected day (0 = today, 1 = tomorrow)
      const targetDate = getTargetDate(selectedDay);
      const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
      const endOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59);
      const now = new Date();

      console.log(`📅 Fetching ${getDayLabel(selectedDay)} calendar events from:`, API_BASE_URL);
      
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
        
        // Get ALL events (including past ones) for the selected day
        // Users need to see their full day schedule, not just upcoming events
        const allEvents = (data.events || [])
          .sort((a: CalendarEvent, b: CalendarEvent) => {
            const aStart = new Date(a.start.dateTime || a.start.date || '');
            const bStart = new Date(b.start.dateTime || b.start.date || '');
            return aStart.getTime() - bStart.getTime();
          });

        // Check if FlowMind activities already exist for this day
        const hasFlowMindActivities = allEvents.some((event: CalendarEvent) => 
          event.summary?.startsWith('🌿') || 
          event.description?.includes('FlowMind AI-generated')
        );

        if (hasFlowMindActivities) {
          console.log('✅ FlowMind activities already exist in Google Calendar');
          // Set the cache flag to prevent regeneration
          const targetDate = getTargetDate(selectedDay);
          const targetDateString = getTodayDateString(targetDate);
          const generatedDateKey = `activities_generated_date_${targetDateString}`;
          await SecureStore.setItemAsync(generatedDateKey, targetDateString);
        }

        // Show ALL events (FlowMind + user events)
        const upcomingEvents = allEvents;

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

      // NEW ARCHITECTURE: Check if activities already generated TODAY (cache flag)
      // Use selectedDay offset for cache key
      const targetDate = getTargetDate(selectedDay);
      const targetDateString = getTodayDateString(targetDate);
      const generatedDateKey = `activities_generated_date_${targetDateString}`;
      const generatedDate = await SecureStore.getItemAsync(generatedDateKey);
      
      // ALSO check if any calendar events have FlowMind markers (🌿 emoji in title)
      const hasFlowMindActivitiesInCalendar = calendarEvents.some(event => 
        event.title?.startsWith('🌿')
      );
      
      if (generatedDate === targetDateString || hasFlowMindActivitiesInCalendar) {
        if (hasFlowMindActivitiesInCalendar) {
          console.log(`✅ FlowMind activities detected in calendar for ${getDayLabel(selectedDay)}`);
          // Set cache flag to prevent regeneration
          await SecureStore.setItemAsync(generatedDateKey, targetDateString);
        } else {
          console.log(`✅ Activities already generated for ${getDayLabel(selectedDay)} (cached)`);
        }
        console.log('📅 Skipping generation to prevent duplicates');
        // Return empty - activities already in calendar
        return [];
      }
      
      console.log(`🆕 No activities generated for ${getDayLabel(selectedDay)} - proceeding with generation...`);

      // Get user context for AI generation
      const scheduleIntensity = calculateScheduleIntensity(calendarEvents, userProfile);
      
      // Get latest mood data with hierarchy: recent check-in → profile baseline → defaults
      let moodScore = 6.5;
      let energyLevel: 'low' | 'medium' | 'high' = 'medium';
      let stressLevel: 'low' | 'medium' | 'high' = scheduleIntensity === 'high' ? 'high' : 'medium';
      
      try {
        console.log('🧠 Fetching latest mood data...');
        const moodResponse = await fetch(`${API_BASE_URL}/mood/${encodeURIComponent(userEmail)}/latest`);
        
        if (moodResponse.ok) {
          const moodData = await moodResponse.json();
          console.log(`📊 Mood data from ${moodData.source}:`, {
            score: moodData.moodScore,
            energy: moodData.energyLevel,
            stress: moodData.stressLevel,
            age: moodData.hoursSinceCheckIn ? `${moodData.hoursSinceCheckIn}h ago` : 'baseline'
          });
          
          moodScore = moodData.moodScore;
          energyLevel = moodData.energyLevel;
          
          // Override stress level with schedule-based calculation if mood check-in is old
          if (moodData.source === 'mood_check_in' && moodData.hoursSinceCheckIn < 4) {
            stressLevel = moodData.stressLevel;
          } else {
            // Use schedule-based stress for older data
            stressLevel = scheduleIntensity === 'high' ? 'high' : 
                         scheduleIntensity === 'medium' ? 'medium' : 'low';
          }
        } else {
          console.log('⚠️  Mood endpoint not available, using defaults');
        }
      } catch (moodError) {
        console.log('⚠️  Could not fetch mood data, using defaults:', moodError);
      }

      // Prepare request using targetDate (already calculated above)
      const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
      const endOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59);

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
          start: `${targetDateString}T${event.startTime}:00`,
          end: `${targetDateString}T${event.endTime}:00`
        }))
      };

      console.log(`🤖 Requesting agentic activities for ${getDayLabel(selectedDay)}...`);
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
        
        // DEBUG: Log each activity to see what we got
        data.activities.forEach((act: any, idx: number) => {
          console.log(`📋 Activity ${idx + 1}:`, {
            id: act.id,
            type: act.type,
            title: act.title,
            startTime: act.startTime,
            endTime: act.endTime,
            hasDescription: !!act.description
          });
        });
        
        // NEW ARCHITECTURE: Sync to Google Calendar (Calendar is source of truth)
        if (data.shouldSyncToCalendar && data.activities.length > 0) {
          console.log('📅 Syncing activities to Google Calendar...');
          const syncResult = await syncActivitiesToGoogleCalendar(data.activities);
          
          if (syncResult.success) {
            // Set flag that activities were generated for this specific date
            await SecureStore.setItemAsync(generatedDateKey, targetDateString);
            console.log(`✅ Set flag: Activities generated for ${getDayLabel(selectedDay)} (${targetDateString})`);
            
            // Return empty - activities now in calendar, will be fetched on refresh
            return [];
          } else {
            console.error('❌ Failed to sync to calendar:', syncResult.errors);
            return [];
          }
        }
        
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

  /**
   * Sync agentic activities to Google Calendar
   * Only syncs if not already synced (prevents duplicates)
   */
  /**
   * Sync agentic activities to Google Calendar
   * NEW ARCHITECTURE: Calendar is the source of truth
   * Returns success status
   */
  const syncActivitiesToGoogleCalendar = async (activities: any[]): Promise<{ success: boolean; eventIds?: string[]; errors?: any[] }> => {
    try {
      // Verify calendar is connected
      const isConnected = await SecureStore.getItemAsync('google_calendar_connected');
      if (isConnected !== 'true') {
        console.log('📅 Calendar not connected, skipping sync');
        return { success: false, errors: ['Calendar not connected'] };
      }

      console.log(`📅 Syncing ${activities.length} activities to Google Calendar...`);
      
      const result = await createCalendarEventsForActivities(activities);
      
      if (result.success) {
        console.log(`✅ Synced ${result.eventIds.length} activities to calendar`);
        
        // Store event IDs for future cleanup
        await SecureStore.setItemAsync(
          'agentic_calendar_event_ids',
          JSON.stringify(result.eventIds)
        );
        
        // Show success feedback
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        return { success: true, eventIds: result.eventIds };
      } else {
        console.warn('⚠️  Some activities failed to sync:', result.errors.length);
        return { success: false, errors: result.errors };
      }
    } catch (error) {
      console.error('❌ Calendar sync error:', error);
      return { success: false, errors: [error] };
    }
  };

  const calculateScheduleIntensity = useCallback((events: DayTask[], userProfile?: any): 'high' | 'medium' | 'low' => {
    // EMPTY SCHEDULE FIX: Still generate activities even with no calendar events
    if (events.length === 0) {
      console.log('📭 Empty schedule detected - will generate wellness activities');
      return 'low'; // Low intensity = more diverse activities
    }
    if (events.length >= 5) return 'high';
    
    // Calculate total busy time
    const totalMinutes = events.reduce((sum, event) => sum + (event.durationSec / 60), 0);
    
    // Use user's active hours from profile (matching server-side logic)
    let availableMinutes = 16 * 60; // Default: 16 hours (960 minutes)
    
    if (userProfile?.sleep) {
      // Calculate from wake/bed time (matching server-side)
      const [wakeHour, wakeMin] = userProfile.sleep.usualWake.split(':').map(Number);
      const [bedHour, bedMin] = userProfile.sleep.usualBed.split(':').map(Number);
      
      let totalWakingMinutes = (bedHour * 60 + bedMin) - (wakeHour * 60 + wakeMin);
      if (totalWakingMinutes < 0) totalWakingMinutes += 24 * 60; // Handle overnight
      
      availableMinutes = totalWakingMinutes;
      console.log(`⏰ Using user's active hours: ${wakeHour}:${wakeMin.toString().padStart(2, '0')} - ${bedHour}:${bedMin.toString().padStart(2, '0')} (${Math.round(availableMinutes / 60)}h)`);
    } else if (userProfile?.activeHours?.dailyActiveHours) {
      // Fallback to activeHours if sleep schedule not set
      availableMinutes = userProfile.activeHours.dailyActiveHours * 60;
      console.log(`⏰ Using profile active hours: ${userProfile.activeHours.dailyActiveHours}h`);
    } else {
      console.log(`⏰ Using default active hours: 16h`);
    }
    
    const intensity = totalMinutes / availableMinutes;
    
    console.log(`📊 Schedule intensity: ${totalMinutes} busy / ${availableMinutes} available = ${(intensity * 100).toFixed(1)}%`);
    
    if (intensity > 0.7) return 'high';
    if (intensity > 0.4) return 'medium';
    return 'low';
  }, []);

  // Filter tasks to avoid stress/overstimulation with intelligent time constraints
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
    } else if (task) {
      // For other tasks, open sand timer interface
      console.log('⏱️ Starting sand timer for:', task.title);
      
      const durationMinutes = Math.round(task.durationSec / 60);
      router.push({
        pathname: '/sand-timer',
        params: {
          duration: durationMinutes.toString(),
          title: task.title,
          taskId: task.id,
        },
      });
    }
  }, [tasks, router]);

  const handleSkip = useCallback((taskId: string) => {
    setTasks(prev =>
      prev.map(t =>
        t.id === taskId ? { ...t, status: 'SKIPPED' } : t
      )
    );
  }, []);

  // Add activity button handler - generates ONE new activity and syncs to calendar
  // Open the Add Activity modal
  const openAddActivityModal = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowAddModal(true);
  }, []);

  // Close modal and reset form
  const closeAddActivityModal = useCallback(() => {
    setShowAddModal(false);
    setTaskName('');
    setActivityLabel('');
  }, []);

  // Confirm and add activity with user context
  const handleAddActivity = useCallback(async () => {
    // Prevent multiple taps
    if (addingActivity) return;
    
    setAddingActivity(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    try {
      const userEmail = await SecureStore.getItemAsync('google_calendar_user_email');
      if (!userEmail) {
        Alert.alert('Error', 'Please connect your Google Calendar first');
        setAddingActivity(false);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }

      // Calculate context from existing tasks
      const scheduleIntensity = calculateScheduleIntensity(tasks, userProfile);
      
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

      console.log('➕ Generating new activity...');

      // Step 1: Call backend to generate ONE activity
      const response = await fetch(`${API_BASE_URL}/agentic/generate-activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userEmail,
          scheduleIntensity,
          moodScore: 6.5,
          energyLevel: 'medium',
          stressLevel: 'medium',
          userContext: {
            taskName: taskName || 'User-added activity',
            activityLabel: activityLabel || 'Manual addition',
          },
          timeWindow: {
            start: startOfDay.toISOString(),
            end: endOfDay.toISOString()
          },
          existingEvents: tasks.map(event => {
            const todayDate = getTodayDateString(now);
            return {
              start: `${todayDate}T${event.startTime}:00`,
              end: `${todayDate}T${event.endTime}:00`
            };
          })
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate activity');
      }
      
      const data = await response.json();
      const newActivities = data.activities || [];
      
      if (newActivities.length === 0) {
        Alert.alert(
          'No Space Available',
          'Your schedule is quite full. Try completing or skipping some tasks first.',
          [{ text: 'OK', style: 'default' }]
        );
        setAddingActivity(false);
        return;
      }
      
      const newActivity = newActivities[0];
      console.log('✅ Generated activity:', newActivity.title);
      
      // Step 2: Add to Google Calendar (if connected)
      const isCalendarConnected = await SecureStore.getItemAsync('google_calendar_connected');
      let calendarEventCreated = false;
      
      if (isCalendarConnected === 'true') {
        try {
          const accessToken = await getCalendarAccessToken();
          
          if (accessToken) {
            console.log('📅 Adding to Google Calendar...');
            
            // Map activity type to calendar event type
            const activityTypeMap: Record<string, string> = {
              BREATHING: 'breathing',
              WORKOUT: 'workout',
              MEAL: 'meal',
              HYDRATION: 'meal',
              NATURE: 'movement',
              CREATIVE: 'movement',
              SOCIAL: 'movement',
              LEARNING: 'movement',
              ORGANIZATION: 'movement',
              SENSORY: 'breathing',
              TRANSITION: 'breathing',
              ENERGY_BOOST: 'movement',
            };
            
            const activityType = activityTypeMap[newActivity.type] || 'movement';
            const startISO = `${getTodayDateString(now)}T${newActivity.startTime}:00`;
            const duration = parseInt(newActivity.duration);
            
            const calendarResponse = await fetch(`${API_BASE_URL}/calendar/manual-activity`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                accessToken,
                activityType,
                startISO,
                duration
              })
            });
            
            if (calendarResponse.ok) {
              const calendarData = await calendarResponse.json();
              console.log('✅ Calendar event created:', calendarData.event.htmlLink);
              calendarEventCreated = true;
            } else {
              console.log('⚠️  Calendar event creation failed, but activity still added locally');
            }
          }
        } catch (calendarError) {
          console.log('⚠️  Calendar sync error (non-critical):', calendarError);
          // Continue even if calendar fails - local activity is still useful
        }
      }
      
      // Step 3: Update local task list
      const allTasks = [...tasks, newActivity].sort((a, b) => {
        const timeA = a.startTime.split(':').map(Number);
        const timeB = b.startTime.split(':').map(Number);
        return (timeA[0] * 60 + timeA[1]) - (timeB[0] * 60 + timeB[1]);
      });
      
      setTasks(allTasks);
      
      // Step 4: Success feedback with calendar status
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      const successMessage = calendarEventCreated
        ? `✅ Added "${newActivity.title}" to your schedule and Google Calendar!`
        : `✅ Added "${newActivity.title}" to your schedule!`;
      
      Alert.alert(
        'Activity Added',
        successMessage,
        [{ text: 'Great!', style: 'default' }]
      );
      
      console.log('✅ Activity added successfully');
      
      // Close modal and reset form
      closeAddActivityModal();
      
    } catch (error) {
      console.error('❌ Add activity error:', error);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      
      Alert.alert(
        'Could Not Add Activity',
        'Something went wrong. Please try refreshing the page.',
        [{ text: 'OK', style: 'cancel' }]
      );
    } finally {
      setAddingActivity(false);
    }
  }, [tasks, addingActivity, taskName, activityLabel, closeAddActivityModal]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Animated.Text 
            style={[
              styles.loadingText, 
              { 
                color: colors.text,
                opacity: fadeAnim 
              }
            ]}
          >
            {LOADING_STAGES[loadingStage]}
          </Animated.Text>
          <View style={styles.stageIndicator}>
            {LOADING_STAGES.map((_: string, index: number) => (
              <View
                key={index}
                style={[
                  styles.stageDot,
                  {
                    backgroundColor: index === loadingStage ? colors.primary : colors.border,
                    transform: [{ scale: index === loadingStage ? 1.2 : 1 }]
                  }
                ]}
              />
            ))}
          </View>
        </View>
      ) : (
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
              progressBackgroundColor={colors.surface}
              title="Pull to refresh calendar"
              titleColor={colors.textSecondary}
            />
          }
        >
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={[styles.title, { color: colors.text }]}>
                {getDayLabel(selectedDay)}
              </Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                {completedCount > 0 
                  ? `${completedCount} task${completedCount > 1 ? 's' : ''} completed 🎉`
                  : 'Swipe right to start, left to skip'
                }
              </Text>
            </View>
          </View>

          {/* Day Switcher Tabs */}
          <View style={styles.dayTabs}>
            <Pressable
              style={[
                styles.dayTab,
                selectedDay === 0 && [styles.dayTabActive, { borderBottomColor: colors.primary }]
              ]}
              onPress={async () => {
                if (selectedDay !== 0) {
                  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedDay(0);
                }
              }}
            >
              <Text style={[
                styles.dayTabText,
                { color: selectedDay === 0 ? colors.primary : colors.textSecondary }
              ]}>
                Today
              </Text>
            </Pressable>
            
            <Pressable
              style={[
                styles.dayTab,
                selectedDay === 1 && [styles.dayTabActive, { borderBottomColor: colors.primary }]
              ]}
              onPress={async () => {
                if (selectedDay !== 1) {
                  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedDay(1);
                }
              }}
            >
              <Text style={[
                styles.dayTabText,
                { color: selectedDay === 1 ? colors.primary : colors.textSecondary }
              ]}>
                Tomorrow
              </Text>
            </Pressable>
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

      {/* Floating Action Button (FAB) - Fixed to bottom-right */}
      <Pressable
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={openAddActivityModal}
      >
        <Text style={styles.fabText}>+</Text>
      </Pressable>

      {/* Add Activity Modal */}
      <Modal
        visible={showAddModal}
        animationType="fade"
        transparent={true}
        onRequestClose={closeAddActivityModal}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <Pressable 
            style={styles.modalBackdrop} 
            onPress={closeAddActivityModal}
          />
          
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Add Activity
              </Text>
              <Pressable onPress={closeAddActivityModal}>
                <Text style={[styles.modalClose, { color: colors.textSecondary }]}>
                  ✕
                </Text>
              </Pressable>
            </View>

            {/* Task Name Input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                Task Name
              </Text>
              <TextInput
                style={[
                  styles.input,
                  { 
                    backgroundColor: colors.background,
                    color: colors.text,
                    borderColor: colors.border || colors.textSecondary,
                  }
                ]}
                placeholder="e.g., Morning meditation"
                placeholderTextColor={colors.textTertiary}
                value={taskName}
                onChangeText={setTaskName}
                autoFocus
                returnKeyType="next"
              />
            </View>

            {/* Activity Label Input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                Activity Label (Context)
              </Text>
              <TextInput
                style={[
                  styles.input,
                  { 
                    backgroundColor: colors.background,
                    color: colors.text,
                    borderColor: colors.border || colors.textSecondary,
                  }
                ]}
                placeholder="e.g., Help with focus, Stress relief"
                placeholderTextColor={colors.textTertiary}
                value={activityLabel}
                onChangeText={setActivityLabel}
                returnKeyType="done"
                multiline
                numberOfLines={2}
              />
              <Text style={[styles.inputHint, { color: colors.textTertiary }]}>
                This context helps the AI understand your needs
              </Text>
            </View>

            {/* Action Buttons */}
            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalButton, styles.cancelButton, { borderColor: colors.textSecondary }]}
                onPress={closeAddActivityModal}
              >
                <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>
                  Cancel
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.modalButton, 
                  styles.confirmButton,
                  { backgroundColor: addingActivity ? colors.textSecondary : colors.primary }
                ]}
                onPress={handleAddActivity}
                disabled={addingActivity}
              >
                {addingActivity ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.confirmButtonText}>
                    Confirm
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
    textAlign: 'center',
    marginTop: CalmSpacing.md,
    paddingHorizontal: CalmSpacing.lg,
  },
  stageIndicator: {
    flexDirection: 'row',
    gap: 8,
    marginTop: CalmSpacing.lg,
    alignItems: 'center',
  },
  stageDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
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
  // Day switcher tabs
  dayTabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    marginBottom: CalmSpacing.lg,
  },
  dayTab: {
    flex: 1,
    paddingVertical: CalmSpacing.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  dayTabActive: {
    borderBottomWidth: 2,
  },
  dayTabText: {
    fontSize: 16,
    fontWeight: '600',
  },
  // Floating Action Button (FAB) - Fixed to bottom-right corner
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 999,
  },
  fabText: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '300',
    lineHeight: 32,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '85%',
    maxWidth: 400,
    borderRadius: 16,
    padding: CalmSpacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: CalmSpacing.lg,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  modalClose: {
    fontSize: 28,
    fontWeight: '300',
    padding: CalmSpacing.xs,
  },
  inputGroup: {
    marginBottom: CalmSpacing.lg,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: CalmSpacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: CalmSpacing.md,
    paddingVertical: CalmSpacing.md,
    fontSize: 16,
    minHeight: 48,
  },
  inputHint: {
    fontSize: 12,
    marginTop: CalmSpacing.xs,
    fontStyle: 'italic',
  },
  modalActions: {
    flexDirection: 'row',
    gap: CalmSpacing.md,
    marginTop: CalmSpacing.md,
  },
  modalButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: CalmSpacing.sm,
  },
  cancelButton: {
    borderWidth: 2,
    backgroundColor: 'transparent',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButton: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
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
