import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, NativeModules, Alert } from 'react-native';
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { logger } from '../utils/logger';

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
    
    logger.session.info('Starting VPN session', {
      durationSeconds: durationInSeconds,
      startTime: now,
      endTime: endTimestamp
    });
    
    try {
      await AsyncStorage.multiSet([
        [SESSION_STORAGE_KEYS.SESSION_START_TIME, now.toString()],
        [SESSION_STORAGE_KEYS.SESSION_DURATION, durationInSeconds.toString()],
        [SESSION_STORAGE_KEYS.SESSION_ACTIVE, 'true'],
        [SESSION_STORAGE_KEYS.TIMER_END_TIMESTAMP, endTimestamp.toString()],
        [SESSION_STORAGE_KEYS.LAST_CHECK_TIME, now.toString()],
      ]);
      
      logger.session.debug('Session data stored to AsyncStorage');
    } catch (error) {
      logger.session.error('Failed to store session data', undefined, error as Error);
      throw error;
    }

    this.startSessionTimer();
    await this.updateBackgroundFetch();
    
    logger.session.info('VPN session started successfully', {
      startTime: new Date(now).toISOString(),
      duration: durationInSeconds,
      endTime: new Date(endTimestamp).toISOString()
    });
  }

  // Extend current session
  async extendSession(additionalSeconds: number, maxTotalSeconds: number = 43200): Promise<void> {
    logger.session.info('Extending session', { additionalSeconds, maxTotalSeconds });
    
    const session = await this.getCurrentSession();
    if (!session.isActive) {
      const error = new Error('No active session to extend');
      logger.session.error('Cannot extend session - no active session', { session }, error);
      throw error;
    }

    const newDuration = Math.min(session.remainingTime + additionalSeconds, maxTotalSeconds);
    const newEndTimestamp = Date.now() + (newDuration * 1000);

    logger.session.debug('Calculated new session duration', {
      currentRemainingTime: session.remainingTime,
      additionalSeconds,
      newDuration,
      newEndTimestamp
    });

    try {
      await AsyncStorage.multiSet([
        [SESSION_STORAGE_KEYS.SESSION_DURATION, newDuration.toString()],
        [SESSION_STORAGE_KEYS.TIMER_END_TIMESTAMP, newEndTimestamp.toString()],
      ]);
      
      logger.session.info('Session extended successfully', {
        additionalSeconds,
        newDuration,
        newEndTime: new Date(newEndTimestamp).toISOString()
      });
    } catch (error) {
      logger.session.error('Failed to extend session', undefined, error as Error);
      throw error;
    }

    const updatedSession = await this.getCurrentSession();
    this.onSessionUpdatedCallback?.(updatedSession);
  }

  // End the current session
  async endSession(): Promise<void> {
    logger.session.info('Ending session...');
    
    try {
      await AsyncStorage.multiSet([
        [SESSION_STORAGE_KEYS.SESSION_ACTIVE, 'false'],
        [SESSION_STORAGE_KEYS.TIMER_END_TIMESTAMP, ''],
      ]);
      
      logger.session.debug('Session data cleared from AsyncStorage');
    } catch (error) {
      logger.session.error('Failed to clear session data', undefined, error as Error);
      throw error;
    }

    this.stopSessionTimer();
    await this.unregisterBackgroundFetch();
    
    logger.session.info('Session ended successfully');
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

      const sessionData = {
        isActive,
        startTime,
        duration,
        endTimestamp,
        remainingTime,
      };
      
      logger.session.debug('Retrieved current session data', sessionData);
      return sessionData;
    } catch (error) {
      logger.session.error('Failed to get current session', undefined, error as Error);
      const fallbackSession = {
        isActive: false,
        startTime: null,
        duration: 0,
        endTimestamp: null,
        remainingTime: 0,
      };
      logger.session.debug('Returning fallback session data', fallbackSession);
      return fallbackSession;
    }
  }

  // Check if session has expired and handle accordingly
  async checkSessionExpiry(): Promise<boolean> {
    const session = await this.getCurrentSession();
    
    logger.session.debug('Checking session expiry', {
      isActive: session.isActive,
      endTimestamp: session.endTimestamp,
      remainingTime: session.remainingTime
    });
    
    if (!session.isActive || !session.endTimestamp) {
      logger.session.debug('No active session or end timestamp, no expiry check needed');
      return false;
    }

    const now = Date.now();
    const hasExpired = now >= session.endTimestamp;

    if (hasExpired) {
      logger.session.warn('Session expired, auto-disconnecting VPN', {
        endTimestamp: session.endTimestamp,
        currentTime: now,
        expiredBy: now - session.endTimestamp
      });
      
      // Clear session data
      await this.endSession();
      
      // Check if VPN is still connected and disconnect
      return new Promise((resolve) => {
        VPNManager?.getStatus?.((status: string) => {
          logger.session.info('VPN status check after expiry', { status });
          if (status === 'connected') {
            logger.session.info('Disconnecting VPN due to session expiry');
            VPNManager?.disconnect?.();
            this.onSessionExpiredCallback?.();
          }
          resolve(true);
        });
      });
    }

    // Update last check time
    try {
      await AsyncStorage.setItem(SESSION_STORAGE_KEYS.LAST_CHECK_TIME, now.toString());
      logger.session.debug('Updated last check time', { time: now });
    } catch (error) {
      logger.session.error('Failed to update last check time', undefined, error as Error);
    }
    
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
      logger.session.info('App state changed', { nextAppState });
      
      if (nextAppState === 'active') {
        logger.session.debug('App came to foreground, checking for expired sessions');
        // App came to foreground - check for expired sessions
        const expired = await this.checkSessionExpiry();
        if (expired && AppState.currentState === 'active') {
          logger.session.warn('Session expired while app was backgrounded');
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
          logger.session.debug('Restarting session timer for active session');
          this.startSessionTimer();
        }
      } else if (nextAppState === 'background' || nextAppState === 'inactive') {
        logger.session.debug('App going to background, stopping session timer');
        // App going to background - save current state and stop foreground timer
        this.stopSessionTimer();
        try {
          await AsyncStorage.setItem(SESSION_STORAGE_KEYS.LAST_CHECK_TIME, Date.now().toString());
        } catch (error) {
          logger.session.error('Failed to save last check time on background', undefined, error as Error);
        }
      }
    });
  }

  // Register background fetch for session monitoring
  private async registerBackgroundTask() {
    if (this.backgroundTaskRegistered) {
      logger.session.debug('Background task already registered');
      return;
    }

    try {
      logger.session.info('Registering background task for session monitoring');
      // Define background task
      TaskManager.defineTask(BACKGROUND_SESSION_CHECK, async () => {
        logger.session.debug('Background task executing: Checking session expiry');
        
        try {
          const expired = await this.checkSessionExpiry();
          
          if (expired) {
            logger.session.info('Background task: Session expired, VPN disconnected');
            return BackgroundFetch.BackgroundFetchResult.NewData;
          }
          
          logger.session.debug('Background task: No session expiry');
          return BackgroundFetch.BackgroundFetchResult.NoData;
        } catch (error) {
          logger.session.error('Background task error', undefined, error as Error);
          return BackgroundFetch.BackgroundFetchResult.Failed;
        }
      });

      this.backgroundTaskRegistered = true;
      logger.session.info('Background task registered successfully');
    } catch (error) {
      logger.session.error('Failed to register background task', undefined, error as Error);
    }
  }

  // Update background fetch based on session state
  private async updateBackgroundFetch() {
    try {
      const session = await this.getCurrentSession();
      
      logger.session.debug('Updating background fetch', { sessionActive: session.isActive });
      
      if (session.isActive) {
        // Check if already registered to avoid duplicates
        const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_SESSION_CHECK);
        if (isRegistered) {
          logger.session.debug('Background fetch already registered, skipping');
          return;
        }

        // Register background fetch for active sessions
        const status = await BackgroundFetch.getStatusAsync();
        if (status !== BackgroundFetch.BackgroundFetchStatus.Available) {
          logger.session.warn('Background fetch not available', { status });
          return;
        }

        await BackgroundFetch.registerTaskAsync(BACKGROUND_SESSION_CHECK, {
          minimumInterval: 60, // Check every minute in background
          stopOnTerminate: false,
          startOnBoot: false,
        });
        
        logger.session.info('Background fetch registered for session monitoring');
      }
    } catch (error) {
      logger.session.error('Failed to update background fetch', undefined, error as Error);
    }
  }

  // Unregister background fetch
  private async unregisterBackgroundFetch() {
    try {
      // Check if task is registered before attempting to unregister
      const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_SESSION_CHECK);
      if (isRegistered) {
        await BackgroundFetch.unregisterTaskAsync(BACKGROUND_SESSION_CHECK);
        logger.session.info('Background fetch unregistered');
      } else {
        logger.session.debug('Background fetch task not registered, skipping unregister');
      }
    } catch (error) {
      logger.session.error('Failed to unregister background fetch', undefined, error as Error);
    }
  }

  // Initialize session manager (call on app start)
  async initialize(): Promise<void> {
    logger.session.info('Initializing SessionManager...');
    
    // Check for any existing active session
    const session = await this.getCurrentSession();
    
    if (session.isActive) {
      logger.session.info('Found active session, checking expiry...', {
        remainingTime: session.remainingTime,
        endTimestamp: session.endTimestamp
      });
      const expired = await this.checkSessionExpiry();
      
      if (!expired && session.remainingTime > 0) {
        // Resume session monitoring
        this.startSessionTimer();
        await this.updateBackgroundFetch();
        logger.session.info('Resumed session monitoring', { remainingTime: session.remainingTime });
      }
    } else {
      logger.session.debug('No active session found');
    }
    
    logger.session.info('SessionManager initialized');
  }

  // Clean up resources
  destroy() {
    logger.session.info('Destroying SessionManager...');
    this.stopSessionTimer();
    this.unregisterBackgroundFetch();
    this.onSessionExpiredCallback = null;
    this.onSessionUpdatedCallback = null;
    logger.session.info('SessionManager destroyed');
  }
}

export default SessionManager.getInstance();