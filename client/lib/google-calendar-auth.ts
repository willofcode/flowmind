/**
 * Google Calendar Integration - Complete Implementation
 * 
 * This replaces Auth0 for calendar access with pure Google OAuth
 * Uses @react-native-google-signin/google-signin for native iOS integration
 */

import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Storage keys
const STORAGE_KEYS = {
  ACCESS_TOKEN: 'google_calendar_access_token',
  REFRESH_TOKEN: 'google_calendar_refresh_token',
  USER_INFO: 'google_calendar_user_info',
  TOKEN_EXPIRY: 'google_calendar_token_expiry',
};

// Configure Google Sign-In - Call this once at app startup
export function configureGoogleSignIn() {
  console.log('🔧 Configuring Google Sign-In...');
  
  // Get credentials from environment with hardcoded fallbacks
  // Note: EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID must be a DIFFERENT Web OAuth client
  // NOT the same as the iOS client ID!
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  
  if (!iosClientId) {
    console.error('❌ ERROR: iOS Client ID not configured!');
    console.error('❌ Please set EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID in client/.env');
    throw new Error('Missing iOS Client ID - Google Sign-In cannot be configured');
  }
  
  console.log('📱 iOS Client ID:', iosClientId.substring(0, 20) + '...');
  console.log('🌐 Web Client ID:', webClientId ? webClientId.substring(0, 20) + '...' : 'NOT SET');
  
  // Validate that Web Client ID is different from iOS Client ID
  if (webClientId && webClientId === iosClientId) {
    console.error('❌ ERROR: Web Client ID cannot be the same as iOS Client ID!');
    console.error('❌ Please create a separate "Web application" OAuth client in Google Cloud Console');
    console.error('❌ Disabling offline access to prevent errors...');
    // Force disable by clearing webClientId
    const config: any = {
      iosClientId,
      scopes: [
        'https://www.googleapis.com/auth/calendar.readonly',
        'https://www.googleapis.com/auth/calendar.events',
        'profile',
        'email',
      ],
    };
    GoogleSignin.configure(config);
    console.log('✅ Google Sign-In configured (without offline access)');
    attemptSilentSignIn();
    return;
  }
  
  const config: any = {
    iosClientId,
    scopes: [
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/calendar.events',
      'profile',
      'email',
    ],
  };
  
  // Only enable offline access if Web Client ID is configured and valid
  if (webClientId) {
    config.webClientId = webClientId;
    config.offlineAccess = true;
    config.forceCodeForRefreshToken = true;
    console.log('✅ Web Client ID configured - offline access enabled');
  } else {
    console.warn('⚠️  No Web Client ID found - offline access disabled');
    console.warn('⚠️  To enable refresh tokens, create a Web OAuth client in Google Cloud Console');
    console.warn('⚠️  Then set EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID in server/.env');
  }
  
  GoogleSignin.configure(config);
  console.log('✅ Google Sign-In configured');
  
  // Attempt silent sign-in automatically
  attemptSilentSignIn();
}

/**
 * Attempt silent sign-in on app startup (internal)
 */
async function attemptSilentSignIn() {
  try {
    console.log('🔄 Checking for previous sign-in...');
    const result = await signInSilently();
    if (result.success) {
      console.log('✅ Auto-signed in:', result.user?.email);
    } else {
      console.log('ℹ️  No previous sign-in found');
    }
  } catch (error) {
    console.log('ℹ️  Silent sign-in not available (first time user)');
  }
}

/**
 * Sign in with Google Calendar
 */
