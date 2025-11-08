/**
 * Google Calendar OAuth - Native Swift Implementation
 * Uses @react-native-google-signin/google-signin
 */

import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import * as SecureStore from 'expo-secure-store';

// Configure Google Sign-In
GoogleSignin.configure({
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
    await GoogleSignin.hasPlayServices();
    
    const signInResult = await GoogleSignin.signIn();
    
    // Get tokens
    const tokens = await GoogleSignin.getTokens();
    
    // Store tokens
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, tokens.accessToken);
    
    // Note: Google Sign-In SDK manages refresh tokens internally
    console.log('✅ Signed in successfully');
    return tokens.accessToken;
  } catch (error: any) {
    if (error.code === statusCodes.SIGN_IN_CANCELLED) {
      console.log('User cancelled sign in');
    } else if (error.code === statusCodes.IN_PROGRESS) {
      console.log('Sign in already in progress');
    } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      console.log('Play services not available (iOS - this is normal)');
      // On iOS, this is expected - try signing in anyway
      try {
        await GoogleSignin.signIn();
        const tokens = await GoogleSignin.getTokens();
        await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, tokens.accessToken);
        console.log('✅ Signed in successfully');
        return tokens.accessToken;
      } catch (retryError) {
        console.error('Sign in retry error:', retryError);
      }
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
    // Check if we have a stored token
    const storedToken = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
    
    if (!storedToken) {
      return null;
    }
    
    // Try to get fresh tokens from SDK (auto-refreshes if needed)
    try {
      const tokens = await GoogleSignin.getTokens();
      
      // Update stored token
      await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, tokens.accessToken);
      
      return tokens.accessToken;
    } catch (error) {
      // If SDK fails, return stored token
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