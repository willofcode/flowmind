/**
 * Get Access Token Helper
 * 
 * Run this in the app to get your current Google Calendar access token
 * Then use it with setup-webhook.js
 */

import * as SecureStore from 'expo-secure-store';
import { getCalendarAccessToken } from './google-calendar-auth';

export async function printAccessToken() {
  try {
    console.log('🔍 Retrieving access token...\n');
    
    // Method 1: From storage
    const storedToken = await SecureStore.getItemAsync('google_calendar_access_token');
    if (storedToken) {
      console.log('📋 Access Token (from storage):');
      console.log(storedToken);
      console.log('');
    }
    
    // Method 2: Refresh if needed
    const freshToken = await getCalendarAccessToken();
    if (freshToken && freshToken !== storedToken) {
      console.log('📋 Refreshed Access Token:');
      console.log(freshToken);
      console.log('');
    }
    
    console.log('✅ Copy the token above and use it with:');
    console.log('   cd server');
    console.log(`   node setup-webhook.js <TOKEN> <NGROK_URL>`);
    
  } catch (error) {
    console.error('❌ Error getting token:', error);
  }
}

// Call this from your app console
// Example: import { printAccessToken } from '@/lib/get-token'; printAccessToken();
