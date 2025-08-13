import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, NativeModules, Alert } from 'react-native';
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';

const { VPNManager } = NativeModules;

const SESSION_STORAGE_KEYS = {
  SESSION_START_TIME: 'vpn_session_start_time',
  SESSION_DURATION: 'vpn_session_duration', 
  SESSION_ACTIVE: 'vpn_session_active',
  LAST_CHECK_TIME: 'vpn_last_check_time',
  TIMER_END_TIMESTAMP: 'vpn_timer_end_timestamp',
};

const BACKGROUND_SESSION_CHECK = 'background-session-check';

export interface SessionData {
  isActive: boolean;
  startTime: number | null;
  duration: number; // in seconds
  endTimestamp: number | null;
  remainingTime: number;
}

class SessionManager {
  private static instance: SessionManager;
  private sessionCheckInterval: ReturnType<typeof setInterval> | null = null;
  private onSessionExpiredCallback: (() => void) | null = null;
  private onSessionUpdatedCallback: ((session: SessionData) => void) | null = null;
  private backgroundTaskRegistered = false;

  private constructor() {
    this.setupAppStateListener();
    this.registerBackgroundTask();
  }

  static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  // Set callbacks for session events
  setOnSessionExpired(callback: () => void) {
    this.onSessionExpiredCallback = callback;
  }

  setOnSessionUpdated(callback: (session: SessionData) => void) {
    this.onSessionUpdatedCallback = callback;
  }

  // Start a new VPN session
  async startSession(durationInSeconds: number): Promise<void> {
    const now = Date.now();
    const endTimestamp = now + (durationInSeconds * 1000);
    
    await AsyncStorage.multiSet([
      [SESSION_STORAGE_KEYS.SESSION_START_TIME, now.toString()],
      [SESSION_STORAGE_KEYS.SESSION_DURATION, durationInSeconds.toString()],
      [SESSION_STORAGE_KEYS.SESSION_ACTIVE, 'true'],
      [SESSION_STORAGE_KEYS.TIMER_END_TIMESTAMP, endTimestamp.toString()],
      [SESSION_STORAGE_KEYS.LAST_CHECK_TIME, now.toString()],
    ]);

    console.log('Session started:', {
      startTime: new Date(now),
      duration: durationInSeconds,
      endTime: new Date(endTimestamp)
    });

    this.startSessionTimer();
    await this.updateBackgroundFetch();
  }

  // Extend current session
  async extendSession(additionalSeconds: number, maxTotalSeconds: number = 43200): Promise<void> {
    const session = await this.getCurrentSession();
    if (!session.isActive) {
      throw new Error('No active session to extend');
    }

    const newDuration = Math.min(session.remainingTime + additionalSeconds, maxTotalSeconds);
    const newEndTimestamp = Date.now() + (newDuration * 1000);

    await AsyncStorage.multiSet([
      [SESSION_STORAGE_KEYS.SESSION_DURATION, newDuration.toString()],
      [SESSION_STORAGE_KEYS.TIMER_END_TIMESTAMP, newEndTimestamp.toString()],
    ]);

    console.log('Session extended:', {
      additionalSeconds,
      newDuration,
      newEndTime: new Date(newEndTimestamp)
    });

    const updatedSession = await this.getCurrentSession();
    this.onSessionUpdatedCallback?.(updatedSession);
  }

  // End the current session
  async endSession(): Promise<void> {
    await AsyncStorage.multiSet([
      [SESSION_STORAGE_KEYS.SESSION_ACTIVE, 'false'],
      [SESSION_STORAGE_KEYS.TIMER_END_TIMESTAMP, ''],
    ]);

    this.stopSessionTimer();
    await this.unregisterBackgroundFetch();
    
    console.log('Session ended');
  }

  // Get current session data
  async getCurrentSession(): Promise<SessionData> {
    try {
      const [
        isActiveStr,
        startTimeStr,
        durationStr,
        endTimestampStr,
      ] = await AsyncStorage.multiGet([
        SESSION_STORAGE_KEYS.SESSION_ACTIVE,
        SESSION_STORAGE_KEYS.SESSION_START_TIME,
        SESSION_STORAGE_KEYS.SESSION_DURATION,
        SESSION_STORAGE_KEYS.TIMER_END_TIMESTAMP,
      ]);

      const isActive = isActiveStr[1] === 'true';
      const startTime = startTimeStr[1] ? parseInt(startTimeStr[1], 10) : null;
      const duration = durationStr[1] ? parseInt(durationStr[1], 10) : 0;
      const endTimestamp = endTimestampStr[1] ? parseInt(endTimestampStr[1], 10) : null;
      
      let remainingTime = 0;
      if (isActive && endTimestamp) {
        const now = Date.now();
        remainingTime = Math.max(0, Math.floor((endTimestamp - now) / 1000));
      }

      return {
        isActive,
        startTime,
        duration,
        endTimestamp,
        remainingTime,
      };
    } catch (error) {
      console.warn('Failed to get current session:', error);
      return {
        isActive: false,
        startTime: null,
        duration: 0,
        endTimestamp: null,
        remainingTime: 0,
      };
    }
  }

