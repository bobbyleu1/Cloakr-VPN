import SessionManager from '../SessionManager';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  multiSet: jest.fn(),
  multiGet: jest.fn(),
  removeItem: jest.fn(),
}));

// Mock expo modules
jest.mock('expo-background-fetch', () => ({
  BackgroundFetchResult: {
    NewData: 'newData',
    NoData: 'noData',
    Failed: 'failed',
  },
  BackgroundFetchStatus: {
    Available: 'available',
  },
  getStatusAsync: jest.fn().mockResolvedValue('available'),
  registerTaskAsync: jest.fn(),
  unregisterTaskAsync: jest.fn(),
}));

jest.mock('expo-task-manager', () => ({
  defineTask: jest.fn(),
}));

// Mock React Native modules
jest.mock('react-native', () => ({
  AppState: {
    addEventListener: jest.fn(),
    currentState: 'active',
  },
  NativeModules: {
    VPNManager: {
      getStatus: jest.fn(),
      disconnect: jest.fn(),
    },
  },
  Alert: {
    alert: jest.fn(),
  },
}));

describe('SessionManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset singleton instance
    (SessionManager as any).instance = undefined;
  });

  it('should create a singleton instance', () => {
    const instance1 = SessionManager;
    const instance2 = SessionManager;
    expect(instance1).toBe(instance2);
  });

  it('should start a session with correct duration', async () => {
    const mockMultiSet = AsyncStorage.multiSet as jest.Mock;
    mockMultiSet.mockResolvedValue(undefined);

    await SessionManager.startSession(3600); // 1 hour

    expect(mockMultiSet).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.arrayContaining(['vpn_session_active', 'true']),
        expect.arrayContaining(['vpn_session_duration', '3600']),
      ])
    );
  });

  it('should get current session data', async () => {
    const mockMultiGet = AsyncStorage.multiGet as jest.Mock;
    const now = Date.now();
    const endTime = now + 3600000; // 1 hour from now

    mockMultiGet.mockResolvedValue([
      ['vpn_session_active', 'true'],
      ['vpn_session_start_time', now.toString()],
      ['vpn_session_duration', '3600'],
      ['vpn_timer_end_timestamp', endTime.toString()],
    ]);

    const session = await SessionManager.getCurrentSession();

    expect(session.isActive).toBe(true);
    expect(session.duration).toBe(3600);
    expect(session.remainingTime).toBeGreaterThan(3500); // Should be close to 3600
  });

  it('should end a session', async () => {
    const mockMultiSet = AsyncStorage.multiSet as jest.Mock;
    mockMultiSet.mockResolvedValue(undefined);

    await SessionManager.endSession();

    expect(mockMultiSet).toHaveBeenCalledWith(
      expect.arrayContaining([
        ['vpn_session_active', 'false'],
        ['vpn_timer_end_timestamp', ''],
      ])
    );
  });

  it('should detect expired session', async () => {
    const mockMultiGet = AsyncStorage.multiGet as jest.Mock;
    const mockMultiSet = AsyncStorage.multiSet as jest.Mock;
    const expiredTime = Date.now() - 1000; // 1 second ago

    mockMultiGet.mockResolvedValue([
      ['vpn_session_active', 'true'],
      ['vpn_session_start_time', (expiredTime - 3600000).toString()],
      ['vpn_session_duration', '3600'],
      ['vpn_timer_end_timestamp', expiredTime.toString()],
    ]);
    
    mockMultiSet.mockResolvedValue(undefined);

    const expired = await SessionManager.checkSessionExpiry();

    expect(expired).toBe(true);
    expect(mockMultiSet).toHaveBeenCalledWith(
      expect.arrayContaining([
        ['vpn_session_active', 'false'],
        ['vpn_timer_end_timestamp', ''],
      ])
    );
  });
});