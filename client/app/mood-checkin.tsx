/**
 * Mood Check-in Screen
 * Full-screen STT mood recording with AI analysis
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ScrollView,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import * as Haptics from 'expo-haptics';
import MoodCheckInSTT from '@/components/mood-checkin-stt';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { CalmColors, CalmSpacing } from '@/constants/calm-theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface MoodCheckInResult {
  transcription: string;
  audioUrl?: string;
  durationSeconds: number;
  moodScore?: number;
  energyLevel?: string;
  recommendations?: string[];
}

export default function MoodCheckInScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? CalmColors.dark : CalmColors.light;

  const [userId, setUserId] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState<MoodCheckInResult | null>(null);

  React.useEffect(() => {
    loadUserId();
  }, []);

  const loadUserId = async () => {
    // In production, get from Auth0 or user session
    const storedUserId = await SecureStore.getItemAsync('user_id');
    setUserId(storedUserId || 'demo-user-123');
  };

  const handleComplete = async (data: MoodCheckInResult) => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setResults(data);
    setShowResults(true);
  };

  const handleCancel = () => {
    router.back();
  };

  const handleContinue = () => {
    router.back();
  };

  if (!userId) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text }}>Loading...</Text>
      </View>
    );
  }

  if (showResults && results) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView 
          style={styles.resultsScroll}
          contentContainerStyle={styles.resultsContent}
        >
          {/* Header */}
          <View style={styles.resultsHeader}>
            <IconSymbol name="checkmark.circle.fill" size={60} color={colors.primary} />
            <Text style={[styles.resultsTitle, { color: colors.text }]}>
              Thanks for sharing!
            </Text>
            <Text style={[styles.resultsSubtitle, { color: colors.textSecondary }]}>
              Here's what I understood:
            </Text>
          </View>

          {/* Transcription */}
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>
              What you said:
            </Text>
            <Text style={[styles.transcription, { color: colors.text }]}>
              "{results.transcription}"
            </Text>
          </View>

          {/* Mood Analysis */}
          {results.moodScore && (
            <View style={[styles.card, { backgroundColor: colors.surface }]}>
              <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>
                Mood Score
              </Text>
              <View style={styles.moodScoreContainer}>
                <Text style={[styles.moodScore, { color: colors.primary }]}>
                  {results.moodScore}/10
                </Text>
                <Text style={[styles.energyLevel, { color: colors.textSecondary }]}>
                  Energy: {results.energyLevel || 'moderate'}
                </Text>
              </View>
            </View>
          )}

          {/* Recommendations */}
          {results.recommendations && results.recommendations.length > 0 && (
            <View style={[styles.card, { backgroundColor: colors.surface }]}>
              <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>
                💡 Recommendations
              </Text>
              {results.recommendations.map((rec, index) => (
                <View key={index} style={styles.recommendationItem}>
                  <Text style={[styles.bullet, { color: colors.primary }]}>•</Text>
                  <Text style={[styles.recommendationText, { color: colors.text }]}>
                    {rec}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Continue Button */}
          <Pressable
            style={[styles.continueButton, { backgroundColor: colors.primary }]}
            onPress={handleContinue}
          >
            <Text style={styles.continueButtonText}>Continue to Today</Text>
            <IconSymbol name="arrow.right" size={20} color="#FFFFFF" />
          </Pressable>
        </ScrollView>
      </View>
    );
  }

  return (
    <MoodCheckInSTT
      userId={userId}
      onComplete={handleComplete}
      onCancel={handleCancel}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  resultsScroll: {
    flex: 1,
  },
  resultsContent: {
    padding: CalmSpacing.xl,
    paddingTop: CalmSpacing.xxl * 2,
    gap: CalmSpacing.lg,
  },
  resultsHeader: {
    alignItems: 'center',
    marginBottom: CalmSpacing.xl,
    gap: CalmSpacing.sm,
  },
  resultsTitle: {
    fontSize: 28,
    fontWeight: '600',
    marginTop: CalmSpacing.md,
  },
  resultsSubtitle: {
    fontSize: 16,
  },
  card: {
    padding: CalmSpacing.lg,
    borderRadius: 16,
    gap: CalmSpacing.md,
  },
  cardLabel: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  transcription: {
    fontSize: 16,
    lineHeight: 24,
    fontStyle: 'italic',
  },
  moodScoreContainer: {
    gap: CalmSpacing.sm,
  },
  moodScore: {
    fontSize: 36,
    fontWeight: '700',
  },
  energyLevel: {
    fontSize: 16,
    textTransform: 'capitalize',
  },
  recommendationItem: {
    flexDirection: 'row',
    gap: CalmSpacing.sm,
    alignItems: 'flex-start',
  },
  bullet: {
    fontSize: 20,
    lineHeight: 24,
  },
  recommendationText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
  },
  continueButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: CalmSpacing.sm,
    paddingVertical: CalmSpacing.lg,
    paddingHorizontal: CalmSpacing.xl,
    borderRadius: 12,
    marginTop: CalmSpacing.lg,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});
