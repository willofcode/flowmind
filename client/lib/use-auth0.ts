/**
 * Auth0 Authentication Hook
 * Handles login, logout, and token management
 * Neurodivergent-friendly with clear error messages
 */

import { useState, useEffect, useCallback } from 'react';
import Auth0 from 'react-native-auth0';
import * as SecureStore from 'expo-secure-store';
import { auth0Config, validateAuth0Config } from './auth0-config';

// Initialize Auth0 client
let auth0: Auth0 | null = null;

const initAuth0 = () => {
  if (!auth0) {
    validateAuth0Config();
    auth0 = new Auth0({
      domain: auth0Config.domain,
      clientId: auth0Config.clientId,
    });
  }
  return auth0;
};

export interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
  email_verified: boolean;
}

export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  error: string | null;
}

export const useAuth0 = () => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    user: null,
    error: null,
  });

  // Check if user is already authenticated
  useEffect(() => {
    checkAuthState();
  }, []);

  const checkAuthState = async () => {
    try {
      const accessToken = await SecureStore.getItemAsync('auth0_access_token');
      const userJson = await SecureStore.getItemAsync('auth0_user');

      if (accessToken && userJson) {
        const user = JSON.parse(userJson);
        setAuthState({
          isAuthenticated: true,
          isLoading: false,
          user,
          error: null,
        });
      } else {
        setAuthState({
          isAuthenticated: false,
          isLoading: false,
          user: null,
          error: null,
        });
      }
    } catch (error) {
      console.error('Error checking auth state:', error);
      setAuthState({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        error: 'Failed to check authentication status',
      });
    }
  };

  // Login with Auth0
  const login = useCallback(async () => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true, error: null }));

      const client = initAuth0();
      
      // // Debug: Log the redirect URI being used
      // console.log('🔐 Auth0 Login Config:');
      // console.log('Domain:', auth0Config.domain);
      // console.log('Client ID:', auth0Config.clientId);
      // console.log('Redirect URI:', auth0Config.redirectUri);
      // console.log('Logout URI:', auth0Config.logoutUri);
      
      const credentials = await client.webAuth.authorize({
        scope: auth0Config.scope,
      });

      // Store tokens securely
      await SecureStore.setItemAsync('auth0_access_token', credentials.accessToken);
      if (credentials.refreshToken) {
        await SecureStore.setItemAsync('auth0_refresh_token', credentials.refreshToken);
      }
      if (credentials.idToken) {
        await SecureStore.setItemAsync('auth0_id_token', credentials.idToken);
      }

      // Get user info
      const userInfo = await client.auth.userInfo({ token: credentials.accessToken });
      
      const user: User = {
        id: userInfo.sub,
        email: userInfo.email || '',
        name: userInfo.name || userInfo.email || 'User',
        picture: userInfo.picture,
        email_verified: userInfo.email_verified || false,
      };

      // Store user data
      await SecureStore.setItemAsync('auth0_user', JSON.stringify(user));

      setAuthState({
        isAuthenticated: true,
        isLoading: false,
        user,
        error: null,
      });

      return { success: true, user };
    } catch (error: any) {
      console.error('Error code:', error.error);
      console.error('Error message:', error.message);
      console.error('Full error:', JSON.stringify(error, null, 2));
      
      // User cancelled the login
      if (error.error === 'a0.session.user_cancelled') {
        setAuthState(prev => ({ ...prev, isLoading: false, error: null }));
        return { success: false, cancelled: true };
      }

      const errorMessage = error.message || 'Failed to sign in. Please try again.';
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));

      return { success: false, error: errorMessage };
    }
  }, []);

  // Logout
  const logout = useCallback(async () => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true, error: null }));

      const client = initAuth0();
      await client.webAuth.clearSession();

      // Clear stored tokens
      await SecureStore.deleteItemAsync('auth0_access_token');
      await SecureStore.deleteItemAsync('auth0_refresh_token');
      await SecureStore.deleteItemAsync('auth0_id_token');
      await SecureStore.deleteItemAsync('auth0_user');
      
      // Clear profile data
      await SecureStore.deleteItemAsync('profile_completed');
      await SecureStore.deleteItemAsync('user_name');

      setAuthState({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        error: null,
      });

      return { success: true };
    } catch (error: any) {
      console.error('Logout error:', error);
      const errorMessage = error.message || 'Failed to sign out. Please try again.';
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));

      return { success: false, error: errorMessage };
    }
  }, []);

  // Refresh token
  const refreshToken = useCallback(async () => {
    try {
      const refreshTokenValue = await SecureStore.getItemAsync('auth0_refresh_token');
      
      if (!refreshTokenValue) {
        throw new Error('No refresh token available');
      }

      const client = initAuth0();
      const credentials = await client.auth.refreshToken({ refreshToken: refreshTokenValue });

      // Update stored tokens
      await SecureStore.setItemAsync('auth0_access_token', credentials.accessToken);
      if (credentials.refreshToken) {
        await SecureStore.setItemAsync('auth0_refresh_token', credentials.refreshToken);
      }

      return { success: true };
    } catch (error: any) {
      console.error('Token refresh error:', error);
      // If refresh fails, user needs to re-authenticate
      await logout();
      return { success: false, error: 'Session expired. Please sign in again.' };
    }
  }, [logout]);

  return {
    ...authState,
    login,
    logout,
    refreshToken,
    checkAuthState,
  };
};
