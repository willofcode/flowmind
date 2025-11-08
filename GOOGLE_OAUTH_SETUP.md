# Google Calendar OAuth Setup Guide

## Current Status

⚠️ **Google Calendar integration is INCOMPLETE**. You have:
- ✅ Server endpoints that accept `accessToken`
- ✅ API client methods to call calendar API
- ❌ **Missing: OAuth flow to get the access token**

## What You Need

### 1. Google Cloud Console Setup

#### Step 1: Create/Configure Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project: **"FlowMind Calendar"**
3. Note your **Project ID**

#### Step 2: Enable Google Calendar API
1. In the project, go to **"APIs & Services" > "Library"**
2. Search for **"Google Calendar API"**
3. Click **"Enable"**

#### Step 3: Configure OAuth Consent Screen
1. Go to **"APIs & Services" > "OAuth consent screen"**
2. Choose **"External"** (unless you have Google Workspace)
3. Fill in:
   - **App name**: FlowMind
   - **User support email**: Your email
   - **Developer contact**: Your email
4. **Scopes**: Add these scopes:
   - `https://www.googleapis.com/auth/calendar.readonly`
   - `https://www.googleapis.com/auth/calendar.events`
5. **Test users**: Add your email for testing
6. Save and continue

#### Step 4: Create OAuth 2.0 Credentials

**For iOS (Expo):**
1. Go to **"APIs & Services" > "Credentials"**
2. Click **"Create Credentials" > "OAuth client ID"**
3. Select **"iOS"**
4. **Bundle ID**: Get from `client/app.json` (e.g., `com.yourcompany.flowmind`)
   - If not set, add this to `app.json`:
     ```json
     {
       "expo": {
         "ios": {
           "bundleIdentifier": "com.yourcompany.flowmind"
         }
       }
     }
     ```
5. Click **"Create"**
6. Copy the **Client ID** (format: `xxx.apps.googleusercontent.com`)

**For Web (optional, for Expo Go):**
1. Create another credential: **"Web application"**
2. **Authorized redirect URIs**: Add `https://auth.expo.io/@your-username/flowmind`
3. Copy **Client ID** and **Client Secret**

---

## Installation

### Install Required Packages
```bash
cd client
npx expo install expo-auth-session expo-crypto expo-web-browser
```

---

## Implementation

### 1. Environment Variables

Add to `client/.env`:
```bash
EXPO_PUBLIC_GOOGLE_CLIENT_ID=your_ios_client_id.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your_web_client_id.apps.googleusercontent.com
```

### 2. Update app.json

```json
{
  "expo": {
    "name": "FlowMind",
    "slug": "flowmind",
    "scheme": "flowmind",
    "ios": {
      "bundleIdentifier": "com.yourcompany.flowmind",
      "supportsTablet": true
    }
  }
}
```
https://auth.expo.iohttps://auth.expo.io/@YOUR_EXPO_USERNAME/flowmind
**Note:** `expo-auth-session` does NOT need to be in the `plugins` array. It works automatically with just the `scheme` field set.

### 3. Create Google Auth Module

Create `client/lib/google-auth.ts`:

