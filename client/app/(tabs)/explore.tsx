/**
 * Browse Tab - Tools & Resources
 * Streak card, breathing tool, grocery list
 * Follows calm UI principles from DESIGN_PATTERNS.md
 */

import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import * as SecureStore from 'expo-secure-store';
import { StreakCard } from '@/components/streak-card';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { CalmColors, CalmSpacing } from '@/constants/calm-theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { StreakData } from '@/types/neuro-profile';

// Mock data - will be replaced with API/storage
const mockStreak: StreakData = {
  currentStreak: 5,
  longestStreak: 12,
  lastCompletedDate: new Date().toISOString().split('T')[0],
  totalCompleted: 47,
};

const mockGroceryList = [
  { item: 'Chicken breast', qty: 2, unit: 'lbs', checked: false },
  { item: 'Mixed greens', qty: 1, unit: 'bag', checked: false },
  { item: 'Quinoa', qty: 1, unit: 'box', checked: true },
  { item: 'Olive oil', qty: 1, unit: 'bottle', checked: false },
  { item: 'Greek yogurt', qty: 4, unit: 'cups', checked: false },
];

export default function BrowseScreen() {
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? CalmColors.dark : CalmColors.light;
  const router = useRouter();
  
  const [streak] = useState<StreakData>(mockStreak);
  const [groceryItems, setGroceryItems] = useState(mockGroceryList);

  const handleStartBreathing = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    Alert.alert(
      'Start Breathing Session',
      'Choose a breathing protocol:',
      [
        {
          text: 'Box Breathing (4-4-4-4)',
          onPress: () => {
            router.push({
              pathname: '/calm-session',
              params: { 
                protocol: 'box',
                duration: '5',
                fromWelcome: 'false'
              },
            });
          },
        },
        {
          text: 'Rescue Breath (4-7-8)',
          onPress: () => {
            router.push({
              pathname: '/calm-session',
              params: { 
                protocol: 'rescue',
                duration: '5',
                fromWelcome: 'false'
              },
            });
          },
        },
        {
          text: 'Meditation (5-5)',
          onPress: () => {
            router.push({
              pathname: '/calm-session',
              params: { 
                protocol: 'meditation',
                duration: '5',
                fromWelcome: 'false'
              },
            });
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleGroceryToggle = async (index: number) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setGroceryItems(prev =>
      prev.map((item, i) =>
        i === index ? { ...item, checked: !item.checked } : item
      )
    );
  };

  const handleCopyGroceryList = async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const groceryText = groceryItems
      .map(({ item, qty, unit, checked }) => {
        const amount = [qty, unit].filter(Boolean).join(' ').trim();
        const label = amount.length ? `${amount} ${item}` : item;
        return `${checked ? '✓' : '•'} ${label}`;
      })
      .join('\n');
    await Clipboard.setStringAsync(groceryText);
    Alert.alert('Copied!', 'Grocery list copied to clipboard');
  };

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
            Browse
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Your wellness tools & resources
          </Text>
        </View>

        {/* Streak Card */}
        <StreakCard streak={streak} />

        {/* Breathing Tool Section */}
        <View style={[styles.section, { marginTop: CalmSpacing.md }]}>
          <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: CalmSpacing.md }]}>
            Breathe & Calm
          </Text>
          <Pressable
            style={({ pressed }) => [
              styles.toolCard,
              {
                backgroundColor: colors.primary,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
            onPress={handleStartBreathing}
          >
            <View style={styles.toolCardContent}>
              <IconSymbol name="wind" size={32} color="#FFFFFF" />
              <View style={styles.toolTextContainer}>
                <Text style={styles.toolTitle}>Start Calm Session</Text>
                <Text style={styles.toolDescription}>
                  Guided breathing with voice instructions
                </Text>
              </View>
            </View>
          </Pressable>
        </View>

        {/* Sand Timer Section */}
        <View style={[styles.section, { marginTop: CalmSpacing.lg }]}>
          <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: CalmSpacing.md }]}>
            Focus & Time
          </Text>
          <Pressable
            style={({ pressed }) => [
              styles.toolCard,
              {
                backgroundColor: '#D4A574', // Sand/gold color
                opacity: pressed ? 0.8 : 1,
              },
            ]}
            onPress={async () => {
              await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push('/sand-timer-input');
            }}
          >
            <View style={styles.toolCardContent}>
              <IconSymbol name="timer" size={32} color="#FFFFFF" />
              <View style={styles.toolTextContainer}>
                <Text style={styles.toolTitle}>Sand Timer</Text>
                <Text style={styles.toolDescription}>
                  Visual timer with calming sand animation
                </Text>
              </View>
            </View>
          </Pressable>
        </View>

        {/* Conversation Tool Section */}
        <View style={[styles.section, { marginTop: CalmSpacing.lg }]}>
          <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: CalmSpacing.md }]}>
            Talk & Reflect
          </Text>
          <Pressable
            style={({ pressed }) => [
              styles.toolCard,
              {
                backgroundColor: colors.primaryLight,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
            onPress={async () => {
              await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push({
                pathname: '/welcome',
                params: { 
                  conversationMode: 'true',
                },
              });
            }}
          >
            <View style={styles.toolCardContent}>
              <IconSymbol name="bubble.left.and.bubble.right" size={32} color="#FFFFFF" />
              <View style={styles.toolTextContainer}>
                <Text style={styles.toolTitle}>Mood Conversation</Text>
                <Text style={styles.toolDescription}>
                  Voice or text check-in with AI support
                </Text>
              </View>
            </View>
          </Pressable>
        </View>

        {/* Grocery List Section */}
        <View style={[styles.section, { marginTop: CalmSpacing.lg }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              This Week's Groceries
            </Text>
            <Pressable
              style={({ pressed }) => [
                styles.copyButton,
                {
                  backgroundColor: colors.surfaceElevated,
                  borderColor: colors.border,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
              onPress={handleCopyGroceryList}
            >
              <IconSymbol name="doc.on.clipboard" size={20} color={colors.text} />
              <Text style={[styles.copyButtonText, { color: colors.text }]}>
                Copy
              </Text>
            </Pressable>
          </View>

          <View
            style={[
              styles.groceryListContainer,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            {groceryItems.map((item, index) => (
              <Pressable
                key={index}
                style={({ pressed }) => [
                  styles.groceryItem,
                  {
                    borderBottomColor: colors.borderLight,
                    opacity: pressed ? 0.7 : 1,
                  },
                  index === groceryItems.length - 1 && styles.groceryItemLast,
                ]}
                onPress={() => handleGroceryToggle(index)}
              >
                <View
                  style={[
                    styles.checkbox,
                    {
                      borderColor: item.checked ? colors.success : colors.border,
                      backgroundColor: item.checked ? colors.success : 'transparent',
                    },
                  ]}
                >
                  {item.checked && (
                    <IconSymbol name="checkmark" size={16} color="#FFFFFF" />
                  )}
                </View>
                <Text
                  style={[
                    styles.groceryItemText,
                    { color: item.checked ? colors.textTertiary : colors.text },
                    item.checked && styles.groceryItemTextChecked,
                  ]}
                >
                  {item.item} ({item.qty} {item.unit})
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
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
  section: {
    marginBottom: CalmSpacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: CalmSpacing.md,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: CalmSpacing.sm,
    padding: CalmSpacing.md,
    borderRadius: 12,
    borderWidth: 2,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  calendarStatus: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: CalmSpacing.sm,
    textAlign: 'center',
  },
  toolCard: {
    borderRadius: 16,
    padding: CalmSpacing.lg,
    minHeight: CalmSpacing.comfortableTouchTarget,
  },
  toolCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: CalmSpacing.md,
  },
  toolTextContainer: {
    flex: 1,
  },
  toolTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: CalmSpacing.xs,
  },
  toolDescription: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: CalmSpacing.xs,
    paddingHorizontal: CalmSpacing.md,
    paddingVertical: CalmSpacing.sm,
    borderRadius: 8,
    borderWidth: 1,
  },
  copyButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  groceryListContainer: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  groceryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: CalmSpacing.md,
    borderBottomWidth: 1,
    minHeight: CalmSpacing.minTouchTarget,
  },
  groceryItemLast: {
    borderBottomWidth: 0,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    marginRight: CalmSpacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groceryItemText: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  groceryItemTextChecked: {
    textDecorationLine: 'line-through',
  },
});
