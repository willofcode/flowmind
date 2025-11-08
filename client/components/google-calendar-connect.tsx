/**
 * Google Calendar connection component
 * Handles OAuth flow and connection status
 */

import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import { signInWithGoogle, signOutGoogle, isSignedIn } from '@/lib/google-auth';

interface GoogleCalendarConnectProps {
  onConnectionChange: (connected: boolean, token?: string) => void;
}

export function GoogleCalendarConnect({ onConnectionChange }: GoogleCalendarConnectProps) {
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkConnection();
  }, []);

  async function checkConnection() {
    const signedIn = await isSignedIn();
    setConnected(signedIn);
    onConnectionChange(signedIn);
  }

  async function handleConnect() {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);

    try {
      const token = await signInWithGoogle();
      
      if (token) {
        setConnected(true);
        onConnectionChange(true, token);
        Alert.alert('Success', 'Google Calendar connected!');
      } else {
        Alert.alert('Error', 'Failed to connect Google Calendar. Check console for details.');
      }
    } catch (error) {
      console.error('Connection error:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleDisconnect() {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    Alert.alert(
      'Disconnect Calendar',
      'Are you sure? Your schedule analysis will be less accurate.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            await signOutGoogle();
            setConnected(false);
            onConnectionChange(false);
          },
        },
      ]
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>📅 Google Calendar</Text>
      <Text style={styles.description}>
        {connected
          ? '✅ Connected - We can analyze your schedule and find optimal times'
          : 'Connect your calendar for intelligent scheduling based on your busy times'}
      </Text>
      
      <Pressable
        style={[styles.button, connected ? styles.disconnectButton : styles.connectButton]}
        onPress={connected ? handleDisconnect : handleConnect}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Loading...' : connected ? 'Disconnect Calendar' : 'Connect Google Calendar'}
        </Text>
      </Pressable>

      {!connected && (
        <Text style={styles.note}>
          ℹ️ We'll only access your busy times and create events for workouts/meals
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#1a1a1a',
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  button: {
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  connectButton: {
    backgroundColor: '#4285F4', // Google blue
  },
  disconnectButton: {
    backgroundColor: '#EA4335', // Google red
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  note: {
    marginTop: 12,
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
});
