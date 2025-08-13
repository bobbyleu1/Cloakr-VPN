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
import { PremiumProvider, usePremium } from '../src/context/PremiumContext';
import { PaywallScreen } from '../src/paywall/PaywallScreen';
import SessionManager from '../src/services/SessionManager';
import { BANNER_ID, PremiumBannerAd, REWARDED_AD_ID, PremiumRewardedAd as RewardedAdInstance, setAdsEnabled } from '../src/utils/Ads';

const { VPNManager } = NativeModules;
const vpnEvents = new NativeEventEmitter(VPNManager);

function HomeScreenContent() {
  const { config } = usePremiumConfig();
  const { isPremium, restoreEntitlement } = usePremium();
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
        await SplashScreen.preventAutoHideAsync();
        await mobileAds().initialize();
        setTimeout(SplashScreen.hideAsync, 500);
      } catch (e) {
        console.warn('Splash error:', e);
      }
    })();
  }, []);

  // Create fresh ad instance when adsWatched changes
  useEffect(() => {
    if (!isPremium && adsWatched < 6) {
      console.log('Creating fresh ad instance for ad #', adsWatched + 1, 'VPN connected:', isConnected);
      
      const rewardedAd = new RewardedAdInstance(REWARDED_AD_ID, {
        requestNonPersonalizedAdsOnly: true,
      });
      setRewarded(rewardedAd);
      setRewardedLoaded(false);

      const unsubLoaded = rewardedAd.addAdEventListener(RewardedAdEventType.LOADED, () => {
        console.log('Ad loaded for ad #', adsWatched + 1, 'VPN connected:', isConnected);
        setRewardedLoaded(true);
      });

      const unsubFailed = rewardedAd.addAdEventListener(AdEventType.ERROR, (error: any) => {
        console.warn('Ad failed to load for ad #', adsWatched + 1, 'Error:', error, 'VPN connected:', isConnected);
        setRewardedLoaded(false);
        // Retry after delay
        setTimeout(() => {
          console.log('Retrying ad load...');
          rewardedAd.load();
        }, 3000);
      });

      const unsubEarned = rewardedAd.addAdEventListener(RewardedAdEventType.EARNED_REWARD, async () => {
        console.log('Ad reward earned for ad #', adsWatched + 1, 'VPN connected:', isConnected);
        
        // Add 2 hours (7200 seconds) - handle both connected and disconnected states
        try {
          const currentSession = await SessionManager.getCurrentSession();
          if (currentSession.isActive && isConnected) {
            // VPN is connected - extend the active session
            await SessionManager.extendSession(7200, 43200);
            console.log('Extended active VPN session by 2 hours');
            // Also update local state to reflect the change immediately
            const updatedSession = await SessionManager.getCurrentSession();
            setVpnTimeLeft(updatedSession.remainingTime);
          } else {
            // VPN not connected - just add time to local state
            const newTimeLeft = Math.min(vpnTimeLeft + 7200, 43200);
            setVpnTimeLeft(newTimeLeft);
            console.log('Added 2 hours to local time:', newTimeLeft);
          }
        } catch (error) {
          console.warn('Failed to extend session, using fallback:', error);
          const newTimeLeft = Math.min(vpnTimeLeft + 7200, 43200);
          setVpnTimeLeft(newTimeLeft);
        }
        
        // Increment ads watched - this will trigger a new useEffect to create fresh ad
        setAdsWatched((prev) => Math.min(prev + 1, 6));
      });

      // Load the ad - this should work regardless of VPN state
      console.log('Loading ad for ad #', adsWatched + 1, 'VPN connected:', isConnected);
      rewardedAd.load();
      
      return () => {
        console.log('Cleaning up ad instance for ad #', adsWatched + 1);
        unsubLoaded();
        unsubFailed();
        unsubEarned();
      };
    }
  }, [isPremium, adsWatched]); // Removed vpnTimeLeft and isConnected from deps to prevent recreation


  useEffect(() => {
    setAdsEnabled(config.ads.enabled);
  }, [config.ads.enabled]);


  // Initialize SessionManager
  useEffect(() => {
    const initializeSessionManager = async () => {
      SessionManager.setOnSessionExpired(() => {
        setIsConnected(false);
        setVpnTimeLeft(0);
        Alert.alert('Session Expired', 'Your VPN session has expired and the connection was automatically terminated.');
      });

      SessionManager.setOnSessionUpdated((sessionData) => {
        setVpnTimeLeft(sessionData.remainingTime);
      });

      await SessionManager.initialize();
      
      const currentSession = await SessionManager.getCurrentSession();
      if (currentSession.isActive && currentSession.remainingTime > 0) {
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
    console.log('Applied VPN status:', status, 'isConnected:', isActuallyConnected);
  };

  useEffect(() => {
    const loadAppState = async () => {
      try {
        const savedAdsWatched = await AsyncStorage.getItem('ads_watched');
        if (savedAdsWatched) {
          setAdsWatched(parseInt(savedAdsWatched, 10));
        }
        
        const savedVpnTime = await AsyncStorage.getItem('vpn_time_left');
        if (savedVpnTime) {
          const timeLeft = parseInt(savedVpnTime, 10);
          setVpnTimeLeft(timeLeft);
          console.log('Loaded saved VPN time:', timeLeft);
        }
        
        const cached = await VPNManager.getCachedStatus();
        applyStatus(cached);
        
        const real = await VPNManager.refreshStatus();
        applyStatus(real);
      } catch (e) {
        console.warn('Failed to load app state:', e);
      }
    };
    
    loadAppState();
    
    const subscription = vpnEvents.addListener('vpnStatus', (event) => {
      applyStatus(event.status);
    });
    
    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    const handleAppStateChange = async (nextAppState: string) => {
      if (nextAppState === 'active') {
        setTimeout(async () => {
          try {
            const status = await VPNManager.refreshStatus();
            applyStatus(status);
          } catch (e) {
            console.warn('Failed to refresh status on app active:', e);
          }
        }, 300);
      }
    };
    
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    const interval = setInterval(async () => {
      if (AppState.currentState === 'active') {
        try {
          const status = await VPNManager.refreshStatus();
          applyStatus(status);
        } catch (e) {
          console.warn('Failed periodic status refresh:', e);
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
      } catch (e) {
        console.warn('Failed to save VPN time:', e);
      }
    };
    saveVpnTime();
  }, [vpnTimeLeft]);

  useEffect(() => {
    const saveAdsWatched = async () => {
      try {
        await AsyncStorage.setItem('ads_watched', adsWatched.toString());
      } catch (e) {
        console.warn('Failed to save ads watched count:', e);
      }
    };
    saveAdsWatched();
  }, [adsWatched]);

  const showRewardedAd = () => {
    if (rewarded && rewardedLoaded) {
      rewarded.show();
    } else {
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
    if (isConnecting) return;
    
    if (!isPremium && config.ios.featureFlags.premiumModeEnabled && vpnTimeLeft <= 0) {
      Alert.alert('No VPN Time', 'You need to watch an ad to get VPN time!', [
        { text: 'Watch Ad', onPress: showRewardedAd },
        { text: 'Cancel', style: 'cancel' }
      ]);
      return;
    }

    setIsConnecting(true);
    try {
      console.log('Attempting to connect VPN...');
      VPNManager?.connect?.();
      
      setTimeout(async () => {
        try {
          const status = await VPNManager.refreshStatus();
          applyStatus(status);
          
          if (status === 'connected' && !isPremium && config.ios.featureFlags.premiumModeEnabled && vpnTimeLeft > 0) {
            try {
              await SessionManager.startSession(vpnTimeLeft);
              console.log('VPN connected - Started session timer');
            } catch (error) {
              console.warn('Failed to start session timer:', error);
            }
          }
        } catch (e) {
          console.warn('Failed to refresh status after connect:', e);
          setIsConnecting(false);
        }
      }, 3000);
    } catch (e) {
      console.error('Connect error:', e);
      setIsConnecting(false);
    }
  };

  const disconnectFromVPN = async () => {
    if (isConnecting) return;
    setIsConnecting(true);
    try {
      console.log('Attempting to disconnect VPN...');
      VPNManager?.disconnect?.();
      
      try {
        await SessionManager.endSession();
        console.log('Session ended on disconnect');
      } catch (error) {
        console.warn('Failed to end session on disconnect:', error);
      }
      
      setTimeout(async () => {
        try {
          const status = await VPNManager.refreshStatus();
          applyStatus(status);
        } catch (e) {
          console.warn('Failed to refresh status after disconnect:', e);
          setIsConnecting(false);
        }
      }, 2000);
    } catch (e) {
      console.error('Disconnect error:', e);
      setIsConnecting(false);
    }
  };

  const openPaywall = () => {
    setShowPaywall(true);
  };

  const closePaywall = () => {
    setShowPaywall(false);
  };

  const handlePurchaseSuccess = () => {
    setShowPaywall(false);
  };

  const handleRestorePurchases = async () => {
    setRestoring(true);
    try {
      const restored = await restoreEntitlement();
      if (restored) {
        Alert.alert('Success!', 'Your premium subscription has been restored!');
      } else {
        Alert.alert('No Active Subscription', 'No active premium subscription was found. If you believe this is an error, please contact support.');
      }
    } catch (error) {
      Alert.alert('Restore Failed', 'Failed to check subscription status. Please try again.');
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
            onAdLoaded={() => console.log('Banner ad loaded successfully')}
            onAdFailedToLoad={(err: any) => console.warn('Banner ad failed to load:', err)}
          />
        </View>
      </View>

      <Modal
        visible={showPaywall}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <PaywallScreen
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
      <PremiumProvider>
        <HomeScreenContent />
      </PremiumProvider>
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