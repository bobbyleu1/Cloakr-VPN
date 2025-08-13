import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { iapManager, PremiumProduct, PurchaseResult, RestoreResult } from '../utils/iapManager';
import { setIsPremium as setAdsIsPremium } from '../utils/Ads';
import { Platform, NativeModules } from 'react-native';
import { usePremiumConfig } from './PremiumConfigContext';

const { VPNManager } = NativeModules;

interface PremiumContextType {
  isPremium: boolean;
  setIsPremium: (premium: boolean) => void;
  loadingEntitlement: boolean;
  products: PremiumProduct[];
  purchasePremium: (productId?: string) => Promise<PurchaseResult>;
  restoreEntitlement: () => Promise<RestoreResult>;
  checkSubscriptionStatus: () => Promise<void>;
  openManageSubscriptions: () => void;
}

const PremiumContext = createContext<PremiumContextType | undefined>(undefined);

export const usePremium = () => {
  const context = useContext(PremiumContext);
  if (!context) {
    throw new Error('usePremium must be used within a PremiumProvider');
  }
  return context;
};

interface PremiumProviderProps {
  children: ReactNode;
}

const PREMIUM_STORAGE_KEY = 'cloakr_premium_status';
const PREMIUM_EXPIRY_KEY = 'cloakr_premium_expiry';
const PREMIUM_LAST_CHECK_KEY = 'cloakr_premium_last_check';

