/**
 * Today View - Shows only the next upcoming block with micro-steps
 * Minimalist, calm, focused on ONE thing at a time
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  useColorScheme,
  AccessibilityInfo,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { CalmColors, CalmSpacing, CalmTypography, CalmBorderRadius } from '../constants/calm-theme';
import { TodayBlock, MicroStep } from '@/types/neuro-profile';

interface TodayViewProps {
  block: TodayBlock | null;
  onStart: () => void;
  onSwapToAlternative: () => void;
  onComplete: () => void;
  onSkip: () => void;
  calmUIEnabled: boolean;
}

export function TodayView({
  block,
  onStart,
  onSwapToAlternative,
  onComplete,
  onSkip,
  calmUIEnabled,
}: TodayViewProps) {
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? CalmColors.dark : CalmColors.light;
  const [expandedDetails, setExpandedDetails] = useState(false);

  const handlePress = async (action: () => void) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    action();
  };

  if (!block) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            No activities scheduled right now.
          </Text>
          <Text style={[styles.emptySubtext, { color: colors.textTertiary }]}>
            You're all caught up! 🎉
          </Text>
        </View>
      </View>
    );
  }

  const timeUntil = new Date(block.start).getTime() - Date.now();
  const minutesUntil = Math.floor(timeUntil / 60000);
  const isStartingSoon = minutesUntil <= 10 && minutesUntil >= 0;
  const isInProgress = block.status === 'in-progress';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Time indicator */}
      {isStartingSoon && (
        <View style={[styles.urgencyBanner, { backgroundColor: colors.warningLight }]}>
          <Text style={[styles.urgencyText, { color: colors.text }]}>
            Starting in {minutesUntil} minute{minutesUntil !== 1 ? 's' : ''}
          </Text>
        </View>
      )}

      {/* Main card */}
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        {/* Type badge */}
        <View
          style={[
            styles.typeBadge,
            {
              backgroundColor:
                block.type === 'workout' ? colors.primaryLight : colors.successLight,
            },
          ]}
        >
          <Text style={[styles.typeBadgeText, { color: '#FFFFFF' }]}>
            {block.type === 'workout' ? '🏃 Workout' : '🍽️ Dinner'}
          </Text>
        </View>

        {/* Title */}
        <Text
          style={[styles.title, { color: colors.text }]}
          accessibilityRole="header"
        >
          {block.title}
        </Text>

        {/* Time */}
        <Text style={[styles.timeText, { color: colors.textSecondary }]}>
          {new Date(block.start).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
          })}
          {' → '}
          {new Date(block.end).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
          })}
        </Text>

        {/* Micro-steps */}
        <View style={styles.stepsContainer}>
          <Text style={[styles.stepsHeader, { color: colors.text }]}>Next steps:</Text>
          {block.microSteps.slice(0, expandedDetails ? undefined : 3).map((step) => (
            <MicroStepItem
              key={step.id}
              step={step}
              colors={colors}
              onToggle={() => {
                /* handle step completion */
              }}
            />
          ))}
          {block.microSteps.length > 3 && !expandedDetails && (
            <Pressable
              onPress={() => setExpandedDetails(true)}
              accessibilityLabel="Show all steps"
            >
              <Text style={[styles.expandLink, { color: colors.primary }]}>
                + {block.microSteps.length - 3} more steps
              </Text>
            </Pressable>
          )}
        </View>

        {/* Actions */}
        <View style={styles.actionContainer}>
          {!isInProgress && (
            <BigActionButton
              label="Start"
              onPress={() => handlePress(onStart)}
              backgroundColor={colors.primary}
              textColor="#FFFFFF"
            />
          )}
          {isInProgress && (
            <BigActionButton
              label="Complete"
              onPress={() => handlePress(onComplete)}
              backgroundColor={colors.success}
              textColor="#FFFFFF"
            />
          )}
        </View>

        {/* Alternative option */}
        {block.alternativeOption && (
          <View style={styles.alternativeContainer}>
            <Text style={[styles.alternativeHeader, { color: colors.textSecondary }]}>
              Not feeling it?
            </Text>
            <Pressable
              style={[styles.alternativeButton, { borderColor: colors.border }]}
              onPress={() => handlePress(onSwapToAlternative)}
            >
              <Text style={[styles.alternativeTitle, { color: colors.text }]}>
                {block.alternativeOption.title}
              </Text>
            </Pressable>
          </View>
        )}

        {/* Skip option */}
        <Pressable
          style={styles.skipButton}
          onPress={() => handlePress(onSkip)}
          accessibilityLabel="Skip this activity"
        >
          <Text style={[styles.skipText, { color: colors.textTertiary }]}>
            Skip for today
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function MicroStepItem({
  step,
  colors,
  onToggle,
}: {
  step: MicroStep;
  colors: typeof CalmColors.light;
  onToggle: () => void;
}) {
  return (
    <Pressable
      style={[styles.stepItem, { borderColor: colors.borderLight }]}
      onPress={onToggle}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: step.completed }}
    >
      <View
        style={[
          styles.stepCheckbox,
          {
            borderColor: colors.border,
            backgroundColor: step.completed ? colors.success : 'transparent',
          },
        ]}
      >
        {step.completed && <Text style={styles.checkmark}>✓</Text>}
      </View>
      <View style={styles.stepContent}>
        <Text
          style={[
            styles.stepText,
            { color: step.completed ? colors.textTertiary : colors.text },
            step.completed && styles.stepTextCompleted,
          ]}
        >
          {step.description}
        </Text>
        {step.estimatedMin > 0 && (
          <Text style={[styles.stepTime, { color: colors.textTertiary }]}>
            ~{step.estimatedMin} min
          </Text>
        )}
      </View>
    </Pressable>
  );
}

