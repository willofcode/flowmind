/**
 * Quick Google Calendar Test Button
 * 
 * Add this to any screen for instant testing:
 * import GoogleCalendarQuickTest from '@/components/google-calendar-quick-test';
 * <GoogleCalendarQuickTest />
 */

import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import GoogleCalendarAuth from '@/lib/google-calendar-auth';
import { CalmColors, CalmSpacing } from '@/constants/calm-theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function GoogleCalendarQuickTest() {
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? CalmColors.dark : CalmColors.light;
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    const connected = await GoogleCalendarAuth.isSignedIn();
    setIsConnected(connected);
    console.log('📅 Quick Test: Connection status =', connected);
  };

  const handleQuickConnect = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);

    try {
      console.log('🚀 Quick Test: Starting sign-in...');
      const result = await GoogleCalendarAuth.signIn();

      if (result.success) {
        console.log('✅ Quick Test: Sign-in successful!');
        console.log('👤 User:', result.user?.email);
        console.log('🎟️ Token:', result.accessToken?.substring(0, 30) + '...');
        
        setIsConnected(true);
        
        Alert.alert(
          '✅ Connected!',
          `Signed in as ${result.user?.email || 'Unknown'}\n\nYou can now use calendar sync features.`,
          [{ text: 'OK' }]
        );
      } else {
        console.log('❌ Quick Test: Sign-in failed:', result.error);
        Alert.alert('Sign-in Failed', result.error || 'Please try again');
      }
    } catch (error: any) {
      console.error('❌ Quick Test: Error:', error);
      Alert.alert('Error', error.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    try {
      await GoogleCalendarAuth.signOut();
      setIsConnected(false);
      console.log('👋 Quick Test: Signed out');
      Alert.alert('Signed Out', 'Google Calendar disconnected');
    } catch (error: any) {
      console.error('❌ Quick Test: Sign out error:', error);
    }
  };

  const handleCheckStatus = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    const token = await GoogleCalendarAuth.getAccessToken();
    const user = await GoogleCalendarAuth.getCurrentUser();
    
    console.log('📊 Quick Test Status:');
    console.log('  Connected:', isConnected);
    console.log('  Token:', token ? token.substring(0, 30) + '...' : 'None');
    console.log('  User:', user?.email || 'None');
    
    Alert.alert(
      'Connection Status',
      `Connected: ${isConnected ? '✅ Yes' : '❌ No'}\n` +
      `User: ${user?.email || 'None'}\n` +
      `Token: ${token ? 'Present' : 'Missing'}`,
      [{ text: 'OK' }]
    );
  };

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: 12,
        padding: CalmSpacing.md,
        marginVertical: CalmSpacing.md,
        borderWidth: 2,
        borderColor: isConnected ? '#34C759' : colors.border,
      }}
    >
      <Text
        style={{
          fontSize: 14,
          fontWeight: '600',
          color: colors.text,
          marginBottom: CalmSpacing.sm,
        }}
      >
        🧪 Google Calendar Quick Test
      </Text>

      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: CalmSpacing.sm }}>
        <Text style={{ fontSize: 13, color: colors.textSecondary, marginRight: 8 }}>
          Status:
        </Text>
        <Text
          style={{
            fontSize: 13,
            fontWeight: '600',
            color: isConnected ? '#34C759' : '#FF3B30',
          }}
        >
          {isConnected ? '✅ Connected' : '❌ Not Connected'}
        </Text>
      </View>

      {!isConnected ? (
        <Pressable
          onPress={handleQuickConnect}
          disabled={loading}
          style={{
            backgroundColor: loading ? colors.border : colors.primary,
            paddingVertical: CalmSpacing.sm,
            paddingHorizontal: CalmSpacing.md,
            borderRadius: 8,
            alignItems: 'center',
            minHeight: 44,
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '600' }}>
            {loading ? '⏳ Connecting...' : '🔐 Connect Google Calendar'}
          </Text>
        </Pressable>
      ) : (
        <View style={{ gap: CalmSpacing.xs }}>
          <Pressable
            onPress={handleCheckStatus}
            style={{
              backgroundColor: colors.primary,
              paddingVertical: CalmSpacing.sm,
              paddingHorizontal: CalmSpacing.md,
              borderRadius: 8,
              alignItems: 'center',
              minHeight: 40,
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '600' }}>
              ℹ️  Check Status
            </Text>
          </Pressable>
          
          <Pressable
            onPress={handleDisconnect}
            style={{
              backgroundColor: '#FF3B30',
              paddingVertical: CalmSpacing.sm,
              paddingHorizontal: CalmSpacing.md,
              borderRadius: 8,
              alignItems: 'center',
              minHeight: 40,
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '600' }}>
              👋 Disconnect
            </Text>
          </Pressable>
        </View>
      )}

      <Text
        style={{
          fontSize: 11,
          color: colors.textSecondary,
          marginTop: CalmSpacing.sm,
          fontStyle: 'italic',
        }}
      >
        Check console logs for detailed output
      </Text>
    </View>
  );
}
