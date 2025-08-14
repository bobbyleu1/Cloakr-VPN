// index.tsx
import { FontAwesome5 } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  Linking,
  Modal,
  NativeEventEmitter,
  NativeModules,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import mobileAds, {
  AdEventType,
  BannerAdSize,
  RewardedAdEventType,
} from 'react-native-google-mobile-ads';
import { PremiumConfigProvider, usePremiumConfig } from '../src/context/PremiumConfigContext';
import { EntitlementsProvider, useEntitlements } from '../src/iap/EntitlementsContext';
import { PaywallV2 } from '../src/paywall/PaywallV2';
import SessionManager from '../src/services/SessionManager';
import { BANNER_ID, PremiumBannerAd, REWARDED_AD_ID, PremiumRewardedAd as RewardedAdInstance, setAdsEnabled } from '../src/utils/Ads';
import { logger } from '../src/utils/logger';

const { VPNManager } = NativeModules;
const vpnEvents = new NativeEventEmitter(VPNManager);

function HomeScreenContent() {
  const { config } = usePremiumConfig();
  const { isPremium, restore } = useEntitlements();
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [vpnTimeLeft, setVpnTimeLeft] = useState(0); // in seconds
  const [rewardedLoaded, setRewardedLoaded] = useState(false);
  const [adsWatched, setAdsWatched] = useState(0);
  const [showPaywall, setShowPaywall] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const [rewarded, setRewarded] = useState<RewardedAdInstance | null>(null);

  useEffect(() => {
    (async () => {
      try {
        // Enable visible logging for physical device debugging
        logger.enableVisibleLogging();
        logger.app.info('Initializing app...');
        
        await SplashScreen.preventAutoHideAsync();
        logger.ads.info('Initializing mobile ads...');
        await mobileAds().initialize();
        setTimeout(() => {
          SplashScreen.hideAsync();
          logger.app.info('Splash screen hidden');
        }, 500);
        logger.app.info('App initialization completed');
      } catch (e) {
        logger.app.error('Splash initialization error', undefined, e as Error);
      }
    })();
  }, []);

  // Create fresh ad instance when adsWatched changes
  useEffect(() => {
    if (!isPremium && adsWatched < 6) {
      logger.ads.info('Creating fresh ad instance', { 
        adNumber: adsWatched + 1, 
        vpnConnected: isConnected 
      });
      
      const rewardedAd = new RewardedAdInstance(REWARDED_AD_ID, {
        requestNonPersonalizedAdsOnly: true,
      });
      setRewarded(rewardedAd);
      setRewardedLoaded(false);

      const unsubLoaded = rewardedAd.addAdEventListener(RewardedAdEventType.LOADED, () => {
        logger.ads.info('Ad loaded successfully', { 
          adNumber: adsWatched + 1, 
          vpnConnected: isConnected 
        });
        setRewardedLoaded(true);
      });

      const unsubFailed = rewardedAd.addAdEventListener(AdEventType.ERROR, (error: any) => {
        logger.ads.error('Ad failed to load', { 
          adNumber: adsWatched + 1, 
          vpnConnected: isConnected,
          error 
        });
        setRewardedLoaded(false);
        // Retry after delay
        setTimeout(() => {
          logger.ads.info('Retrying ad load...');
          rewardedAd.load();
        }, 3000);
      });

      const unsubEarned = rewardedAd.addAdEventListener(RewardedAdEventType.EARNED_REWARD, async () => {
        logger.ads.info('Ad reward earned', { 
          adNumber: adsWatched + 1, 
          vpnConnected: isConnected 
        });
        
        // Add 2 hours (7200 seconds) - handle both connected and disconnected states
        try {
          const currentSession = await SessionManager.getCurrentSession();
          if (currentSession.isActive && isConnected) {
            // VPN is connected - extend the active session
            await SessionManager.extendSession(7200, 43200);
            logger.ads.info('Extended active VPN session by 2 hours');
            // Also update local state to reflect the change immediately
            const updatedSession = await SessionManager.getCurrentSession();
            setVpnTimeLeft(updatedSession.remainingTime);
          } else {
            // VPN not connected - just add time to local state
            const newTimeLeft = Math.min(vpnTimeLeft + 7200, 43200);
            setVpnTimeLeft(newTimeLeft);
            logger.ads.info('Added 2 hours to local time', { newTimeLeft });
          }
        } catch (error) {
          logger.ads.error('Failed to extend session, using fallback', undefined, error as Error);
          const newTimeLeft = Math.min(vpnTimeLeft + 7200, 43200);
          setVpnTimeLeft(newTimeLeft);
        }
        
        // Increment ads watched - this will trigger a new useEffect to create fresh ad
        setAdsWatched((prev) => Math.min(prev + 1, 6));
      });

      // Load the ad - this should work regardless of VPN state
      logger.ads.info('Loading ad', { 
        adNumber: adsWatched + 1, 
        vpnConnected: isConnected 
      });
      rewardedAd.load();
      
      return () => {
        logger.ads.debug('Cleaning up ad instance', { adNumber: adsWatched + 1 });
        unsubLoaded();
        unsubFailed();
        unsubEarned();
      };
    }
  }, [isPremium, adsWatched]); // Removed vpnTimeLeft and isConnected from deps to prevent recreation


  useEffect(() => {
    logger.config.info('Updating ads enabled status', { enabled: config.ads.enabled });
    setAdsEnabled(config.ads.enabled);
  }, [config.ads.enabled]);


  // Initialize SessionManager
  useEffect(() => {
    const initializeSessionManager = async () => {
      logger.session.info('Setting up SessionManager callbacks...');
      SessionManager.setOnSessionExpired(() => {
        logger.session.warn('Session expired callback triggered');
        setIsConnected(false);
        setVpnTimeLeft(0);
        Alert.alert('Session Expired', 'Your VPN session has expired and the connection was automatically terminated.');
      });

      SessionManager.setOnSessionUpdated((sessionData) => {
        logger.session.debug('Session updated callback triggered', { 
          remainingTime: sessionData.remainingTime 
        });
        setVpnTimeLeft(sessionData.remainingTime);
      });

      await SessionManager.initialize();
      
      const currentSession = await SessionManager.getCurrentSession();
      if (currentSession.isActive && currentSession.remainingTime > 0) {
        logger.session.info('Restored active session on app start', {
          remainingTime: currentSession.remainingTime
        });
        setVpnTimeLeft(currentSession.remainingTime);
      }
    };

    initializeSessionManager();

    return () => {
      SessionManager.destroy();
    };
  }, []);

  const applyStatus = (status: string) => {
    const isActuallyConnected = status === 'connected' || status === 'connecting';
    setIsConnected(isActuallyConnected);
    setIsConnecting(status === 'connecting');
    logger.vpn.info('Applied VPN status', { 
      status, 
      isConnected: isActuallyConnected,
      isConnecting: status === 'connecting'
    });
  };

  useEffect(() => {
    const loadAppState = async () => {
      try {
        logger.storage.info('Loading app state from storage...');
        const savedAdsWatched = await AsyncStorage.getItem('ads_watched');
        if (savedAdsWatched) {
          const adsCount = parseInt(savedAdsWatched, 10);
          setAdsWatched(adsCount);
          logger.storage.info('Loaded saved ads watched count', { count: adsCount });
        }
        
        const savedVpnTime = await AsyncStorage.getItem('vpn_time_left');
        if (savedVpnTime) {
          const timeLeft = parseInt(savedVpnTime, 10);
          setVpnTimeLeft(timeLeft);
          logger.storage.info('Loaded saved VPN time', { timeLeft });
        }
        
        logger.vpn.debug('Getting cached VPN status...');
        const cached = await VPNManager.getCachedStatus();
        applyStatus(cached);
        
        logger.vpn.debug('Refreshing VPN status...');
        const real = await VPNManager.refreshStatus();
        applyStatus(real);
        
        logger.app.info('App state loaded successfully');
      } catch (e) {
        logger.app.error('Failed to load app state', undefined, e as Error);
      }
    };
    
    loadAppState();
    
    const subscription = vpnEvents.addListener('vpnStatus', (event) => {
      logger.vpn.info('VPN status event received', { status: event.status });
      applyStatus(event.status);
    });
    
    return () => {
      logger.vpn.debug('Removing VPN status listener');
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    const handleAppStateChange = async (nextAppState: string) => {
      logger.app.info('App state change detected', { nextAppState });
      if (nextAppState === 'active') {
        setTimeout(async () => {
          try {
            logger.vpn.debug('Refreshing VPN status on app active');
            const status = await VPNManager.refreshStatus();
            applyStatus(status);
          } catch (e) {
            logger.vpn.error('Failed to refresh status on app active', undefined, e as Error);
          }
        }, 300);
      }
    };
    
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    const interval = setInterval(async () => {
      if (AppState.currentState === 'active') {
        try {
          logger.vpn.debug('Periodic VPN status refresh');
          const status = await VPNManager.refreshStatus();
          applyStatus(status);
        } catch (e) {
          logger.vpn.error('Failed periodic status refresh', undefined, e as Error);
        }
      }
    }, 30000);

    return () => {
      subscription.remove();
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const saveVpnTime = async () => {
      try {
        await AsyncStorage.setItem('vpn_time_left', vpnTimeLeft.toString());
        logger.storage.debug('Saved VPN time to storage', { timeLeft: vpnTimeLeft });
      } catch (e) {
        logger.storage.error('Failed to save VPN time', undefined, e as Error);
      }
    };
    saveVpnTime();
  }, [vpnTimeLeft]);

  useEffect(() => {
    const saveAdsWatched = async () => {
      try {
        await AsyncStorage.setItem('ads_watched', adsWatched.toString());
        logger.storage.debug('Saved ads watched count to storage', { count: adsWatched });
      } catch (e) {
        logger.storage.error('Failed to save ads watched count', undefined, e as Error);
      }
    };
    saveAdsWatched();
  }, [adsWatched]);

  const showRewardedAd = () => {
    logger.ads.info('Show rewarded ad requested', { 
      rewardedExists: !!rewarded, 
      rewardedLoaded 
    });
    if (rewarded && rewardedLoaded) {
      logger.ads.info('Showing rewarded ad');
      rewarded.show();
    } else {
      logger.ads.warn('Ad not ready for display', { 
        rewardedExists: !!rewarded, 
        rewardedLoaded 
      });
      Alert.alert('Ad Not Ready', 'Please wait for the ad to load and try again.');
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const connectToVPN = async () => {
    if (isConnecting) {
      logger.vpn.debug('Connect request ignored - already connecting');
      return;
    }
    
    logger.vpn.info('VPN connect requested', {
      isPremium,
      premiumModeEnabled: config.ios.featureFlags.premiumModeEnabled,
      vpnTimeLeft
    });
    
    if (!isPremium && config.ios.featureFlags.premiumModeEnabled && vpnTimeLeft <= 0) {
      logger.vpn.warn('VPN connect blocked - no time remaining');
      Alert.alert('No VPN Time', 'You need to watch an ad to get VPN time!', [
        { text: 'Watch Ad', onPress: showRewardedAd },
        { text: 'Cancel', style: 'cancel' }
      ]);
      return;
    }

    setIsConnecting(true);
    try {
      logger.vpn.info('Attempting to connect VPN...');
      VPNManager?.connect?.();
      
      setTimeout(async () => {
        try {
          const status = await VPNManager.refreshStatus();
          applyStatus(status);
          
          if (status === 'connected' && !isPremium && config.ios.featureFlags.premiumModeEnabled && vpnTimeLeft > 0) {
            try {
              await SessionManager.startSession(vpnTimeLeft);
              logger.vpn.info('VPN connected - Started session timer');
            } catch (error) {
              logger.vpn.error('Failed to start session timer', undefined, error as Error);
            }
          }
        } catch (e) {
          logger.vpn.error('Failed to refresh status after connect', undefined, e as Error);
          setIsConnecting(false);
        }
      }, 3000);
    } catch (e) {
      logger.vpn.error('VPN connect error', undefined, e as Error);
      setIsConnecting(false);
    }
  };

  const disconnectFromVPN = async () => {
    if (isConnecting) {
      logger.vpn.debug('Disconnect request ignored - already connecting/disconnecting');
      return;
    }
    
    logger.vpn.info('VPN disconnect requested');
    setIsConnecting(true);
    try {
      logger.vpn.info('Attempting to disconnect VPN...');
      VPNManager?.disconnect?.();
      
      try {
        await SessionManager.endSession();
        logger.vpn.info('Session ended on disconnect');
      } catch (error) {
        logger.vpn.error('Failed to end session on disconnect', undefined, error as Error);
      }
      
      setTimeout(async () => {
        try {
          const status = await VPNManager.refreshStatus();
          applyStatus(status);
        } catch (e) {
          logger.vpn.error('Failed to refresh status after disconnect', undefined, e as Error);
          setIsConnecting(false);
        }
      }, 2000);
    } catch (e) {
      logger.vpn.error('VPN disconnect error', undefined, e as Error);
      setIsConnecting(false);
    }
  };

  const openPaywall = () => {
    logger.paywall.info('Opening paywall');
    setShowPaywall(true);
  };

  const closePaywall = () => {
    logger.paywall.info('Closing paywall');
    setShowPaywall(false);
  };

  const handlePurchaseSuccess = () => {
    logger.paywall.info('Purchase successful, closing paywall');
    setShowPaywall(false);
  };

  const handleRestorePurchases = async () => {
    logger.iap.info('Restore purchases requested');
    setRestoring(true);
    try {
      await restore();
      logger.iap.info('Restore purchases successful');
      Alert.alert('Success!', 'Your premium subscription has been restored!');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.iap.error('Restore purchases failed', { errorMessage }, error as Error);
      
      let title = 'Restore Failed';
      let message = 'Failed to restore purchases. Please try again.';

      switch (errorMessage) {
        case 'NO_PURCHASES':
          title = 'No Subscription Found';
          message = 'No subscription found for this Apple ID. If you purchased on a different Apple ID, please sign in with that account and try again.';
          break;
          
        case 'NOT_ACTIVE':
          title = 'No Active Subscription';
          message = 'No active subscription to restore. Your subscription may have expired or been cancelled.';
          break;
          
        case 'NETWORK_ERROR':
          title = 'Connection Error';
          message = 'Unable to connect to the server. Please check your internet connection and try again.';
          break;
      }
      
      Alert.alert(title, message);
    } finally {
      setRestoring(false);
    }
  };

  const getStatusText = () => (isConnecting ? 'Connecting...' : isConnected ? 'Connected' : 'Disconnected');

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <View style={styles.container}>
        <View style={styles.topBar}>
          <Text style={styles.headerText}>Cloakr</Text>
          <View style={styles.topBarButtons}>
            {!isPremium && config.ios.featureFlags.premiumModeEnabled && (
              <TouchableOpacity onPress={openPaywall} style={styles.topBarButton}>
                <Text style={styles.premiumText}>Premium</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity 
              onPress={handleRestorePurchases} 
              style={styles.restoreButton}
              disabled={restoring}
            >
              {restoring ? (
                <ActivityIndicator size="small" color="#60a5fa" />
              ) : (
                <Text style={styles.restoreText}>Restore</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.mainContent}>
          <Text style={styles.statusText}>{getStatusText()}</Text>
          
          <TouchableOpacity
            style={styles.connectButton}
            onPress={isConnected ? disconnectFromVPN : connectToVPN}
            disabled={isConnecting}
          >
            {isConnecting ? (
              <ActivityIndicator color="#fff" size="large" />
            ) : (
              <Text style={styles.connectButtonText}>
                {isConnected ? 'Disconnect' : 'Connect'}
              </Text>
            )}
          </TouchableOpacity>

          {!isPremium && config.ios.featureFlags.premiumModeEnabled && (
            <View style={styles.bottomInfo}>
              <TouchableOpacity 
                style={styles.adsButton} 
                onPress={showRewardedAd}
                disabled={!rewardedLoaded || adsWatched >= 6}
              >
                <Text style={styles.adsButtonText}>
                  {adsWatched >= 6 ? 'Max ads watched (6/6)' : `Watch ad to connect: ${adsWatched}/6`}
                </Text>
              </TouchableOpacity>
              <Text style={styles.timeText}>Time remaining: {formatTime(vpnTimeLeft)}</Text>
            </View>
          )}
          {(isPremium || !config.ios.featureFlags.premiumModeEnabled) && (
            <Text style={styles.premiumStatus}>Unlimited VPN Access</Text>
          )}
        </View>

        {!isPremium && config.ios.featureFlags.premiumModeEnabled && vpnTimeLeft === 0 && (
          <View style={styles.adPrompt}>
            <Text style={styles.adPromptText}>Watch an ad to get 2 hours of VPN time</Text>
            <TouchableOpacity 
              style={[styles.watchAdButton, !rewardedLoaded && styles.watchAdButtonDisabled]} 
              onPress={showRewardedAd}
              disabled={!rewardedLoaded}
            >
              <FontAwesome5 name="play" size={16} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.watchAdText}>Watch Ad</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.legalContainer}>
          <TouchableOpacity 
            style={styles.legalButton} 
            onPress={() => Linking.openURL('https://vroomautomotivegroup.com/cloakr-privacy-policy')}
          >
            <Text style={styles.legalText}>Privacy Policy</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.legalButton} 
            onPress={() => Linking.openURL('https://www.apple.com/legal/internet-services/itunes/dev/stdeula/')}
          >
            <Text style={styles.legalText}>Terms of Use</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.adContainer}>
          <PremiumBannerAd
            unitId={BANNER_ID}
            size={BannerAdSize.FULL_BANNER}
            requestOptions={{ requestNonPersonalizedAdsOnly: true }}
            onAdLoaded={() => logger.ads.info('Banner ad loaded successfully')}
            onAdFailedToLoad={(err: any) => logger.ads.error('Banner ad failed to load', { error: err })}
          />
        </View>
      </View>

      <Modal
        visible={showPaywall}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <PaywallV2
          onClose={closePaywall}
          onPurchaseSuccess={handlePurchaseSuccess}
        />
      </Modal>
    </SafeAreaView>
  );
}

export default function HomeScreen() {
  return (
    <PremiumConfigProvider>
      <EntitlementsProvider>
        <HomeScreenContent />
      </EntitlementsProvider>
    </PremiumConfigProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: { 
    flex: 1, 
    backgroundColor: '#1a1a1a' 
  },
  container: { 
    flex: 1, 
    paddingHorizontal: 20,
    justifyContent: 'space-between'
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Platform.OS === 'android' ? 20 : 16,
    paddingBottom: 10,
  },
  headerText: { 
    fontSize: 28, 
    fontWeight: 'bold', 
    color: '#F8FAFC' 
  },
  premiumText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#60a5fa',
  },
  mainContent: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
    paddingVertical: 40,
  },
  statusText: { 
    fontSize: 18, 
    fontWeight: '500', 
    color: '#9ca3af',
    marginBottom: 60,
  },
  connectButton: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#374151',
    borderWidth: 3,
    borderColor: '#4b5563',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 60,
  },
  connectButtonText: { 
    color: '#F8FAFC', 
    fontSize: 20, 
    fontWeight: '600' 
  },
  protectedText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
  },
  adPrompt: {
    alignItems: 'center',
    backgroundColor: '#2d3748',
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 20,
  },
  adPromptText: {
    color: '#a0aec0',
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center',
  },
  watchAdButton: {
    backgroundColor: '#3182CE',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  watchAdButtonDisabled: {
    backgroundColor: '#4a5568',
    opacity: 0.6,
  },
  watchAdText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  legalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  legalButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  legalText: {
    color: '#3182CE',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  topBarButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  topBarButton: {
    // No additional styles needed
  },
  restoreButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#60a5fa',
    backgroundColor: 'transparent',
  },
  restoreText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#60a5fa',
  },
  adContainer: { 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingVertical: 10,
    minHeight: 60,
    backgroundColor: '#1a1a1a'
  },
  bottomInfo: {
    alignItems: 'center',
  },
  adsText: {
    fontSize: 16,
    color: '#60a5fa',
    fontWeight: '600',
    marginBottom: 8,
  },
  timeText: {
    fontSize: 14,
    color: '#9ca3af',
    fontWeight: '500',
  },
  premiumStatus: {
    fontSize: 16,
    color: '#10b981',
    fontWeight: '600',
  },
  adsButton: {
    backgroundColor: '#374151',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#60a5fa',
  },
  adsButtonText: {
    fontSize: 16,
    color: '#60a5fa',
    fontWeight: '600',
    textAlign: 'center',
  },
});