export const PremiumProviderRNIap: React.FC<PremiumProviderProps> = ({ children }) => {
  const { config, loading: configLoading } = usePremiumConfig();
  const [isPremium, setIsPremiumState] = useState(false);
  const [loadingEntitlement, setLoadingEntitlement] = useState(true);
  const [products, setProducts] = useState<PremiumProduct[]>([]);
  const [expiryTimer, setExpiryTimer] = useState<NodeJS.Timeout | null>(null);

  const setIsPremium = async (premium: boolean, expiresDateMs?: number) => {
    setIsPremiumState(premium);
    setAdsIsPremium(premium);
    await AsyncStorage.setItem(PREMIUM_STORAGE_KEY, premium.toString());
    
    if (premium && expiresDateMs) {
      // Store expiry timestamp
      await AsyncStorage.setItem(PREMIUM_EXPIRY_KEY, expiresDateMs.toString());
      
      // Schedule background re-validation 1 hour before expiry
      const timeUntilExpiry = expiresDateMs - Date.now();
      const revalidationTime = Math.max(timeUntilExpiry - (60 * 60 * 1000), 60000); // At least 1 minute
      
      if (expiryTimer) {
        clearTimeout(expiryTimer);
      }
      
      const timer = setTimeout(async () => {
        console.log('[IAP][CONTEXT] Performing background re-validation near expiry...');
        await checkSubscriptionStatus();
      }, revalidationTime);
      
      setExpiryTimer(timer);
      
      console.log(`[IAP][CONTEXT] Scheduled re-validation in ${Math.round(revalidationTime / (60 * 1000))} minutes`);
    } else if (!premium) {
      // Clear expiry data when premium is revoked
      await AsyncStorage.removeItem(PREMIUM_EXPIRY_KEY);
      if (expiryTimer) {
        clearTimeout(expiryTimer);
        setExpiryTimer(null);
      }
    }
  };

  useEffect(() => {
    if (!configLoading) {
      initializePremiumStatus();
    }
  }, [configLoading, config]);

  useEffect(() => {
    setAdsIsPremium(isPremium);
  }, [isPremium]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (expiryTimer) {
        clearTimeout(expiryTimer);
      }
    };
  }, [expiryTimer]);

  /**
   * Initialize premium status and fetch products
   * UPDATED: Now uses comprehensive IAP readiness checks
   */
  const initializePremiumStatus = async () => {
    try {
      setLoadingEntitlement(true);
      
      // Load cached premium status and check expiry
      const savedPremiumStatus = await AsyncStorage.getItem(PREMIUM_STORAGE_KEY);
      const savedExpiryMs = await AsyncStorage.getItem(PREMIUM_EXPIRY_KEY);
      
      if (savedPremiumStatus === 'true') {
        if (savedExpiryMs) {
          const expiryTime = parseInt(savedExpiryMs, 10);
          const now = Date.now();
          
          if (expiryTime > now) {
            // Still valid, show premium immediately
            setIsPremiumState(true);
            console.log(`[IAP][CONTEXT] Cached premium valid until ${new Date(expiryTime).toISOString()}`);
            
            // Schedule re-validation near expiry
            const timeUntilExpiry = expiryTime - now;
            const revalidationTime = Math.max(timeUntilExpiry - (60 * 60 * 1000), 60000);
            
            const timer = setTimeout(async () => {
              console.log('[IAP][CONTEXT] Performing scheduled re-validation...');
              await checkSubscriptionStatus();
            }, revalidationTime);
            
            setExpiryTimer(timer);
          } else {
            console.log('[IAP][CONTEXT] Cached premium expired, will re-validate');
            await setIsPremium(false);
          }
        } else {
          // Premium cached but no expiry - old format, show but re-validate
          setIsPremiumState(true);
          console.log('[IAP][CONTEXT] Cached premium (no expiry), will re-validate');
        }
      }

      if (Platform.OS === 'ios' && !__DEV__) {
        try {
          console.log('[IAP][CONTEXT] Initializing IAP in PremiumContext...');
          
          // Ensure IAP is fully ready and setup listeners
          await iapManager.ensureIapReady();
          
          // Clean up any pending purchases from previous sessions
          await iapManager.cleanupPendingPurchases();
          
          // Get resolved products
          const availableProducts = iapManager.getResolvedProducts();
          setProducts(availableProducts);
          
          console.log('[IAP][CONTEXT] Products available:', availableProducts.length);
          
          // Check current subscription status
          const actuallyHasPremium = await iapManager.checkSubscriptionStatus(config.ios.activeProductIds);
          
          // Update state to match actual entitlements
          if (actuallyHasPremium !== isPremium) {
            await setIsPremium(actuallyHasPremium);
            console.log(`[IAP][CONTEXT] Updated premium status from entitlement check: ${actuallyHasPremium}`);
          }
          
        } catch (error) {
          console.error('[IAP][CONTEXT] Failed to initialize iOS IAP:', error);
          // Don't throw - continue with cached data
        }
      } else if (Platform.OS === 'android' && !__DEV__) {
        // Check Android premium status using native module
        try {
          const androidPremium = await VPNManager.isPremium();
          if (androidPremium !== isPremium) {
            await setIsPremium(androidPremium);
          }
        } catch (error) {
          console.error('Failed to check Android premium status:', error);
        }
      } else if (__DEV__) {
        // Development mode - create mock products
        setProducts(config.ios.activeProductIds.map((id, index) => ({
          productId: id,
          price: '5.99',
          localizedPrice: '$5.99',
          title: 'Cloakr Premium Monthly',
          description: 'Unlimited VPN access with no ads',
          currency: 'USD'
        })));
      }

    } catch (error) {
      console.error('Failed to initialize premium status:', error);
    } finally {
      setLoadingEntitlement(false);
    }
  };

  /**
   * Check subscription status
   * CHANGED: Now uses react-native-iap's receipt validation
   */
  const checkSubscriptionStatus = async (): Promise<void> => {
    if (__DEV__) return;
    
    try {
      if (Platform.OS === 'ios') {
        const hasActiveSubscription = await iapManager.checkSubscriptionStatus(config.ios.activeProductIds);
        if (hasActiveSubscription !== isPremium) {
          await setIsPremium(hasActiveSubscription);
          console.log(`iOS subscription status check updated premium to: ${hasActiveSubscription}`);
        }
      } else if (Platform.OS === 'android') {
        // Check Android premium status using native module
        const androidPremium = await VPNManager.isPremium();
        if (androidPremium !== isPremium) {
          await setIsPremium(androidPremium);
          console.log(`Android subscription status check updated premium to: ${androidPremium}`);
        }
      }
    } catch (error) {
      console.error('Failed to check subscription status:', error);
    }
  };

  /**
   * Purchase premium subscription
   * UPDATED: Now uses new comprehensive IAP manager with safeguards
   */
  const purchasePremium = async (productId?: string): Promise<PurchaseResult> => {
    if (__DEV__) {
      await setIsPremium(true);
      return { success: true };
    }

    try {
      if (Platform.OS === 'ios') {
        console.log('[IAP][CONTEXT] Starting purchase from context...');
        
        // Use the new comprehensive purchase method
        const result = await iapManager.requestCloakrSubscription();
        
        // If purchase was successful, re-check entitlements immediately
        if (result.success) {
          console.log('[IAP][CONTEXT] Purchase successful, checking entitlements...');
          await checkSubscriptionStatus();
        }
        
        return result;
      } else if (Platform.OS === 'android') {
        // Use native Android billing
        await VPNManager.launchBilling();
        // The billing result will be handled by the native module and events
        return { success: true };
      } else {
        return { success: false, error: 'Platform not supported' };
      }
    } catch (error) {
      console.error('[IAP][CONTEXT] Purchase failed:', error);
      return { success: false, error: (error as Error).message };
    }
  };

  /**
   * Restore purchases with proper backend validation
   * UPDATED: Now uses new restorePurchases() with backend validation
   */
  const restoreEntitlement = async (): Promise<RestoreResult> => {
    if (__DEV__) {
      console.log('[IAP][CONTEXT] Restore skipped in development mode');
      return { restored: false, reason: 'NO_PURCHASES' };
    }

    try {
      if (Platform.OS === 'ios') {
        console.log('[IAP][CONTEXT] Starting restore entitlement...');
        
        const restoreResult = await iapManager.restorePurchases();
        
        console.log('[IAP][CONTEXT] Restore result:', restoreResult);
        
        if (restoreResult.restored) {
          // Update premium status with expiry if available
          await setIsPremium(true, restoreResult.expiresDateMs);
          console.log('[IAP][CONTEXT] Premium access restored successfully');
        } else {
          // Don't change current premium status - let user know the specific reason
          console.log(`[IAP][CONTEXT] Restore failed: ${restoreResult.reason}`);
        }
        
        return restoreResult;
      } else if (Platform.OS === 'android') {
        // Use native Android restore purchases
        try {
          const androidPremium = await VPNManager.restorePurchases();
          await setIsPremium(androidPremium);
          
          console.log(`[IAP][CONTEXT] Android restore result: ${androidPremium}`);
          return { 
            restored: androidPremium,
            reason: androidPremium ? undefined : 'NOT_ACTIVE'
          };
        } catch (error) {
          console.error('[IAP][CONTEXT] Android restore failed:', error);
          return { restored: false, reason: 'SERVER_ERROR' };
        }
      }
      
      return { restored: false, reason: 'NO_PURCHASES' };
    } catch (error) {
      console.error('[IAP][CONTEXT] Failed to restore purchases:', error);
      return { restored: false, reason: 'SERVER_ERROR' };
    }
  };

  const openManageSubscriptions = () => {
    if (Platform.OS === 'ios') {
      const url = 'itms-apps://apps.apple.com/account/subscriptions';
      // This should be handled in the UI components with Linking.openURL
    }
  };

  const value: PremiumContextType = {
    isPremium,
    setIsPremium,
    loadingEntitlement,
    products,
    purchasePremium,
    restoreEntitlement,
    checkSubscriptionStatus,
    openManageSubscriptions,
  };

  return (
    <PremiumContext.Provider value={value}>
      {children}
    </PremiumContext.Provider>
  );
};