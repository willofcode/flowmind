/**
 * Google Calendar Test Screen
 * Quick test to verify Google Calendar integration
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import GoogleCalendarAuth from '@/lib/google-calendar-auth';
import { CalmColors, CalmSpacing } from '@/constants/calm-theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function GoogleCalendarTestScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? CalmColors.dark : CalmColors.light;

  const [isSignedIn, setIsSignedIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev].slice(0, 20));
    console.log(message);
  };

  // Check sign-in status on load
  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      const signedIn = await GoogleCalendarAuth.isSignedIn();
      setIsSignedIn(signedIn);
      addLog(`Sign-in status: ${signedIn}`);

      if (signedIn) {
        const token = await GoogleCalendarAuth.getAccessToken();
        setAccessToken(token);
        addLog(`Token: ${token?.substring(0, 20)}...`);

        const userData = await GoogleCalendarAuth.getCurrentUser();
        setUser(userData);
        addLog(`User: ${userData?.email || 'N/A'}`);
      }
    } catch (error: any) {
      addLog(`❌ Status check error: ${error.message}`);
    }
  };

  const handleSignIn = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    addLog('🔐 Starting sign-in...');

    try {
      const result = await GoogleCalendarAuth.signIn();
      
      if (result.success) {
        addLog('✅ Sign-in successful!');
        addLog(`User: ${result.user?.email}`);
        addLog(`Token: ${result.accessToken?.substring(0, 20)}...`);
        
        setIsSignedIn(true);
        setUser(result.user);
        setAccessToken(result.accessToken || null);
      } else {
        addLog(`❌ Sign-in failed: ${result.error}`);
      }
    } catch (error: any) {
      addLog(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    addLog('👋 Signing out...');

    try {
      await GoogleCalendarAuth.signOut();
      setIsSignedIn(false);
      setUser(null);
      setAccessToken(null);
      addLog('✅ Signed out successfully');
    } catch (error: any) {
      addLog(`❌ Sign-out error: ${error.message}`);
    }
  };

  const handleRefreshToken = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    addLog('🔄 Refreshing token...');

    try {
      const token = await GoogleCalendarAuth.getAccessToken();
      setAccessToken(token);
      addLog(`✅ Token refreshed: ${token?.substring(0, 20)}...`);
    } catch (error: any) {
      addLog(`❌ Refresh error: ${error.message}`);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={{ color: colors.primary, fontSize: 16 }}>← Back</Text>
        </Pressable>
        <Text style={[styles.title, { color: colors.text }]}>
          📅 Google Calendar Test
        </Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Status Card */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Status</Text>
          <View style={styles.statusRow}>
            <Text style={{ color: colors.textSecondary }}>Signed In:</Text>
            <Text style={{ 
              color: isSignedIn ? '#34C759' : colors.textSecondary,
              fontWeight: '600'
            }}>
              {isSignedIn ? '✅ Yes' : '❌ No'}
            </Text>
          </View>
          
          {user && (
            <View style={styles.statusRow}>
              <Text style={{ color: colors.textSecondary }}>User:</Text>
              <Text style={{ color: colors.text }}>{user.email || user.name || 'Unknown'}</Text>
            </View>
          )}
          
          {accessToken && (
            <View style={styles.statusRow}>
              <Text style={{ color: colors.textSecondary }}>Token:</Text>
              <Text style={{ color: colors.text, fontSize: 12 }}>
                {accessToken.substring(0, 30)}...
              </Text>
            </View>
          )}
        </View>

        {/* Actions */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Actions</Text>
          
          {!isSignedIn ? (
            <Pressable
              onPress={handleSignIn}
              disabled={loading}
              style={[
                styles.button,
                { backgroundColor: loading ? colors.border : colors.primary }
              ]}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>🔐 Sign In with Google</Text>
              )}
            </Pressable>
          ) : (
            <>
              <Pressable
                onPress={handleRefreshToken}
                style={[styles.button, { backgroundColor: colors.primary }]}
              >
                <Text style={styles.buttonText}>🔄 Refresh Token</Text>
              </Pressable>
              
              <Pressable
                onPress={handleSignOut}
                style={[styles.button, { backgroundColor: '#FF3B30', marginTop: CalmSpacing.sm }]}
              >
                <Text style={styles.buttonText}>👋 Sign Out</Text>
              </Pressable>
            </>
          )}
          
          <Pressable
            onPress={checkStatus}
            style={[styles.button, { backgroundColor: colors.border, marginTop: CalmSpacing.sm }]}
          >
            <Text style={[styles.buttonText, { color: colors.text }]}>
              ℹ️ Check Status
            </Text>
          </Pressable>
        </View>

        {/* Logs */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Logs</Text>
          <ScrollView style={styles.logsContainer} nestedScrollEnabled>
            {logs.map((log, index) => (
              <Text key={index} style={[styles.logText, { color: colors.textSecondary }]}>
                {log}
              </Text>
            ))}
            {logs.length === 0 && (
              <Text style={{ color: colors.textSecondary, fontStyle: 'italic' }}>
                No logs yet
              </Text>
            )}
          </ScrollView>
        </View>

        {/* Info */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Configuration</Text>
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            iOS Client ID:{'\n'}
            {process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.substring(0, 40)}...
          </Text>
          <Text style={[styles.infoText, { color: colors.textSecondary, marginTop: CalmSpacing.sm }]}>
            Scopes:{'\n'}
            • calendar.readonly{'\n'}
            • calendar.events{'\n'}
            • userinfo.profile{'\n'}
            • userinfo.email
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: CalmSpacing.lg,
    paddingBottom: CalmSpacing.md,
  },
  backButton: {
    marginBottom: CalmSpacing.sm,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: CalmSpacing.lg,
  },
  card: {
    borderRadius: 12,
    padding: CalmSpacing.md,
    marginBottom: CalmSpacing.md,
    borderWidth: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: CalmSpacing.sm,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: CalmSpacing.xs,
  },
  button: {
    paddingVertical: CalmSpacing.md,
    paddingHorizontal: CalmSpacing.lg,
    borderRadius: 8,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  logsContainer: {
    maxHeight: 200,
  },
  logText: {
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 12,
    lineHeight: 18,
  },
});
