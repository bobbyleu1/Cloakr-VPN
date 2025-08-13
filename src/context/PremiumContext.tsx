import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { storeKit, PremiumProduct, PurchaseResult } from '../utils/storekit';
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
  restoreEntitlement: () => Promise<boolean>;
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

export const PremiumProvider: React.FC<PremiumProviderProps> = ({ children }) => {
  const { config, loading: configLoading } = usePremiumConfig();
  const [isPremium, setIsPremiumState] = useState(false);
  const [loadingEntitlement, setLoadingEntitlement] = useState(true);
  const [products, setProducts] = useState<PremiumProduct[]>([]);

  const setIsPremium = async (premium: boolean) => {
    setIsPremiumState(premium);
    setAdsIsPremium(premium);
    await AsyncStorage.setItem(PREMIUM_STORAGE_KEY, premium.toString());
  };

  useEffect(() => {
    if (!configLoading) {
      initializePremiumStatus();
      setupPurchaseListener();
    }
  }, [configLoading, config]);

  useEffect(() => {
    setAdsIsPremium(isPremium);
  }, [isPremium]);

  const initializePremiumStatus = async () => {
    try {
      setLoadingEntitlement(true);
      
      // Load cached premium status first for faster UI (but don't trust it)
      const savedPremiumStatus = await AsyncStorage.getItem(PREMIUM_STORAGE_KEY);
      if (savedPremiumStatus === 'true') {
        setIsPremiumState(true);
      }

      if (Platform.OS === 'ios' && !__DEV__) {
        // ALWAYS check real entitlements on startup, overriding any cached value
        const actuallyHasPremium = await storeKit.checkCurrentEntitlements(config.ios.activeProductIds);
        
        // Update state to match actual entitlements
        if (actuallyHasPremium !== isPremium) {
          await setIsPremium(actuallyHasPremium);
          console.log(`Updated premium status from entitlement check: ${actuallyHasPremium}`);
        }
        
        const availableProducts = await storeKit.fetchProducts(config.ios.activeProductIds);
        setProducts(availableProducts);
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
        setProducts(config.ios.activeProductIds.map((id, index) => ({
          productId: id,
          price: '$5.99',
          localizedPrice: '$5.99',
          title: 'Cloakr Premium Monthly',
          description: 'Unlimited VPN access with no ads'
        })));
      }

    } catch (error) {
      console.error('Failed to initialize premium status:', error);
    } finally {
      setLoadingEntitlement(false);
    }
  };

  const setupPurchaseListener = () => {
    if (__DEV__) return;

    try {
      if (Platform.OS === 'ios') {
        // iOS purchase listener would go here - currently disabled since expo-in-app-purchases removed
        console.log('iOS purchase listener setup (placeholder)');
      } else if (Platform.OS === 'android') {
        // Android purchase listener is handled natively by the BillingManager
        console.log('Android purchase listener handled natively');
      }
    } catch (error) {
      console.error('Failed to setup purchase listener:', error);
    }
  };

  const checkSubscriptionStatus = async (): Promise<void> => {
    if (__DEV__) return;
    
    try {
      if (Platform.OS === 'ios') {
        // Use the new entitlement check method
        const hasActiveSubscription = await storeKit.checkCurrentEntitlements(config.ios.activeProductIds);
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

  const purchasePremium = async (productId?: string): Promise<PurchaseResult> => {
    if (__DEV__) {
      await setIsPremium(true);
      return { success: true };
    }

    try {
      if (Platform.OS === 'ios') {
        if (products.length === 0) {
          return { success: false, error: 'No products available' };
        }

        const targetProductId = productId || config.ios.activeProductIds[0];
        if (!config.ios.activeProductIds.includes(targetProductId)) {
          return { success: false, error: 'Invalid product ID' };
        }

        const result = await storeKit.purchaseProduct(targetProductId);
        
        // If purchase was successful, re-check entitlements immediately
        if (result.success) {
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
      console.error('Purchase failed:', error);
      return { success: false, error: (error as Error).message };
    }
  };

  const restoreEntitlement = async (): Promise<boolean> => {
    if (__DEV__) {
      return false;
    }

    try {
      if (Platform.OS === 'ios') {
        // Use the new entitlement check method for restore
        const hasValidEntitlement = await storeKit.checkCurrentEntitlements(config.ios.activeProductIds);
        
        // Update premium status based on actual entitlements
        await setIsPremium(hasValidEntitlement);
        
        console.log(`iOS restore purchases result: ${hasValidEntitlement}`);
        return hasValidEntitlement;
      } else if (Platform.OS === 'android') {
        // Use native Android restore purchases
        const androidPremium = await VPNManager.restorePurchases();
        await setIsPremium(androidPremium);
        
        console.log(`Android restore purchases result: ${androidPremium}`);
        return androidPremium;
      }
      
      return false;
    } catch (error) {
      console.error('Failed to restore purchases:', error);
      return false;
    }
  };

  const openManageSubscriptions = () => {
    if (Platform.OS === 'ios') {
      const url = 'itms-apps://apps.apple.com/account/subscriptions';
      // You would typically use Linking.openURL(url) here
      // But since we don't have access to Linking in this context,
      // we'll handle this in the UI components
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