```typescript
/**
 * Google Calendar OAuth Integration
 * Uses expo-auth-session for OAuth 2.0 flow
 */

import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Required for closing the auth modal properly
WebBrowser.maybeCompleteAuthSession();

// Google OAuth Configuration
const GOOGLE_CLIENT_ID = Platform.select({
  ios: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
  web: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
}) || '';

const SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events',
];

const discovery = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

// Storage keys
const ACCESS_TOKEN_KEY = 'google_access_token';
const REFRESH_TOKEN_KEY = 'google_refresh_token';
const TOKEN_EXPIRY_KEY = 'google_token_expiry';

/**
 * Initiate Google Sign-In flow
 * Returns access token if successful
 */
export async function signInWithGoogle(): Promise<string | null> {
  try {
    const redirectUri = AuthSession.makeRedirectUri({
      scheme: 'flowmind',
      path: 'redirect',
    });

    const request = new AuthSession.AuthRequest({
      clientId: GOOGLE_CLIENT_ID,
      scopes: SCOPES,
      redirectUri,
      responseType: AuthSession.ResponseType.Code,
      usePKCE: true,
      extraParams: {
        access_type: 'offline', // Get refresh token
        prompt: 'consent', // Force consent to get refresh token
      },
    });

    const result = await request.promptAsync(discovery);

    if (result.type === 'success') {
      const { code } = result.params;
      
      // Exchange code for tokens
      const tokenResponse = await AuthSession.exchangeCodeAsync(
        {
          clientId: GOOGLE_CLIENT_ID,
          code,
          redirectUri,
          extraParams: {
            code_verifier: request.codeVerifier || '',
          },
        },
        discovery
      );

      // Store tokens securely
      await storeTokens(tokenResponse);
      
      return tokenResponse.accessToken;
    }

    return null;
  } catch (error) {
    console.error('Google Sign-In error:', error);
    return null;
  }
}

/**
 * Get current access token (refresh if expired)
 */
export async function getAccessToken(): Promise<string | null> {
  try {
    const accessToken = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
    const expiryStr = await SecureStore.getItemAsync(TOKEN_EXPIRY_KEY);
    
    if (!accessToken) return null;

    // Check if token expired
    if (expiryStr) {
      const expiry = parseInt(expiryStr, 10);
      const now = Date.now();
      
      // Refresh 5 minutes before expiry
      if (now >= expiry - 5 * 60 * 1000) {
        return await refreshAccessToken();
      }
    }

    return accessToken;
  } catch (error) {
    console.error('Get access token error:', error);
    return null;
  }
}

/**
 * Refresh access token using refresh token
 */
async function refreshAccessToken(): Promise<string | null> {
  try {
    const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    
    if (!refreshToken) {
      console.log('No refresh token available');
      return null;
    }

    const response = await fetch(discovery.tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }).toString(),
    });

    if (!response.ok) {
      throw new Error('Token refresh failed');
    }

    const tokens = await response.json();
    
    // Store new access token (refresh token stays the same)
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, tokens.access_token);
    
    if (tokens.expires_in) {
      const expiry = Date.now() + tokens.expires_in * 1000;
      await SecureStore.setItemAsync(TOKEN_EXPIRY_KEY, expiry.toString());
    }

    return tokens.access_token;
  } catch (error) {
    console.error('Token refresh error:', error);
    await signOutGoogle(); // Clear invalid tokens
    return null;
  }
}

/**
 * Store tokens securely
 */
async function storeTokens(tokenResponse: AuthSession.TokenResponse) {
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, tokenResponse.accessToken);
  
  if (tokenResponse.refreshToken) {
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokenResponse.refreshToken);
  }
  
  if (tokenResponse.expiresIn) {
    const expiry = Date.now() + tokenResponse.expiresIn * 1000;
    await SecureStore.setItemAsync(TOKEN_EXPIRY_KEY, expiry.toString());
  }
}

/**
 * Sign out and clear tokens
 */
export async function signOutGoogle(): Promise<void> {
  await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  await SecureStore.deleteItemAsync(TOKEN_EXPIRY_KEY);
}

/**
 * Check if user is signed in
 */
export async function isSignedIn(): Promise<boolean> {
  const token = await getAccessToken();
  return token !== null;
}

/**
 * Revoke Google access (full sign out)
 */
export async function revokeGoogleAccess(): Promise<void> {
  try {
    const token = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
    
    if (token) {
      await fetch(
        `${discovery.revocationEndpoint}?token=${token}`,
        { method: 'POST' }
      );
    }
    
    await signOutGoogle();
  } catch (error) {
    console.error('Revoke access error:', error);
    await signOutGoogle(); // Clear tokens anyway
  }
}
```

### 4. Create UI Component

Create `client/components/google-calendar-connect.tsx`:

