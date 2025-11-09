/**
 * Google Calendar Connection Hook
 * 
 * Async hook for connecting Google Calendar and managing sync
 * Handles OAuth flow, token refresh, and background sync
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { 
  signInWithGoogle, 
  getAccessToken, 
  isSignedIn,
  signOutGoogle 
} from './google-auth';
import { apiClient } from './api-client';

interface CalendarSyncState {
  isConnected: boolean;
  isSyncing: boolean;
  lastSyncTime: Date | null;
  syncError: string | null;
  changes: {
    added: { id: string; summary: string; }[];
    modified: { id: string; summary: string; }[];
    deleted: { id: string; }[];
  } | null;
  shouldReoptimize: boolean;
}

interface UseGoogleCalendarReturn {
  // Connection state
  isConnected: boolean;
  isConnecting: boolean;
  
  // Sync state
  isSyncing: boolean;
  lastSyncTime: Date | null;
  changes: CalendarSyncState['changes'];
  shouldReoptimize: boolean;
  
  // Actions
  connect: () => Promise<boolean>;
  disconnect: () => Promise<void>;
  sync: () => Promise<void>;
  setupAutoSync: () => Promise<void>;
  stopAutoSync: () => void;
  
  // Error
  error: string | null;
}

/**
 * Hook for Google Calendar connection and sync
 * 
 * Features:
 * - Async OAuth connection
 * - Auto-sync on app foreground
 * - Periodic background sync
 * - Re-optimization detection
 * 
 * @param userId - User's unique identifier
 * @param options - Configuration options
 */
export function useGoogleCalendar(
  userId: string,
  options: {
    autoSync?: boolean;
    syncInterval?: number; // minutes
    onReoptimizeRecommended?: () => void;
  } = {}
): UseGoogleCalendarReturn {
  const {
    autoSync = true,
    syncInterval = 15,
    onReoptimizeRecommended
  } = options;

  const [state, setState] = useState<CalendarSyncState>({
    isConnected: false,
    isSyncing: false,
    lastSyncTime: null,
    syncError: null,
    changes: null,
    shouldReoptimize: false
  });

  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const syncTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const appStateRef = useRef<AppStateStatus>('active');

  /**
   * Check initial connection status
   */
  useEffect(() => {
    checkConnection();
  }, []);

  /**
   * Check if Google Calendar is connected
   */
  const checkConnection = async () => {
    try {
      const connected = await isSignedIn();
      setState(prev => ({ ...prev, isConnected: connected }));
      
      if (connected && autoSync) {
        // Trigger initial sync
        await performSync();
      }
    } catch (err: any) {
      console.error('Check connection error:', err);
    }
  };

  /**
   * Connect to Google Calendar (OAuth flow)
   */
  const connect = useCallback(async (): Promise<boolean> => {
    setIsConnecting(true);
    setError(null);

    try {
      const accessToken = await signInWithGoogle();
      
      if (accessToken) {
        setState(prev => ({ ...prev, isConnected: true }));
        
        // Trigger initial sync
        if (autoSync) {
          await performSync();
        }
        
        return true;
      } else {
        setError('Failed to connect to Google Calendar');
        return false;
      }
    } catch (err: any) {
      console.error('Connect error:', err);
      setError(err.message || 'Connection failed');
      return false;
    } finally {
      setIsConnecting(false);
    }
  }, [autoSync, userId]);

  /**
   * Disconnect from Google Calendar
   */
  const disconnect = useCallback(async () => {
    try {
      await signOutGoogle();
      stopAutoSync();
      setState({
        isConnected: false,
        isSyncing: false,
        lastSyncTime: null,
        syncError: null,
        changes: null,
        shouldReoptimize: false
      });
      setError(null);
    } catch (err: any) {
      console.error('Disconnect error:', err);
      setError(err.message);
    }
  }, []);

  /**
   * Perform calendar sync
   */
  const performSync = async () => {
    if (!userId) return;

    setState(prev => ({ ...prev, isSyncing: true, syncError: null }));

    try {
      const accessToken = await getAccessToken();
      
      if (!accessToken) {
        throw new Error('No access token available');
      }

      // Call sync endpoint
      const result = await apiClient.syncCalendar(userId, accessToken);

      setState(prev => ({
        ...prev,
        isSyncing: false,
        lastSyncTime: new Date(),
        changes: result.changes,
        shouldReoptimize: result.recommendReoptimization
      }));

      // Notify if re-optimization recommended
      if (result.recommendReoptimization && onReoptimizeRecommended) {
        onReoptimizeRecommended();
      }

      console.log('✅ Calendar synced:', result.changes);

    } catch (err: any) {
      console.error('Sync error:', err);
      setState(prev => ({
        ...prev,
        isSyncing: false,
        syncError: err.message
      }));
    }
  };

  /**
   * Manual sync trigger
   */
  const sync = useCallback(async () => {
    await performSync();
  }, [userId]);

  /**
   * Set up auto-sync
   */
  const setupAutoSync = useCallback(async () => {
    if (!autoSync) return;

    // Clear existing timer
    if (syncTimerRef.current) {
      clearInterval(syncTimerRef.current);
    }

    // Set up periodic sync
    syncTimerRef.current = setInterval(() => {
      if (appStateRef.current === 'active') {
        performSync();
      }
    }, syncInterval * 60 * 1000);

    console.log(`✅ Auto-sync enabled (every ${syncInterval} minutes)`);
  }, [autoSync, syncInterval]);

  /**
   * Stop auto-sync
   */
  const stopAutoSync = useCallback(() => {
    if (syncTimerRef.current) {
      clearInterval(syncTimerRef.current);
      syncTimerRef.current = null;
    }
  }, []);

  /**
   * Handle app state changes (foreground/background)
   */
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      const wasInactive = appStateRef.current.match(/inactive|background/);
      const isActive = nextAppState === 'active';

      if (wasInactive && isActive && state.isConnected) {
        // App came to foreground - trigger sync
        console.log('📱 App foregrounded, syncing calendar...');
        performSync();
      }

      appStateRef.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [state.isConnected]);

  /**
   * Set up auto-sync when connected
   */
  useEffect(() => {
    if (state.isConnected && autoSync) {
      setupAutoSync();
    }

    return () => {
      stopAutoSync();
    };
  }, [state.isConnected, autoSync, setupAutoSync, stopAutoSync]);

  return {
    isConnected: state.isConnected,
    isConnecting,
    isSyncing: state.isSyncing,
    lastSyncTime: state.lastSyncTime,
    changes: state.changes,
    shouldReoptimize: state.shouldReoptimize,
    connect,
    disconnect,
    sync,
    setupAutoSync,
    stopAutoSync,
    error: error || state.syncError
  };
}

export default useGoogleCalendar;
