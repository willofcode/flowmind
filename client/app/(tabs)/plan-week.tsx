/**
 * Schedule Tab - Google Calendar Monthly View
 * Displays calendar events in monthly grid
 * Max 5 events per day with scrollable list
 */

import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import * as Haptics from 'expo-haptics';
import * as SecureStore from 'expo-secure-store';
import { CalmColors, CalmSpacing } from '@/constants/calm-theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { IconSymbol } from '@/components/ui/icon-symbol';

interface CalendarEvent {
  id: string;
  summary: string;
  start: string;
  end: string;
}

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3001';

// Generate calendar days for current month
function getMonthDays(year: number, month: number): Date[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const days: Date[] = [];

  // Add leading empty days from previous month
  const startDayOfWeek = firstDay.getDay();
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const prevDay = new Date(year, month, -i);
    days.push(prevDay);
  }

  // Add all days of current month
  for (let day = 1; day <= lastDay.getDate(); day++) {
    days.push(new Date(year, month, day));
  }

  // Add trailing days from next month
  const endDayOfWeek = lastDay.getDay();
  for (let i = 1; i <= 6 - endDayOfWeek; i++) {
    days.push(new Date(year, month + 1, i));
  }

  return days;
}

// Format date as YYYY-MM-DD
function formatDateKey(date: Date): string {
  return date.toISOString().split('T')[0];
}

export default function ScheduleScreen() {
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? CalmColors.dark : CalmColors.light;

  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<Map<string, CalendarEvent[]>>(new Map());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthDays = getMonthDays(year, month);
  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  useEffect(() => {
    fetchCalendarEvents();
  }, [currentDate]);

  const fetchCalendarEvents = async () => {
    setLoading(true);
    try {
      const token = await SecureStore.getItemAsync('google_access_token');
      if (!token) {
        console.log('No Google token found');
        setLoading(false);
        return;
      }

      // Get month range
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0);

      const response = await fetch(`${API_BASE_URL}/get-calendar-events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessToken: token,
          timeMin: startDate.toISOString(),
          timeMax: endDate.toISOString(),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const eventMap = new Map<string, CalendarEvent[]>();

        data.events?.forEach((event: any) => {
          const eventDate = new Date(event.start.dateTime || event.start.date);
          const dateKey = formatDateKey(eventDate);
          
          if (!eventMap.has(dateKey)) {
            eventMap.set(dateKey, []);
          }
          
          const dayEvents = eventMap.get(dateKey)!;
          if (dayEvents.length < 5) {
            dayEvents.push({
              id: event.id,
              summary: event.summary,
              start: event.start.dateTime || event.start.date,
              end: event.end.dateTime || event.end.date,
            });
          }
        });

        setEvents(eventMap);
      }
    } catch (err) {
      console.error('Fetch calendar error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrevMonth = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleDayPress = (day: Date) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedDay(day);
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === month;
  };

  const getDayEvents = (date: Date): CalendarEvent[] => {
    const dateKey = formatDateKey(date);
    return events.get(dateKey) || [];
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={handlePrevMonth} style={styles.navButton}>
            <IconSymbol name="chevron.left" size={24} color={colors.text} />
          </Pressable>
          <Text style={[styles.monthTitle, { color: colors.text }]}>{monthName}</Text>
          <Pressable onPress={handleNextMonth} style={styles.navButton}>
            <IconSymbol name="chevron.right" size={24} color={colors.text} />
          </Pressable>
        </View>

        {/* Weekday Headers */}
        <View style={styles.weekdayHeader}>
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
            <View key={idx} style={styles.weekdayCell}>
              <Text style={[styles.weekdayText, { color: colors.textSecondary }]}>{day}</Text>
            </View>
          ))}
        </View>

        {/* Calendar Grid */}
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        )}

        {!loading && (
          <View style={styles.calendarGrid}>
            {monthDays.map((day, idx) => {
              const dayEvents = getDayEvents(day);
              const hasEvents = dayEvents.length > 0;
              const isCurrentDay = isToday(day);
              const isInMonth = isCurrentMonth(day);

              return (
                <Pressable
                  key={idx}
                  style={[
                    styles.dayCell,
                    isCurrentDay && { backgroundColor: colors.primary, borderRadius: 12 },
                  ]}
                  onPress={() => handleDayPress(day)}
                >
                  <Text
                    style={[
                      styles.dayNumber,
                      { color: isInMonth ? colors.text : colors.textTertiary },
                      isCurrentDay && { color: '#FFFFFF', fontWeight: '700' },
                    ]}
                  >
                    {day.getDate()}
                  </Text>
                  {hasEvents && (
                    <View style={styles.eventDots}>
                      {dayEvents.slice(0, 3).map((_, i) => (
                        <View
                          key={i}
                          style={[
                            styles.eventDot,
                            { backgroundColor: isCurrentDay ? '#FFFFFF' : colors.primary },
                          ]}
                        />
                      ))}
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        )}

        {/* Event List for Selected Day */}
        {selectedDay && (
          <View style={[styles.eventList, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.eventListTitle, { color: colors.text }]}>
              {selectedDay.toLocaleDateString('default', { weekday: 'long', month: 'long', day: 'numeric' })}
            </Text>

            {getDayEvents(selectedDay).length === 0 ? (
              <Text style={[styles.noEventsText, { color: colors.textSecondary }]}>
                No events scheduled
              </Text>
            ) : (
              getDayEvents(selectedDay).map((event) => {
                const startTime = new Date(event.start).toLocaleTimeString('default', {
                  hour: 'numeric',
                  minute: '2-digit',
                });
                return (
                  <View
                    key={event.id}
                    style={[styles.eventCard, { backgroundColor: colors.background, borderColor: colors.border }]}
                  >
                    <View style={[styles.eventColorBar, { backgroundColor: colors.primary }]} />
                    <View style={styles.eventContent}>
                      <Text style={[styles.eventTitle, { color: colors.text }]}>
                        {event.summary}
                      </Text>
                      <Text style={[styles.eventTime, { color: colors.textSecondary }]}>
                        {startTime}
                      </Text>
                    </View>
                  </View>
                );
              })
            )}
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
    padding: CalmSpacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: CalmSpacing.lg,
  },
  navButton: {
    padding: CalmSpacing.sm,
    minWidth: 48,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  weekdayHeader: {
    flexDirection: 'row',
    marginBottom: CalmSpacing.sm,
  },
  weekdayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: CalmSpacing.xs,
  },
  weekdayText: {
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    paddingVertical: CalmSpacing.xxl,
    alignItems: 'center',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: CalmSpacing.xs,
  },
  dayCell: {
    width: '13%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: CalmSpacing.xs,
  },
  dayNumber: {
    fontSize: 16,
    fontWeight: '500',
  },
  eventDots: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 2,
  },
  eventDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  eventList: {
    marginTop: CalmSpacing.xl,
    padding: CalmSpacing.lg,
    borderRadius: 16,
    borderWidth: 1,
  },
  eventListTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: CalmSpacing.md,
  },
  noEventsText: {
    fontSize: 16,
    fontStyle: 'italic',
  },
  eventCard: {
    flexDirection: 'row',
    padding: CalmSpacing.md,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: CalmSpacing.sm,
  },
  eventColorBar: {
    width: 4,
    borderRadius: 2,
    marginRight: CalmSpacing.sm,
  },
  eventContent: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: CalmSpacing.xs / 2,
  },
  eventTime: {
    fontSize: 14,
  },
});