function BigActionButton({
  label,
  onPress,
  backgroundColor,
  textColor,
}: {
  label: string;
  onPress: () => void;
  backgroundColor: string;
  textColor: string;
}) {
  return (
    <Pressable
      style={[styles.bigButton, { backgroundColor }]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Text style={[styles.bigButtonText, { color: textColor }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: CalmSpacing.xl,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: CalmSpacing.xxl * 2,
  },
  emptyText: {
    fontSize: CalmTypography.fontSize.lg,
    fontWeight: CalmTypography.fontWeight.medium as any,
    marginBottom: CalmSpacing.sm,
  },
  emptySubtext: {
    fontSize: CalmTypography.fontSize.base,
  },
  urgencyBanner: {
    padding: CalmSpacing.md,
    borderRadius: CalmBorderRadius.md,
    marginBottom: CalmSpacing.md,
    alignItems: 'center',
  },
  urgencyText: {
    fontSize: CalmTypography.fontSize.base,
    fontWeight: CalmTypography.fontWeight.semibold as any,
  },
  card: {
    borderRadius: CalmBorderRadius.lg,
    padding: CalmSpacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  typeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: CalmSpacing.md,
    paddingVertical: CalmSpacing.xs,
    borderRadius: CalmBorderRadius.full,
    marginBottom: CalmSpacing.md,
  },
  typeBadgeText: {
    fontSize: CalmTypography.fontSize.sm,
    fontWeight: CalmTypography.fontWeight.semibold as any,
  },
  title: {
    fontSize: CalmTypography.fontSize.xxxl,
    fontWeight: CalmTypography.fontWeight.bold as any,
    marginBottom: CalmSpacing.sm,
    lineHeight: CalmTypography.fontSize.xxxl * CalmTypography.lineHeight.tight,
  },
  timeText: {
    fontSize: CalmTypography.fontSize.lg,
    marginBottom: CalmSpacing.lg,
  },
  stepsContainer: {
    marginBottom: CalmSpacing.lg,
  },
  stepsHeader: {
    fontSize: CalmTypography.fontSize.base,
    fontWeight: CalmTypography.fontWeight.semibold as any,
    marginBottom: CalmSpacing.md,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: CalmSpacing.md,
    borderBottomWidth: 1,
  },
  stepCheckbox: {
    width: 24,
    height: 24,
    borderRadius: CalmBorderRadius.sm,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: CalmSpacing.md,
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: CalmTypography.fontWeight.bold as any,
  },
  stepContent: {
    flex: 1,
  },
  stepText: {
    fontSize: CalmTypography.fontSize.base,
    lineHeight: CalmTypography.fontSize.base * CalmTypography.lineHeight.relaxed,
  },
  stepTextCompleted: {
    textDecorationLine: 'line-through',
  },
  stepTime: {
    fontSize: CalmTypography.fontSize.sm,
    marginTop: CalmSpacing.xs,
  },
  expandLink: {
    fontSize: CalmTypography.fontSize.base,
    marginTop: CalmSpacing.sm,
    fontWeight: CalmTypography.fontWeight.medium as any,
  },
  actionContainer: {
    marginBottom: CalmSpacing.md,
  },
  bigButton: {
    height: CalmSpacing.comfortableTouchTarget,
    borderRadius: CalmBorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  bigButtonText: {
    fontSize: CalmTypography.fontSize.xl,
    fontWeight: CalmTypography.fontWeight.bold as any,
  },
  alternativeContainer: {
    marginBottom: CalmSpacing.md,
  },
  alternativeHeader: {
    fontSize: CalmTypography.fontSize.sm,
    marginBottom: CalmSpacing.sm,
  },
  alternativeButton: {
    padding: CalmSpacing.md,
    borderRadius: CalmBorderRadius.md,
    borderWidth: 2,
  },
  alternativeTitle: {
    fontSize: CalmTypography.fontSize.base,
    fontWeight: CalmTypography.fontWeight.medium as any,
  },
  skipButton: {
    padding: CalmSpacing.md,
    alignItems: 'center',
  },
  skipText: {
    fontSize: CalmTypography.fontSize.base,
  },
});
