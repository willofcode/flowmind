/**
 * Sand Timer Input Screen - Scrollable Time Picker
 * iOS-style scrollable pickers for minutes and seconds
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { CalmColors, CalmSpacing, CalmTypography } from '@/constants/calm-theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { IconSymbol } from '@/components/ui/icon-symbol';

const ITEM_HEIGHT = 60;

export default function SandTimerInputScreen() {
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? CalmColors.dark : CalmColors.light;
  const router = useRouter();

  const [minutes, setMinutes] = useState(1); // Changed from 5 to 1
  const [seconds, setSeconds] = useState(0);

  // Refs for ScrollViews to programmatically scroll
  const minutesScrollRef = useRef<ScrollView>(null);
  const secondsScrollRef = useRef<ScrollView>(null);

  // Initialize scroll position to 1 minute on mount
  useEffect(() => {
    // Delay to ensure ScrollView is mounted
    const timer = setTimeout(() => {
      minutesScrollRef.current?.scrollTo({
        y: 1 * ITEM_HEIGHT, // Scroll to 1 minute (index 1)
        animated: false, // No animation on initial load
      });
      secondsScrollRef.current?.scrollTo({
        y: 0, // Scroll to 0 seconds
        animated: false,
      });
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  // Generate arrays for scrollable pickers
  const minutesArray = Array.from({ length: 61 }, (_, i) => i); // 0-60
  const secondsArray = Array.from({ length: 12 }, (_, i) => i * 5); // 0, 5, 10, ..., 55

  const handleStartTimer = async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    const totalMinutes = minutes + (seconds / 60);
    
    if (totalMinutes === 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    
    // Close this modal first
    router.back();
    
    // Then navigate to sand timer (slight delay to ensure smooth transition)
    setTimeout(() => {
      router.push({
        pathname: '/sand-timer',
        params: {
          duration: totalMinutes.toString(),
          title: 'Focus Time',
          taskId: 'custom-timer',
        },
      });
    }, 100);
  };

  const handleQuickSelect = async (mins: number) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setMinutes(mins);
    setSeconds(0);
    
    // Scroll to the selected minute position
    minutesScrollRef.current?.scrollTo({
      y: mins * ITEM_HEIGHT,
      animated: true,
    });
    
    // Scroll seconds to 0
    secondsScrollRef.current?.scrollTo({
      y: 0,
      animated: true,
    });
  };

  const totalMinutes = minutes + (seconds / 60);
  const isValid = totalMinutes > 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={async () => {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
          style={styles.backButton}
        >
          <IconSymbol name="chevron.left" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Set Timer
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Instructions */}
      <View style={styles.instructions}>
        <Text style={[styles.instructionText, { color: colors.textSecondary }]}>
          Scroll to select time
        </Text>
      </View>

      {/* Scrollable Time Picker */}
      <View style={styles.pickerContainer}>
        {/* Selection Overlay Indicator - Behind the numbers */}
        <View 
          style={[
            styles.selectionOverlay, 
            { 
              backgroundColor: colors.primary,
            }
          ]} 
          pointerEvents="none"
        />
        
        {/* Minutes Picker */}
        <View style={styles.pickerColumn}>
          <ScrollView
            ref={minutesScrollRef}
            showsVerticalScrollIndicator={false}
            snapToInterval={ITEM_HEIGHT}
            decelerationRate="fast"
            scrollEnabled={true}
            contentContainerStyle={styles.scrollContent}
            onScroll={(event) => {
              const index = Math.round(event.nativeEvent.contentOffset.y / ITEM_HEIGHT);
              const newMinutes = minutesArray[Math.min(index, minutesArray.length - 1)];
              if (newMinutes !== minutes) {
                setMinutes(newMinutes);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }
            }}
            scrollEventThrottle={16}
          >
            {minutesArray.map((value, index) => {
              const isSelected = value === minutes;
              const isPrevious = index === minutes - 1;
              const isNext = index === minutes + 1;
              const isVisible = isSelected || isPrevious || isNext;
              
              return (
                <View
                  key={`min-${value}`}
                  style={styles.pickerItem}
                >
                  <Text
                    style={[
                      styles.pickerValue,
                      {
                        color: isSelected ? colors.text : colors.textSecondary,
                        fontSize: isSelected ? 56 : 36,
                        fontWeight: isSelected ? '700' : '400',
                        opacity: isVisible ? (isSelected ? 1 : 0.5) : 0,
                      },
                    ]}
                  >
                    {value.toString().padStart(2, '0')}
                  </Text>
                </View>
              );
            })}
          </ScrollView>
          <Text style={[styles.pickerLabel, { color: colors.textSecondary }]}>
            min
          </Text>
        </View>

        {/* Separator */}
        <Text style={[styles.separator, { color: colors.text }]}>:</Text>

        {/* Seconds Picker */}
        <View style={styles.pickerColumn}>
          <ScrollView
            ref={secondsScrollRef}
            showsVerticalScrollIndicator={false}
            snapToInterval={ITEM_HEIGHT}
            decelerationRate="fast"
            scrollEnabled={true}
            contentContainerStyle={styles.scrollContent}
            onScroll={(event) => {
              const index = Math.round(event.nativeEvent.contentOffset.y / ITEM_HEIGHT);
              const newSeconds = secondsArray[Math.min(index, secondsArray.length - 1)];
              if (newSeconds !== seconds) {
                setSeconds(newSeconds);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }
            }}
            scrollEventThrottle={16}
          >
            {secondsArray.map((value, index) => {
              const currentIndex = seconds / 5;
              const isSelected = value === seconds;
              const isPrevious = index === currentIndex - 1;
              const isNext = index === currentIndex + 1;
              const isVisible = isSelected || isPrevious || isNext;
              
              return (
                <View
                  key={`sec-${value}`}
                  style={styles.pickerItem}
                >
                  <Text
                    style={[
                      styles.pickerValue,
                      {
                        color: isSelected ? colors.text : colors.textSecondary,
                        fontSize: isSelected ? 56 : 36,
                        fontWeight: isSelected ? '700' : '400',
                        opacity: isVisible ? (isSelected ? 1 : 0.5) : 0,
                      },
                    ]}
                  >
                    {value.toString().padStart(2, '0')}
                  </Text>
                </View>
              );
            })}
          </ScrollView>
          <Text style={[styles.pickerLabel, { color: colors.textSecondary }]}>
            sec
          </Text>
        </View>
      </View>

      {/* Quick Select Buttons */}
      <View style={styles.quickSelectContainer}>
        <Text style={[styles.quickSelectTitle, { color: colors.textSecondary }]}>
          Quick Select
        </Text>
        <View style={styles.quickSelectButtons}>
          {[1, 5, 15, 30].map((mins) => (
            <Pressable
              key={mins}
              style={({ pressed }) => [
                styles.quickButton,
                {
                  backgroundColor: minutes === mins && seconds === 0 
                    ? colors.primary 
                    : colors.surface,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
              onPress={() => handleQuickSelect(mins)}
            >
              <Text
                style={[
                  styles.quickButtonText,
                  {
                    color: minutes === mins && seconds === 0 
                      ? '#FFFFFF' 
                      : colors.text,
                  },
                ]}
              >
                {mins}m
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Start Button */}
      <View style={styles.bottomSection}>
        <Pressable
          style={({ pressed }) => [
            styles.startButton,
            {
              backgroundColor: isValid ? '#D4A574' : colors.border,
              opacity: pressed && isValid ? 0.8 : 1,
            },
          ]}
          onPress={handleStartTimer}
          disabled={!isValid}
        >
          <IconSymbol 
            name="timer" 
            size={24} 
            color="#FFFFFF" 
            style={{ marginRight: CalmSpacing.sm }}
          />
          <Text style={styles.startButtonText}>
            {isValid ? 'Start Sand Timer' : 'Set a time first'}
          </Text>
        </Pressable>

        {isValid && (
          <Text style={[styles.durationHint, { color: colors.textSecondary }]}>
            Duration: {Math.floor(totalMinutes)} min {Math.round((totalMinutes % 1) * 60)} sec
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: CalmSpacing.lg,
    paddingTop: 60,
    paddingBottom: CalmSpacing.lg,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: CalmTypography.fontSize.xl,
    fontWeight: '700',
  },
  instructions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: CalmSpacing.sm,
    paddingHorizontal: CalmSpacing.lg,
    marginBottom: CalmSpacing.md,
  },
  instructionText: {
    fontSize: CalmTypography.fontSize.base,
  },
  pickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: CalmSpacing.md,
    height: 240,
    marginVertical: CalmSpacing.lg,
    position: 'relative',
  },
  pickerColumn: {
    alignItems: 'center',
    height: 240,
    width: 100,
  },
  scrollContent: {
    paddingVertical: 90, // Center the first item
  },
  pickerItem: {
    height: ITEM_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerValue: {
    fontSize: 32,
    fontVariant: ['tabular-nums'],
  },
  pickerLabel: {
    fontSize: CalmTypography.fontSize.sm,
    fontWeight: '600',
    marginTop: CalmSpacing.sm,
    position: 'absolute',
    bottom: -30,
  },
  separator: {
    fontSize: 56,
    fontWeight: '700',
    lineHeight: 60,
    marginHorizontal: CalmSpacing.xs,
    zIndex: 1,
  },
  selectionOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -145 }, { translateY: -30 }], // Adjusted to center on both numbers
    width: 290, // Wide enough to cover both numbers + colon
    height: 60, // Match ITEM_HEIGHT
    borderRadius: 12,
    opacity: 0.15,
    pointerEvents: 'none',
  },
  quickSelectContainer: {
    paddingHorizontal: CalmSpacing.lg,
    marginTop: CalmSpacing.xl,
  },
  quickSelectTitle: {
    fontSize: CalmTypography.fontSize.sm,
    fontWeight: '600',
    marginBottom: CalmSpacing.md,
    textAlign: 'center',
  },
  quickSelectButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: CalmSpacing.sm,
    justifyContent: 'center',
  },
  quickButton: {
    paddingHorizontal: CalmSpacing.lg,
    paddingVertical: CalmSpacing.md,
    borderRadius: 12,
    minWidth: 70,
    alignItems: 'center',
  },
  quickButtonText: {
    fontSize: CalmTypography.fontSize.base,
    fontWeight: '600',
  },
  bottomSection: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: CalmSpacing.lg,
    paddingBottom: 40,
  },
  startButton: {
    height: 64,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: CalmSpacing.sm,
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: CalmTypography.fontSize.lg,
    fontWeight: '700',
  },
  durationHint: {
    fontSize: CalmTypography.fontSize.sm,
    textAlign: 'center',
  },
});
