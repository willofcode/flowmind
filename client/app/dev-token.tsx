/**
 * Dev Tool: Display Access Token
 * Navigate to /dev-token to see and copy your Google access token
 */

import { View, Text, Pressable, ScrollView, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import * as Clipboard from 'expo-clipboard';
import * as SecureStore from 'expo-secure-store';
import { getCalendarAccessToken } from '@/lib/google-calendar-auth';
import { router } from 'expo-router';

export default function DevTokenScreen() {
  const [token, setToken] = useState<string>('Loading...');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadToken();
  }, []);

  async function loadToken() {
    try {
      // Get stored token directly (no API calls)
      const storedToken = await SecureStore.getItemAsync('google_calendar_access_token');
      if (storedToken) {
        setToken(storedToken);
        console.log('✅ Token loaded successfully');
      } else {
        setToken('No token found. Please sign in with Google first.');
        console.log('❌ No token in secure storage');
      }
    } catch (error: any) {
      setToken(`Error: ${error.message}`);
      console.error('❌ Token load error:', error);
    }
  }

  async function copyToClipboard() {
    if (token && !token.includes('Error') && !token.includes('Loading')) {
      await Clipboard.setStringAsync(token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      console.log('✅ Token copied to clipboard!');
      console.log('Run this in your server folder:');
      console.log(`node setup-webhook.js ${token.substring(0, 20)}... https://unchemical-subglacially-kimbra.ngrok-free.dev`);
    }
  }

  return (
    <View style={{ flex: 1, padding: 20, backgroundColor: '#fff' }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20 }}>
        🔑 Access Token
      </Text>

      <Text style={{ fontSize: 14, color: '#666', marginBottom: 10 }}>
        Copy this token to set up the webhook:
      </Text>

      <ScrollView 
        style={{ 
          backgroundColor: '#f5f5f5', 
          padding: 15, 
          borderRadius: 8,
          marginBottom: 20,
          maxHeight: 200
        }}
      >
        <Text style={{ fontSize: 12, fontFamily: 'monospace' }} selectable>
          {token}
        </Text>
      </ScrollView>

      <Pressable
        onPress={copyToClipboard}
        style={{
          backgroundColor: copied ? '#4CAF50' : '#007AFF',
          padding: 16,
          borderRadius: 12,
          alignItems: 'center',
          marginBottom: 10
        }}
      >
        <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>
          {copied ? '✅ Copied!' : '📋 Copy Token'}
        </Text>
      </Pressable>

      <Pressable
        onPress={loadToken}
        style={{
          backgroundColor: '#6c757d',
          padding: 16,
          borderRadius: 12,
          alignItems: 'center',
          marginBottom: 10
        }}
      >
        <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>
          🔄 Refresh Token
        </Text>
      </Pressable>

      <View style={{ 
        backgroundColor: '#fff3cd', 
        padding: 15, 
        borderRadius: 8,
        borderLeftWidth: 4,
        borderLeftColor: '#ffc107',
        marginTop: 20
      }}>
        <Text style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 8 }}>
          📝 Next Steps:
        </Text>
        <Text style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>
          1. Copy the token above
        </Text>
        <Text style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>
          2. Open Terminal and cd to server folder
        </Text>
        <Text style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>
          3. Run: node setup-webhook.js [TOKEN] [NGROK_URL]
        </Text>
        <Text style={{ fontSize: 12, color: '#666' }}>
          4. Your ngrok URL: https://unchemical-subglacially-kimbra.ngrok-free.dev
        </Text>
      </View>

      <Pressable
        onPress={() => router.back()}
        style={{
          marginTop: 20,
          padding: 16,
          alignItems: 'center'
        }}
      >
        <Text style={{ color: '#007AFF', fontSize: 16 }}>
          ← Back
        </Text>
      </Pressable>
    </View>
  );
}
