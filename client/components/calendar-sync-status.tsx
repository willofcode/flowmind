/**
 * Calendar Sync Status Component
 * 
 * Shows sync status and prompts user to re-optimize when needed
 */

import React from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useGoogleCalendar } from '@/lib/use-google-calendar';
import { CalmColors, CalmSpacing } from '@/constants/calm-theme';
import { useRouter } from 'expo-router';

interface CalendarSyncStatusProps {
  userId: string;
  colorScheme?: 'light' | 'dark';
  onReoptimizePress?: () => void;
}

export default function CalendarSyncStatus({
  userId,
  colorScheme = 'light',
  onReoptimizePress
}: CalendarSyncStatusProps) {
  const router = useRouter();
  const colors = colorScheme === 'dark' ? CalmColors.dark : CalmColors.light;
  
  const {
    isConnected,
    isConnecting,
    isSyncing,
    lastSyncTime,
    changes,
    shouldReoptimize,
    connect,
    disconnect,
    sync,
    error
  } = useGoogleCalendar(userId, {
    autoSync: true,
    syncInterval: 15, // Sync every 15 minutes
    onReoptimizeRecommended: () => {
      // Could show a push notification here
      console.log('📢 Re-optimization recommended!');
    }
  });

  const handleConnect = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await connect();
  };

  const handleDisconnect = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await disconnect();
  };

  const handleSync = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await sync();
  };

  const handleReoptimize = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    if (onReoptimizePress) {
      onReoptimizePress();
    } else {
      // Navigate to mood checkin as fallback
      router.push('/mood-checkin');
    }
  };

  const formatSyncTime = (date: Date | null) => {
    if (!date) return 'Never';
    
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
    return `${Math.floor(minutes / 1440)}d ago`;
  };

  if (!isConnected) {
    return (
      <View style={{
        backgroundColor: colors.surface,
        borderRadius: 12,
        padding: CalmSpacing.md,
        borderWidth: 1,
        borderColor: colors.border
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: CalmSpacing.sm }}>
          <Text style={{ fontSize: 16, color: colors.textSecondary }}>
            📅 Google Calendar
          </Text>
        </View>
        
        <Text style={{
          fontSize: 14,
          color: colors.textSecondary,
          marginBottom: CalmSpacing.md
        }}>
          Connect your calendar to enable automatic optimization
        </Text>
        
        <Pressable
          onPress={handleConnect}
          disabled={isConnecting}
          style={{
            backgroundColor: isConnecting ? colors.border : colors.primary,
            paddingVertical: CalmSpacing.sm,
            paddingHorizontal: CalmSpacing.md,
            borderRadius: 8,
            alignItems: 'center'
          }}
        >
          {isConnecting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '600' }}>
              Connect Google Calendar
            </Text>
          )}
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: CalmSpacing.md,
      borderWidth: shouldReoptimize ? 2 : 1,
      borderColor: shouldReoptimize ? '#FF9500' : colors.border
    }}>
      {/* Header */}
      <View style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: CalmSpacing.sm
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ fontSize: 16, color: colors.text, fontWeight: '600' }}>
            📅 Google Calendar
          </Text>
          <View style={{
            marginLeft: 8,
            backgroundColor: '#34C759',
            paddingHorizontal: 8,
            paddingVertical: 2,
            borderRadius: 4
          }}>
            <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '600' }}>
              CONNECTED
            </Text>
          </View>
        </View>
        
        <Pressable onPress={handleDisconnect}>
          <Text style={{ color: colors.primary, fontSize: 13 }}>
            Disconnect
          </Text>
        </Pressable>
      </View>

      {/* Sync Status */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: CalmSpacing.sm
      }}>
        {isSyncing ? (
          <>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={{
              marginLeft: 8,
              fontSize: 13,
              color: colors.textSecondary
            }}>
              Syncing...
            </Text>
          </>
        ) : (
          <>
            <Text style={{
              fontSize: 13,
              color: colors.textSecondary
            }}>
              Last synced: {formatSyncTime(lastSyncTime)}
            </Text>
            <Pressable
              onPress={handleSync}
              style={{ marginLeft: 8 }}
            >
              <Text style={{ color: colors.primary, fontSize: 13 }}>
                🔄 Sync
              </Text>
            </Pressable>
          </>
        )}
      </View>

      {/* Changes Summary */}
      {changes && (changes.added.length > 0 || changes.modified.length > 0 || changes.deleted.length > 0) && (
        <View style={{
          backgroundColor: colors.background,
          borderRadius: 8,
          padding: CalmSpacing.sm,
          marginBottom: CalmSpacing.sm
        }}>
          <Text style={{
            fontSize: 12,
            color: colors.textSecondary,
            marginBottom: 4
          }}>
            Recent changes:
          </Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            {changes.added.length > 0 && (
              <Text style={{ fontSize: 12, color: '#34C759' }}>
                +{changes.added.length} added
              </Text>
            )}
            {changes.modified.length > 0 && (
              <Text style={{ fontSize: 12, color: '#FF9500' }}>
                ~{changes.modified.length} modified
              </Text>
            )}
            {changes.deleted.length > 0 && (
              <Text style={{ fontSize: 12, color: '#FF3B30' }}>
                -{changes.deleted.length} deleted
              </Text>
            )}
          </View>
        </View>
      )}

      {/* Re-optimization Alert */}
      {shouldReoptimize && (
        <View style={{
          backgroundColor: '#FFF3CD',
          borderRadius: 8,
          padding: CalmSpacing.md,
          marginBottom: CalmSpacing.sm
        }}>
          <Text style={{
            fontSize: 14,
            color: '#856404',
            fontWeight: '600',
            marginBottom: 4
          }}>
            ⚠️ Schedule Changed
          </Text>
          <Text style={{
            fontSize: 13,
            color: '#856404',
            marginBottom: CalmSpacing.sm
          }}>
            Your calendar has changed significantly. We recommend re-optimizing.
          </Text>
          
          <Pressable
            onPress={handleReoptimize}
            style={{
              backgroundColor: '#FF9500',
              paddingVertical: CalmSpacing.sm,
              paddingHorizontal: CalmSpacing.md,
              borderRadius: 8,
              alignItems: 'center'
            }}
          >
            <Text style={{
              color: '#FFFFFF',
              fontSize: 14,
              fontWeight: '600'
            }}>
              Re-Optimize Calendar
            </Text>
          </Pressable>
        </View>
      )}

      {/* Error */}
      {error && (
        <View style={{
          backgroundColor: '#FFEBEE',
          borderRadius: 8,
          padding: CalmSpacing.sm,
          marginTop: CalmSpacing.sm
        }}>
          <Text style={{ fontSize: 12, color: '#C62828' }}>
            ⚠️ {error}
          </Text>
        </View>
      )}
    </View>
  );
}
