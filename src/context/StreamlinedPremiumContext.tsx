import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setIsPremium as setAdsIsPremium } from '../utils/Ads';
import { Platform } from 'react-native';
import { restoreSubscription, initIAP } from '../iap/iap';

interface StreamlinedPremiumContextType {
  isPremium: boolean;
  loadingEntitlement: boolean;
  restoreEntitlement: () => Promise<boolean>;
  checkSubscriptionStatus: () => Promise<void>;
}

const StreamlinedPremiumContext = createContext<StreamlinedPremiumContextType | undefined>(undefined);

export const useStreamlinedPremium = () => {
  const context = useContext(StreamlinedPremiumContext);
  if (!context) {
    throw new Error('useStreamlinedPremium must be used within a StreamlinedPremiumProvider');
  }
  return context;
};

interface StreamlinedPremiumProviderProps {
  children: ReactNode;
}

const PREMIUM_STORAGE_KEY = 'cloakr_premium_streamlined';

export const StreamlinedPremiumProvider: React.FC<StreamlinedPremiumProviderProps> = ({ children }) => {
  const [isPremium, setIsPremiumState] = useState(false);
  const [loadingEntitlement, setLoadingEntitlement] = useState(true);

  const setIsPremium = async (premium: boolean) => {
    console.log('[StreamlinedPremium] Setting premium status:', premium);
    setIsPremiumState(premium);
    setAdsIsPremium(premium);
    await AsyncStorage.setItem(PREMIUM_STORAGE_KEY, premium.toString());
  };

  useEffect(() => {
    initializePremiumStatus();
  }, []);

  useEffect(() => {
    setAdsIsPremium(isPremium);
  }, [isPremium]);

  const initializePremiumStatus = async () => {
    try {
      console.log('[StreamlinedPremium] Initializing premium status...');
      setLoadingEntitlement(true);
      
      // Load cached premium status first for faster UI
      const savedPremiumStatus = await AsyncStorage.getItem(PREMIUM_STORAGE_KEY);
      if (savedPremiumStatus === 'true') {
        console.log('[StreamlinedPremium] Found cached premium status');
        setIsPremiumState(true);
      }

      if (Platform.OS === 'ios' && !__DEV__) {
        // Initialize IAP and check current subscriptions
        console.log('[StreamlinedPremium] Checking iOS subscriptions...');
        await initIAP();
        
        // Use restore to check current status (without user interaction)
        const result = await restoreSubscription();
        await setIsPremium(result.restored);
        
        console.log('[StreamlinedPremium] iOS subscription check result:', result.restored);
      } else if (__DEV__) {
        console.log('[StreamlinedPremium] Development mode - keeping cached status');
      }

    } catch (error) {
      console.error('[StreamlinedPremium] Failed to initialize premium status:', error);
    } finally {
      setLoadingEntitlement(false);
    }
  };

  const checkSubscriptionStatus = async (): Promise<void> => {
    if (__DEV__) return;
    
    try {
      console.log('[StreamlinedPremium] Checking subscription status...');
      if (Platform.OS === 'ios') {
        const result = await restoreSubscription();
        await setIsPremium(result.restored);
        console.log('[StreamlinedPremium] Subscription status updated:', result.restored);
      }
    } catch (error) {
      console.error('[StreamlinedPremium] Failed to check subscription status:', error);
    }
  };

  const restoreEntitlement = async (): Promise<boolean> => {
    if (__DEV__) {
      return false;
    }

    try {
      console.log('[StreamlinedPremium] Restoring entitlements...');
      if (Platform.OS === 'ios') {
        const result = await restoreSubscription();
        await setIsPremium(result.restored);
        console.log('[StreamlinedPremium] Restore result:', result.restored);
        return result.restored;
      }
      
      return false;
    } catch (error) {
      console.error('[StreamlinedPremium] Failed to restore purchases:', error);
      return false;
    }
  };

  const value: StreamlinedPremiumContextType = {
    isPremium,
    loadingEntitlement,
    restoreEntitlement,
    checkSubscriptionStatus,
  };

  return (
    <StreamlinedPremiumContext.Provider value={value}>
      {children}
    </StreamlinedPremiumContext.Provider>
  );
};