  // Check if session has expired and handle accordingly
  async checkSessionExpiry(): Promise<boolean> {
    const session = await this.getCurrentSession();
    
    if (!session.isActive || !session.endTimestamp) {
      return false;
    }

    const now = Date.now();
    const hasExpired = now >= session.endTimestamp;

    if (hasExpired) {
      console.log('Session expired, auto-disconnecting VPN');
      
      // Clear session data
      await this.endSession();
      
      // Check if VPN is still connected and disconnect
      return new Promise((resolve) => {
        VPNManager?.getStatus?.((status: string) => {
          if (status === 'connected') {
            VPNManager?.disconnect?.();
            this.onSessionExpiredCallback?.();
          }
          resolve(true);
        });
      });
    }

    // Update last check time
    await AsyncStorage.setItem(SESSION_STORAGE_KEYS.LAST_CHECK_TIME, now.toString());
    
    // Notify about session update
    this.onSessionUpdatedCallback?.(session);
    
    return false;
  }

  // Start the session timer for foreground checks
  private startSessionTimer() {
    if (this.sessionCheckInterval) {
      clearInterval(this.sessionCheckInterval);
    }

    this.sessionCheckInterval = setInterval(async () => {
      if (AppState.currentState === 'active') {
        await this.checkSessionExpiry();
      }
    }, 1000); // Check every second when in foreground
  }

  // Stop the session timer
  private stopSessionTimer() {
    if (this.sessionCheckInterval) {
      clearInterval(this.sessionCheckInterval);
      this.sessionCheckInterval = null;
    }
  }

  // Handle app state changes
  private setupAppStateListener() {
    AppState.addEventListener('change', async (nextAppState) => {
      console.log('SessionManager: App state changed to:', nextAppState);
      
      if (nextAppState === 'active') {
        // App came to foreground - check for expired sessions
        const expired = await this.checkSessionExpiry();
        if (expired && AppState.currentState === 'active') {
          // Show alert if session expired while backgrounded
          setTimeout(() => {
            Alert.alert(
              'Session Expired', 
              'Your VPN session expired while the app was in the background.'
            );
          }, 500);
        }
        
        // Restart foreground timer
        const session = await this.getCurrentSession();
        if (session.isActive) {
          this.startSessionTimer();
        }
      } else if (nextAppState === 'background' || nextAppState === 'inactive') {
        // App going to background - save current state and stop foreground timer
        this.stopSessionTimer();
        await AsyncStorage.setItem(SESSION_STORAGE_KEYS.LAST_CHECK_TIME, Date.now().toString());
      }
    });
  }

  // Register background fetch for session monitoring
  private async registerBackgroundTask() {
    if (this.backgroundTaskRegistered) {
      return;
    }

    try {
      // Define background task
      TaskManager.defineTask(BACKGROUND_SESSION_CHECK, async () => {
        console.log('Background task: Checking session expiry');
        
        try {
          const expired = await this.checkSessionExpiry();
          
          if (expired) {
            console.log('Background task: Session expired, VPN disconnected');
            return BackgroundFetch.BackgroundFetchResult.NewData;
          }
          
          return BackgroundFetch.BackgroundFetchResult.NoData;
        } catch (error) {
          console.warn('Background task error:', error);
          return BackgroundFetch.BackgroundFetchResult.Failed;
        }
      });

      this.backgroundTaskRegistered = true;
      console.log('Background task registered successfully');
    } catch (error) {
      console.warn('Failed to register background task:', error);
    }
  }

  // Update background fetch based on session state
  private async updateBackgroundFetch() {
    try {
      const session = await this.getCurrentSession();
      
      if (session.isActive) {
        // Check if already registered to avoid duplicates
        const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_SESSION_CHECK);
        if (isRegistered) {
          console.log('Background fetch already registered, skipping');
          return;
        }

        // Register background fetch for active sessions
        const status = await BackgroundFetch.getStatusAsync();
        if (status !== BackgroundFetch.BackgroundFetchStatus.Available) {
          console.warn('Background fetch not available');
          return;
        }

        await BackgroundFetch.registerTaskAsync(BACKGROUND_SESSION_CHECK, {
          minimumInterval: 60, // Check every minute in background
          stopOnTerminate: false,
          startOnBoot: false,
        });
        
        console.log('Background fetch registered for session monitoring');
      }
    } catch (error) {
      console.warn('Failed to update background fetch:', error);
    }
  }

  // Unregister background fetch
  private async unregisterBackgroundFetch() {
    try {
      // Check if task is registered before attempting to unregister
      const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_SESSION_CHECK);
      if (isRegistered) {
        await BackgroundFetch.unregisterTaskAsync(BACKGROUND_SESSION_CHECK);
        console.log('Background fetch unregistered');
      } else {
        console.log('Background fetch task not registered, skipping unregister');
      }
    } catch (error) {
      console.warn('Failed to unregister background fetch:', error);
    }
  }

  // Initialize session manager (call on app start)
  async initialize(): Promise<void> {
    console.log('SessionManager: Initializing...');
    
    // Check for any existing active session
    const session = await this.getCurrentSession();
    
    if (session.isActive) {
      console.log('SessionManager: Found active session, checking expiry...');
      const expired = await this.checkSessionExpiry();
      
      if (!expired && session.remainingTime > 0) {
        // Resume session monitoring
        this.startSessionTimer();
        await this.updateBackgroundFetch();
        console.log('SessionManager: Resumed session monitoring');
      }
    }
    
    console.log('SessionManager: Initialized');
  }

  // Clean up resources
  destroy() {
    this.stopSessionTimer();
    this.unregisterBackgroundFetch();
    this.onSessionExpiredCallback = null;
    this.onSessionUpdatedCallback = null;
  }
}

export default SessionManager.getInstance();