```typescript
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
        Alert.alert('Error', 'Failed to connect Google Calendar');
      }
    } catch (error) {
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
      <Text style={styles.title}>Google Calendar</Text>
      <Text style={styles.description}>
        {connected
          ? 'Connected - We can analyze your schedule and find optimal times'
          : 'Connect your calendar for intelligent scheduling'}
      </Text>
      
      <Pressable
        style={[styles.button, connected ? styles.disconnectButton : styles.connectButton]}
        onPress={connected ? handleDisconnect : handleConnect}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Loading...' : connected ? 'Disconnect' : 'Connect Google Calendar'}
        </Text>
      </Pressable>

      {connected && (
        <Text style={styles.note}>
          ✓ FlowMind can now read your busy times and create optimized events
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
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
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
    color: '#3A8F3D',
  },
});
```

### 5. Update Profile Store

Add to `client/lib/profile-store.ts`:

```typescript
export interface PersonalNeuroProfile {
  // ... existing fields
  googleAccessToken?: string;
  googleRefreshToken?: string;
  calendarConnected: boolean;
}

// Update defaultProfile
export const defaultProfile: PersonalNeuroProfile = {
  // ... existing fields
  calendarConnected: false,
};
```

### 6. Integrate in App

Use in `client/app/(tabs)/plan-week.tsx`:

```typescript
import { GoogleCalendarConnect } from '@/components/google-calendar-connect';
import { getAccessToken } from '@/lib/google-auth';
import { apiClient } from '@/lib/api-client';

export default function PlanWeekScreen() {
  const [profile, setProfile] = useState(defaultProfile);

  const handleConnectionChange = async (connected: boolean, token?: string) => {
    setProfile(prev => ({
      ...prev,
      calendarConnected: connected,
      googleAccessToken: token,
    }));
  };

  const handlePlanWeek = async () => {
    const accessToken = await getAccessToken();
    
    const weekPlan = await apiClient.planWeek({
      userProfile: profile,
      weekStartISO: startOfWeek.toISOString(),
      weekEndISO: endOfWeek.toISOString(),
      accessToken: accessToken || undefined,
    });
    
    // Handle response...
  };

  return (
    <View>
      <GoogleCalendarConnect onConnectionChange={handleConnectionChange} />
      
      {profile.calendarConnected ? (
        <Button title="Generate Smart Plan" onPress={handlePlanWeek} />
      ) : (
        <Text>Connect calendar for intelligent scheduling</Text>
      )}
    </View>
  );
}
```

---

## Testing

### 1. Test OAuth Flow
```bash
cd client
npm run ios
```

1. Tap "Connect Google Calendar"
2. Should open Google Sign-In page
3. Select your account
4. Grant calendar permissions
5. Should redirect back to app with success message

### 2. Test Token Persistence
```bash
# Close and reopen app
# Should show "Connected" without re-auth
```

### 3. Test API Integration
```bash
# Check server logs for successful calendar API calls
curl -X POST http://localhost:3001/freebusy \
  -H "Content-Type: application/json" \
  -d '{
    "accessToken": "your_token_here",
    "timeMin": "2024-01-01T00:00:00Z",
    "timeMax": "2024-01-07T23:59:59Z"
  }'
```

---

## Troubleshooting

### "Client ID is invalid"
- Verify bundle identifier in app.json matches Google Cloud Console
- Check you're using the correct Client ID (iOS vs Web)

### "Redirect URI mismatch"
- Ensure scheme in app.json matches: `"scheme": "flowmind"`
- Check redirect URI format: `flowmind://redirect`

### "Access denied" error
- Add your email as test user in OAuth consent screen
- Ensure Calendar API is enabled in Google Cloud Console

### Token refresh fails
- Check that you requested `offline` access
- Verify refresh token is stored
- May need to re-authenticate with `prompt: 'consent'`

---

## Security Notes

1. **Never commit tokens** - They're stored in expo-secure-store
2. **Use PKCE** - Already enabled in code (protects against interception)
3. **Token expiry** - Automatically refreshed 5 min before expiry
4. **Revocation** - User can fully revoke access via `revokeGoogleAccess()`

---

## Next Steps

1. ✅ Set up Google Cloud Console
2. ✅ Install packages
3. ✅ Implement google-auth.ts
4. ✅ Create UI component
5. ✅ Test OAuth flow
6. ⬜ Integrate with schedule intensity algorithm
7. ⬜ Add to onboarding flow
