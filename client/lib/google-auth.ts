/**
 * Google Calendar OAuth - Native Swift Implementation
 * Uses @react-native-google-signin/google-signin
 */

import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import * as SecureStore from 'expo-secure-store';

// Configure Google Sign-In
GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID, // Required for offline access
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  scopes: [
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/calendar.events',
  ],
  offlineAccess: true, // Get refresh token
  forceCodeForRefreshToken: true,
});

const ACCESS_TOKEN_KEY = 'google_access_token';
const REFRESH_TOKEN_KEY = 'google_refresh_token';

/**
 * Sign in with Google (native UI)
 */
export async function signInWithGoogle(): Promise<string | null> {
  try {
    // Check for Play Services (iOS will throw PLAY_SERVICES_NOT_AVAILABLE, which is expected)
    try {
      await GoogleSignin.hasPlayServices();
    } catch (playServicesError: any) {
      if (playServicesError.code !== statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        throw playServicesError;
      }
      // On iOS, PLAY_SERVICES_NOT_AVAILABLE is normal, continue
      console.log('Running on iOS (no Play Services needed)');
    }
    
    // Sign in with Google
    const userInfo = await GoogleSignin.signIn();
    
    // Check if sign-in was successful
    if (!userInfo) {
      console.log('Sign in returned no user info');
      return null;
    }
    
    // Get tokens after successful sign-in
    const tokens = await GoogleSignin.getTokens();
    
    // Store access token
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, tokens.accessToken);
    
    console.log('✅ Signed in successfully');
    return tokens.accessToken;
  } catch (error: any) {
    if (error.code === statusCodes.SIGN_IN_CANCELLED) {
      console.log('User cancelled sign in');
    } else if (error.code === statusCodes.IN_PROGRESS) {
      console.log('Sign in already in progress');
    } else if (error.code === 'getTokens') {
      console.error('Failed to get tokens - user may not be signed in');
    } else {
      console.error('Sign in error:', error);
    }
    return null;
  }
}

/**
 * Get current access token (auto-refresh if needed)
 */
export async function getAccessToken(): Promise<string | null> {
  try {
    // Check if we have a stored token first
    const storedToken = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
    
    if (!storedToken) {
      return null;
    }
    
    // Try to get fresh tokens from SDK (auto-refreshes if needed)
    // Only if user is actually signed in with Google SDK
    try {
      const tokens = await GoogleSignin.getTokens();
      
      // Update stored token
      await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, tokens.accessToken);
      
      return tokens.accessToken;
    } catch (sdkError: any) {
      // If getTokens fails (user not signed in with SDK), return stored token
      console.log('Using stored token (SDK not available)');
      return storedToken;
    }
  } catch (error) {
    console.error('Get token error:', error);
    return null;
  }
}

/**
 * Check if signed in
 */
export async function isSignedIn(): Promise<boolean> {
  const token = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  return token !== null;
}

/**
 * Sign out
 */
export async function signOutGoogle(): Promise<void> {
  try {
    await GoogleSignin.signOut();
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    console.log('✅ Signed out');
  } catch (error) {
    console.error('Sign out error:', error);
  }
}

/**
 * Revoke access completely
 */
export async function revokeGoogleAccess(): Promise<void> {
  try {
    await GoogleSignin.revokeAccess();
    await signOutGoogle();
  } catch (error) {
    console.error('Revoke error:', error);
  }
}

/**
 * Get user info
 */
export async function getCurrentUser() {
  try {
    const userInfo = await GoogleSignin.signInSilently();
    return userInfo;
  } catch (error) {
    return null;
  }
}

/**
 * Backward compatibility - alias for signOutGoogle
 */
export async function signOut(): Promise<void> {
  return signOutGoogle();
}

/**
 * Backward compatibility - alias for getAccessToken
 */
export async function getStoredAccessToken(): Promise<string | null> {
  return getAccessToken();
}