/**
 * Calendar Optimizer Component
 * 
 * Agentic workflow UI for intelligent calendar optimization
 * Uses NeuralSeek mAIstro + Google Calendar API
 */

import React, { useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, ScrollView, Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import { apiClient } from '@/lib/api-client';
import { getAccessToken } from '@/lib/google-auth';
import { CalmColors, CalmSpacing } from '@/constants/calm-theme';

interface CalendarOptimizerProps {
  userId: string;
  onComplete?: (result: any) => void;
  colorScheme?: 'light' | 'dark';
}

export default function CalendarOptimizer({
  userId,
  onComplete,
  colorScheme = 'light'
}: CalendarOptimizerProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [optimizationResult, setOptimizationResult] = useState<any>(null);
  
  const colors = colorScheme === 'dark' ? CalmColors.dark : CalmColors.light;
  
  /**
   * Step 1: Analyze current schedule (preview mode)
   */
  const handleAnalyze = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsAnalyzing(true);
    setAnalysisResult(null);
    
    try {
      // Get Google Calendar access token
      const accessToken = await getAccessToken();
      if (!accessToken) {
        Alert.alert(
          'Google Calendar Not Connected',
          'Please connect your Google Calendar first to use the optimizer.',
          [{ text: 'OK' }]
        );
        return;
      }
      
      // Call analyze endpoint
      const result = await apiClient.analyzeSchedule(userId, accessToken);
      setAnalysisResult(result);
      
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
    } catch (error: any) {
      console.error('Analysis error:', error);
      Alert.alert(
        'Analysis Failed',
        error.message || 'Unable to analyze your schedule. Please try again.',
        [{ text: 'OK' }]
      );
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsAnalyzing(false);
    }
  };
  
  /**
   * Step 2: Run full optimization (makes calendar changes)
   */
  const handleOptimize = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    
    // Confirm with user
    Alert.alert(
      'Optimize Your Calendar?',
      'FlowMind will analyze your schedule and mood, then create breathing breaks, movement snacks, and meal times in your Google Calendar. You can always delete these events later.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Optimize',
          style: 'default',
          onPress: async () => {
            setIsOptimizing(true);
            setOptimizationResult(null);
            
            try {
              const accessToken = await getAccessToken();
              if (!accessToken) {
                Alert.alert('Error', 'Please reconnect Google Calendar');
                return;
              }
              
              // Run optimization
              const result = await apiClient.optimizeCalendar(userId, accessToken);
              setOptimizationResult(result);
              
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              
              // Show success message
              Alert.alert(
                '✅ Calendar Optimized!',
                `Created ${result.summary.eventsCreated} activities in your calendar. Check your Google Calendar to see the new events.`,
                [{ text: 'Great!', onPress: () => onComplete?.(result) }]
              );
              
            } catch (error: any) {
              console.error('Optimization error:', error);
              Alert.alert(
                'Optimization Failed',
                error.message || 'Unable to optimize your calendar. Please try again.',
                [{ text: 'OK' }]
              );
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            } finally {
              setIsOptimizing(false);
            }
          }
        }
      ]
    );
  };
  
  /**
   * Get intensity badge color
   */
  const getIntensityColor = (level: string) => {
    switch (level) {
      case 'high': return '#FF3B30';
      case 'medium': return '#FF9500';
      case 'low': return '#34C759';
      default: return colors.text;
    }
  };
  
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: CalmSpacing.lg }}
    >
      {/* Header */}
      <View style={{ marginBottom: CalmSpacing.xl }}>
        <Text style={{
          fontSize: 28,
          fontWeight: '700',
          color: colors.text,
          marginBottom: CalmSpacing.sm
        }}>
          🤖 Calendar Optimizer
        </Text>
        <Text style={{
          fontSize: 16,
          color: colors.textSecondary,
          lineHeight: 24
        }}>
          AI-powered schedule optimization based on your mood and energy levels.
        </Text>
      </View>
      
      {/* Step 1: Analyze */}
      <View style={{
        backgroundColor: colors.surface,
        borderRadius: 16,
        padding: CalmSpacing.lg,
        marginBottom: CalmSpacing.lg,
        borderWidth: 2,
        borderColor: colors.border
      }}>
        <Text style={{
          fontSize: 20,
          fontWeight: '600',
          color: colors.text,
          marginBottom: CalmSpacing.md
        }}>
          Step 1: Analyze Schedule
        </Text>
        
        <Text style={{
          fontSize: 15,
          color: colors.textSecondary,
          marginBottom: CalmSpacing.lg,
          lineHeight: 22
        }}>
          Preview how FlowMind would optimize your calendar without making changes.
        </Text>
        
        <Pressable
          onPress={handleAnalyze}
          disabled={isAnalyzing}
          style={{
            backgroundColor: isAnalyzing ? colors.border : colors.primary,
            paddingVertical: CalmSpacing.md,
            paddingHorizontal: CalmSpacing.lg,
            borderRadius: 12,
            alignItems: 'center',
            minHeight: 56
          }}
        >
          {isAnalyzing ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={{
              color: '#FFFFFF',
              fontSize: 18,
              fontWeight: '600'
            }}>
              Analyze Today's Schedule
            </Text>
          )}
        </Pressable>
        
        {/* Analysis Results */}
        {analysisResult && (
          <View style={{
            marginTop: CalmSpacing.lg,
            padding: CalmSpacing.md,
            backgroundColor: colors.background,
            borderRadius: 12
          }}>
            <Text style={{
              fontSize: 16,
              fontWeight: '600',
              color: colors.text,
              marginBottom: CalmSpacing.sm
            }}>
              📊 Analysis Results
            </Text>
            
            {/* Intensity Badge */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: CalmSpacing.md
            }}>
              <View style={{
                backgroundColor: getIntensityColor(analysisResult.scheduleIntensity.level),
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 8
              }}>
                <Text style={{
                  color: '#FFFFFF',
                  fontSize: 14,
                  fontWeight: '600',
                  textTransform: 'uppercase'
                }}>
                  {analysisResult.scheduleIntensity.level} INTENSITY
                </Text>
              </View>
              <Text style={{
                marginLeft: CalmSpacing.sm,
                fontSize: 14,
                color: colors.textSecondary
              }}>
                {Math.round(analysisResult.scheduleIntensity.ratio * 100)}% busy
              </Text>
            </View>
            
            {/* Summary Stats */}
            <View style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              marginBottom: CalmSpacing.md
            }}>
              <StatBadge
                label="Available Gaps"
                value={analysisResult.summary.totalGaps}
                colors={colors}
              />
              <StatBadge
                label="Available Minutes"
                value={analysisResult.summary.totalAvailableMinutes}
                colors={colors}
              />
              <StatBadge
                label="Energy Peak Gaps"
                value={analysisResult.summary.energyPeakGaps}
                colors={colors}
              />
            </View>
            
            {/* Recommendations */}
            <Text style={{
              fontSize: 14,
              fontWeight: '600',
              color: colors.text,
              marginBottom: CalmSpacing.sm
            }}>
              AI Recommendations:
            </Text>
            {analysisResult.recommendations.map((rec: string, idx: number) => (
              <Text
                key={idx}
                style={{
                  fontSize: 14,
                  color: colors.textSecondary,
                  marginBottom: 4,
                  lineHeight: 20
                }}
              >
                {rec}
              </Text>
            ))}
          </View>
        )}
      </View>
      
      {/* Step 2: Optimize */}
      {analysisResult && (
        <View style={{
          backgroundColor: colors.surface,
          borderRadius: 16,
          padding: CalmSpacing.lg,
          marginBottom: CalmSpacing.lg,
          borderWidth: 2,
          borderColor: colors.border
        }}>
          <Text style={{
            fontSize: 20,
            fontWeight: '600',
            color: colors.text,
            marginBottom: CalmSpacing.md
          }}>
            Step 2: Run Optimization
          </Text>
          
          <Text style={{
            fontSize: 15,
            color: colors.textSecondary,
            marginBottom: CalmSpacing.lg,
            lineHeight: 22
          }}>
            FlowMind will create breathing breaks, movement snacks, and meal times in your Google Calendar based on AI analysis.
          </Text>
          
          <Pressable
            onPress={handleOptimize}
            disabled={isOptimizing}
            style={{
              backgroundColor: isOptimizing ? colors.border : '#34C759',
              paddingVertical: CalmSpacing.md,
              paddingHorizontal: CalmSpacing.lg,
              borderRadius: 12,
              alignItems: 'center',
              minHeight: 56
            }}
          >
            {isOptimizing ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={{
                color: '#FFFFFF',
                fontSize: 18,
                fontWeight: '600'
              }}>
                Optimize My Calendar
              </Text>
            )}
          </Pressable>
        </View>
      )}
      
      {/* Optimization Results */}
      {optimizationResult && (
        <View style={{
          backgroundColor: colors.surface,
          borderRadius: 16,
          padding: CalmSpacing.lg,
          borderWidth: 2,
          borderColor: '#34C759'
        }}>
          <Text style={{
            fontSize: 20,
            fontWeight: '600',
            color: colors.text,
            marginBottom: CalmSpacing.md
          }}>
            ✅ Optimization Complete
          </Text>
          
          <Text style={{
            fontSize: 15,
            color: colors.textSecondary,
            marginBottom: CalmSpacing.lg,
            lineHeight: 22
          }}>
            {optimizationResult.summary.assessment}
          </Text>
          
          {/* Created Events */}
          <View style={{
            padding: CalmSpacing.md,
            backgroundColor: colors.background,
            borderRadius: 12,
            marginBottom: CalmSpacing.md
          }}>
            <Text style={{
              fontSize: 16,
              fontWeight: '600',
              color: colors.text,
              marginBottom: CalmSpacing.sm
            }}>
              Created {optimizationResult.summary.eventsCreated} Activities:
            </Text>
            {optimizationResult.createdEvents.map((event: any, idx: number) => (
              <Text
                key={idx}
                style={{
                  fontSize: 14,
                  color: colors.textSecondary,
                  marginBottom: 4
                }}
              >
                • {event.summary} - {event.reason}
              </Text>
            ))}
          </View>
          
          {/* AI Recommendations */}
          <Text style={{
            fontSize: 14,
            fontWeight: '600',
            color: colors.text,
            marginBottom: CalmSpacing.sm
          }}>
            AI Recommendations:
          </Text>
          {optimizationResult.recommendations.map((rec: string, idx: number) => (
            <Text
              key={idx}
              style={{
                fontSize: 14,
                color: colors.textSecondary,
                marginBottom: 4,
                lineHeight: 20
              }}
            >
              {rec}
            </Text>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

/**
 * Stat badge component
 */
function StatBadge({ label, value, colors }: any) {
  return (
    <View style={{
      backgroundColor: colors.background,
      padding: CalmSpacing.sm,
      borderRadius: 8,
      marginRight: CalmSpacing.sm,
      marginBottom: CalmSpacing.sm,
      minWidth: 100
    }}>
      <Text style={{
        fontSize: 20,
        fontWeight: '700',
        color: colors.text
      }}>
        {value}
      </Text>
      <Text style={{
        fontSize: 12,
        color: colors.textSecondary
      }}>
        {label}
      </Text>
    </View>
  );
}