export async function signInWithGoogleCalendar(): Promise<{
  success: boolean;
  accessToken?: string;
  user?: any;
  error?: string;
}> {
  try {
    console.log('🔐 Starting Google Calendar sign-in...');

    // Check if Play Services are available (will work on iOS)
    try {
      await GoogleSignin.hasPlayServices();
    } catch (playServicesError) {
      console.log('⚠️ Play Services check (expected on iOS):', playServicesError);
    }

    // Sign in
    const signInResult = await GoogleSignin.signIn();
    console.log('✅ Sign-in successful:', signInResult.data?.user.email);

    // Get tokens
    const tokens = await GoogleSignin.getTokens();
    console.log('🎟️ Got access token');

    // Store tokens securely
    await SecureStore.setItemAsync(STORAGE_KEYS.ACCESS_TOKEN, tokens.accessToken);
    await SecureStore.setItemAsync(STORAGE_KEYS.USER_INFO, JSON.stringify(signInResult.data?.user));
    
    // Store user email for sync polling
    if (signInResult.data?.user.email) {
      await SecureStore.setItemAsync('google_calendar_user_email', signInResult.data.user.email);
    }
    
    // Calculate expiry (tokens typically last 1 hour)
    const expiryTime = Date.now() + (3600 * 1000); // 1 hour from now
    await SecureStore.setItemAsync(STORAGE_KEYS.TOKEN_EXPIRY, expiryTime.toString());
    
    // Set connected flag so app knows calendar is ready
    await SecureStore.setItemAsync('google_calendar_connected', 'true');

    console.log('💾 Tokens stored securely');
    console.log('✅ Google Calendar marked as connected');

    return {
      success: true,
      accessToken: tokens.accessToken,
      user: signInResult.data?.user,
    };
  } catch (error: any) {
    console.error('❌ Sign-in error:', error);

    let errorMessage = 'Failed to sign in with Google';

    if (error.code === statusCodes.SIGN_IN_CANCELLED) {
      errorMessage = 'Sign-in was cancelled';
      console.log('👤 User cancelled sign-in');
    } else if (error.code === statusCodes.IN_PROGRESS) {
      errorMessage = 'Sign-in already in progress';
      console.log('⏳ Sign-in already in progress');
    } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      // This is normal on iOS
      console.log('ℹ️ Play Services not available (iOS - expected)');
      // Try to continue anyway
      errorMessage = 'Please try again';
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Get current access token (with auto-refresh)
 */
export async function getCalendarAccessToken(): Promise<string | null> {
  try {
    // First, check if user is actually signed in
    const isSignedIn = await isSignedInToGoogleCalendar();
    if (!isSignedIn) {
      console.log('⚠️  User not signed in - cannot get token');
      return null;
    }

    // Check if token exists
    const storedToken = await SecureStore.getItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
    if (!storedToken) {
      console.log('❌ No stored token found');
      return null;
    }

    // Check if token is expired
    const expiryStr = await SecureStore.getItemAsync(STORAGE_KEYS.TOKEN_EXPIRY);
    if (expiryStr) {
      const expiryTime = parseInt(expiryStr, 10);
      const now = Date.now();

      if (now < expiryTime) {
        console.log('✅ Token still valid');
        return storedToken;
      } else {
        console.log('⏰ Token expired, refreshing...');
      }
    }

    // Token expired or no expiry info - try to refresh
    // But only if user is currently signed in to Google
    try {
      const currentUser = await GoogleSignin.getCurrentUser();
      if (!currentUser) {
        console.log('⚠️  No current user session - using stored token');
        return storedToken;
      }

      const tokens = await GoogleSignin.getTokens();
      console.log('🔄 Token refreshed');

      // Store new token
      await SecureStore.setItemAsync(STORAGE_KEYS.ACCESS_TOKEN, tokens.accessToken);
      const newExpiry = Date.now() + (3600 * 1000);
      await SecureStore.setItemAsync(STORAGE_KEYS.TOKEN_EXPIRY, newExpiry.toString());

      return tokens.accessToken;
    } catch (refreshError: any) {
      console.error('❌ Token refresh failed:', refreshError.message || refreshError);
      // Return stored token as fallback
      console.log('ℹ️  Using stored token as fallback');
      return storedToken;
    }
  } catch (error: any) {
    console.error('❌ Get token error:', error.message || error);
    return null;
  }
}

/**
 * Check if user is signed in
 */
export async function isSignedInToGoogleCalendar(): Promise<boolean> {
  try {
    // Check if we have stored token and user info
    const hasToken = await SecureStore.getItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
    const hasUserInfo = await SecureStore.getItemAsync(STORAGE_KEYS.USER_INFO);
    
    const result = hasToken !== null && hasUserInfo !== null;
    
    if (result) {
      console.log('✅ Sign-in status: CONNECTED (stored credentials found)');
    } else {
      console.log('❌ Sign-in status: NOT CONNECTED (no stored credentials)');
    }
    
    return result;
  } catch (error) {
    console.error('❌ Check sign-in error:', error);
    return false;
  }
}

/**
 * Get current user info
 */
export async function getCurrentCalendarUser(): Promise<any | null> {
  try {
    const userInfoStr = await SecureStore.getItemAsync(STORAGE_KEYS.USER_INFO);
    if (userInfoStr) {
      return JSON.parse(userInfoStr);
    }

    // Try to get fresh user info
    const currentUser = await GoogleSignin.getCurrentUser();
    if (currentUser) {
      await SecureStore.setItemAsync(STORAGE_KEYS.USER_INFO, JSON.stringify(currentUser.user));
      return currentUser.user;
    }

    return null;
  } catch (error) {
    console.error('❌ Get user error:', error);
    return null;
  }
}

/**
 * Sign out from Google Calendar
 */
export async function signOutFromGoogleCalendar(): Promise<void> {
  try {
    console.log('👋 Signing out...');
    
    await GoogleSignin.signOut();
    
    // Clear stored tokens
    await SecureStore.deleteItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
    await SecureStore.deleteItemAsync(STORAGE_KEYS.REFRESH_TOKEN);
    await SecureStore.deleteItemAsync(STORAGE_KEYS.USER_INFO);
    await SecureStore.deleteItemAsync(STORAGE_KEYS.TOKEN_EXPIRY);
    
    // Clear connected flag
    await SecureStore.deleteItemAsync('google_calendar_connected');
    
    console.log('✅ Signed out successfully');
  } catch (error) {
    console.error('❌ Sign out error:', error);
    throw error;
  }
}

/**
 * Revoke access completely
 */
export async function revokeCalendarAccess(): Promise<void> {
  try {
    console.log('🚫 Revoking access...');
    await GoogleSignin.revokeAccess();
    await signOutFromGoogleCalendar();
    console.log('✅ Access revoked');
  } catch (error) {
    console.error('❌ Revoke error:', error);
    throw error;
  }
}

/**
 * Silent sign-in (if previously signed in)
 */
export async function signInSilently(): Promise<{
  success: boolean;
  accessToken?: string;
  user?: any;
  error?: string;
}> {
  try {
    console.log('🤫 Attempting silent sign-in...');
    
    // First check if user was previously signed in
    const currentUser = await GoogleSignin.getCurrentUser();
    if (!currentUser) {
      console.log('ℹ️  No previous sign-in found');
      return {
        success: false,
        error: 'No previous sign-in',
      };
    }

    console.log('👤 Found previous user:', currentUser.user.email);
    
    // Try to sign in silently
    const signInResult = await GoogleSignin.signInSilently();
    
    // Get fresh tokens
    const tokens = await GoogleSignin.getTokens();
    
    // Store tokens
    await SecureStore.setItemAsync(STORAGE_KEYS.ACCESS_TOKEN, tokens.accessToken);
    await SecureStore.setItemAsync(STORAGE_KEYS.USER_INFO, JSON.stringify(signInResult.data?.user || currentUser.user));
    
    const expiryTime = Date.now() + (3600 * 1000);
    await SecureStore.setItemAsync(STORAGE_KEYS.TOKEN_EXPIRY, expiryTime.toString());
    
    // Set connected flag
    await SecureStore.setItemAsync('google_calendar_connected', 'true');
    
    console.log('✅ Silent sign-in successful');
    
    return {
      success: true,
      accessToken: tokens.accessToken,
      user: signInResult.data?.user || currentUser.user,
    };
  } catch (error: any) {
    console.log('⚠️  Silent sign-in failed:', error.message || 'No previous session');
    return {
      success: false,
      error: 'Silent sign-in failed',
    };
  }
}

// Export all functions
export default {
  configure: configureGoogleSignIn,
  signIn: signInWithGoogleCalendar,
  signInSilently,
  getAccessToken: getCalendarAccessToken,
  isSignedIn: isSignedInToGoogleCalendar,
  getCurrentUser: getCurrentCalendarUser,
  signOut: signOutFromGoogleCalendar,
  revokeAccess: revokeCalendarAccess,
};
