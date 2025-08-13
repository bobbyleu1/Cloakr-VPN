import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Linking } from 'react-native';
import {
  initIAP,
  endIAP,
  fetchProducts,
  purchaseCloakr,
  restoreCloakr,
  validateReceiptWithBackend,
  dumpDiagnostics,
  ProductInfo,
  EntitlementStatus,
  IAP_LOG_PREFIX,
} from './iapV2';

// Storage keys
const CLOAKR_PREMIUM = 'cloakr_premium_v2';
const CLOAKR_EXPIRES_MS = 'cloakr_premium_expires_v2';

// Legacy keys to purge
const LEGACY_KEYS = [
  'cloakr_premium_status',
  'cloakr_premium',
  'cloakr_premium_expires',
  'premiumStatus',
  'premium_expires',
];

interface EntitlementsContextType {
  status: EntitlementStatus;
  isPremium: boolean;
  price: string;
  loading: boolean;
  buy: () => Promise<void>;
  restore: () => Promise<void>;
  openManageSubscriptions: () => void;
}

const EntitlementsContext = createContext<EntitlementsContextType | undefined>(undefined);

interface RemoteConfig {
  ios?: {
    activeProductIds?: string[];
  };
  ui?: {
    showManageSubscriptionsLink?: boolean;
  };
  featureFlags?: {
    premiumModeEnabled?: boolean;
  };
}

export function EntitlementsProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<EntitlementStatus>('FREE');
  const [price, setPrice] = useState('$5.99');
  const [loading, setLoading] = useState(false);
  const [showManageLink, setShowManageLink] = useState(false);
  const [expiresDateMs, setExpiresDateMs] = useState<number | null>(null);

  const isPremium = status === 'PREMIUM_ACTIVE';

  /**
   * Initialize entitlements system
   */
  const initialize = useCallback(async () => {
    console.log(`${IAP_LOG_PREFIX} Initializing entitlements...`);

    try {
      // Purge legacy storage keys
      await purgeLegacyKeys();

      // Initialize IAP
      await initIAP();

      // Load cached expiry
      const cachedExpiryStr = await AsyncStorage.getItem(CLOAKR_EXPIRES_MS);
      const cachedExpiry = cachedExpiryStr ? parseInt(cachedExpiryStr) : null;
      const now = Date.now();

      console.log(`${IAP_LOG_PREFIX} Cached expiry: ${cachedExpiry}, now: ${now}`);

      if (cachedExpiry && cachedExpiry > now) {
        // Temporarily show premium optimistic
        console.log(`${IAP_LOG_PREFIX} Cached expiry valid, setting premium optimistic`);
        setStatus('PREMIUM_ACTIVE');
        setExpiresDateMs(cachedExpiry);

        // Immediately kick off silent revalidation
        silentRevalidation().catch(error => {
          console.warn(`${IAP_LOG_PREFIX} Silent revalidation failed:`, error);
        });
      } else {
        // No valid cache, ensure FREE
        console.log(`${IAP_LOG_PREFIX} No valid cache, setting FREE`);
        setStatus('FREE');
        setExpiresDateMs(null);
        await clearCachedEntitlement();
      }

      // Fetch products and remote config
      await Promise.all([
        fetchProductsAndPrice(),
        fetchRemoteConfig(),
      ]);

    } catch (error) {
      console.error(`${IAP_LOG_PREFIX} Initialization failed:`, error);
      setStatus('FREE');
    }
  }, []);

  /**
   * Purge legacy storage keys
   */
  const purgeLegacyKeys = async (): Promise<void> => {
    console.log(`${IAP_LOG_PREFIX} Purging legacy keys...`);
    
    try {
      for (const key of LEGACY_KEYS) {
        await AsyncStorage.removeItem(key);
      }
      
      // Also check for legacy premium=true without valid expiry
      const legacyPremium = await AsyncStorage.getItem('cloakr_premium');
      if (legacyPremium === 'true') {
        const legacyExpiry = await AsyncStorage.getItem('cloakr_premium_expires');
        if (!legacyExpiry || parseInt(legacyExpiry) <= Date.now()) {
          console.log(`${IAP_LOG_PREFIX} Found invalid legacy premium flag, clearing`);
          await AsyncStorage.removeItem('cloakr_premium');
          await AsyncStorage.removeItem('cloakr_premium_expires');
        }
      }
    } catch (error) {
      console.warn(`${IAP_LOG_PREFIX} Failed to purge legacy keys:`, error);
    }
  };

  /**
   * Fetch products and update price
   */
  const fetchProductsAndPrice = async (): Promise<void> => {
    try {
      const products = await fetchProducts();
      
      if (products.length > 0) {
        const cloakrProduct = products[0]; // Should be our target product
        setPrice(cloakrProduct.price);
        console.log(`${IAP_LOG_PREFIX} Updated price: ${cloakrProduct.price}`);
      }
    } catch (error) {
      console.error(`${IAP_LOG_PREFIX} Failed to fetch products:`, error);
    }
  };

  /**
   * Fetch remote config
   */
  const fetchRemoteConfig = async (): Promise<void> => {
    try {
      const response = await fetch('https://bobbyleu1.github.io/cloakr-remote-config/');
      const config: RemoteConfig = await response.json();
      
      // Update UI flags (never auto-grant premium)
      if (config.ui?.showManageSubscriptionsLink) {
        setShowManageLink(true);
      }
      
      console.log(`${IAP_LOG_PREFIX} Remote config loaded:`, {
        showManageLink: config.ui?.showManageSubscriptionsLink,
        premiumEnabled: config.featureFlags?.premiumModeEnabled,
      });
    } catch (error) {
      console.warn(`${IAP_LOG_PREFIX} Failed to fetch remote config:`, error);
    }
  };

  /**
   * Silent revalidation of cached premium status
   */
  const silentRevalidation = async (): Promise<void> => {
    console.log(`${IAP_LOG_PREFIX} Starting silent revalidation...`);
    
    try {
      const restoreResult = await restoreCloakr();
      
      if (restoreResult.restored && restoreResult.expiresDateMs) {
        // Server confirms active entitlement
        console.log(`${IAP_LOG_PREFIX} Silent revalidation: premium confirmed`);
        await saveCachedEntitlement(restoreResult.expiresDateMs);
        setExpiresDateMs(restoreResult.expiresDateMs);
        // Keep PREMIUM_ACTIVE status
      } else {
        // Server says not active, revert to FREE
        console.log(`${IAP_LOG_PREFIX} Silent revalidation: premium revoked`);
        setStatus('FREE');
        setExpiresDateMs(null);
        await clearCachedEntitlement();
      }
    } catch (error) {
      console.warn(`${IAP_LOG_PREFIX} Silent revalidation error, keeping current status:`, error);
    }
  };

  /**
   * Save cached entitlement
   */
  const saveCachedEntitlement = async (expiresMs: number): Promise<void> => {
    try {
      await AsyncStorage.setItem(CLOAKR_PREMIUM, 'true');
      await AsyncStorage.setItem(CLOAKR_EXPIRES_MS, expiresMs.toString());
      console.log(`${IAP_LOG_PREFIX} Cached entitlement expires: ${new Date(expiresMs).toISOString()}`);
    } catch (error) {
      console.warn(`${IAP_LOG_PREFIX} Failed to save cached entitlement:`, error);
    }
  };

  /**
   * Clear cached entitlement
   */
  const clearCachedEntitlement = async (): Promise<void> => {
    try {
      await AsyncStorage.removeItem(CLOAKR_PREMIUM);
      await AsyncStorage.removeItem(CLOAKR_EXPIRES_MS);
      console.log(`${IAP_LOG_PREFIX} Cleared cached entitlement`);
    } catch (error) {
      console.warn(`${IAP_LOG_PREFIX} Failed to clear cached entitlement:`, error);
    }
  };

  /**
   * Purchase subscription
   */
  const buy = useCallback(async (): Promise<void> => {
    if (loading) return;
    
    console.log(`${IAP_LOG_PREFIX} Context buy() called`);
    setLoading(true);

    try {
      // Ensure IAP is fully initialized before purchase attempt
      console.log(`${IAP_LOG_PREFIX} Ensuring IAP is ready before purchase...`);
      await initIAP();
      
      // Try to fetch products if not loaded
      if (!price || price === '$5.99') {
        console.log(`${IAP_LOG_PREFIX} Price not loaded, fetching products...`);
        await fetchProductsAndPrice();
      }

      console.log(`${IAP_LOG_PREFIX} Calling purchaseCloakr()...`);
      const result = await purchaseCloakr();
      console.log(`${IAP_LOG_PREFIX} purchaseCloakr() returned: ${result}`);

      if (result === 'PURCHASED') {
        console.log(`${IAP_LOG_PREFIX} Purchase successful, verifying with restore...`);
        
        // Double-check with restore to get expiry date
        const restoreResult = await restoreCloakr();
        
        if (restoreResult.restored && restoreResult.expiresDateMs) {
          setStatus('PREMIUM_ACTIVE');
          setExpiresDateMs(restoreResult.expiresDateMs);
          await saveCachedEntitlement(restoreResult.expiresDateMs);
          console.log(`${IAP_LOG_PREFIX} Premium activated successfully, expires: ${new Date(restoreResult.expiresDateMs).toISOString()}`);
        } else {
          console.warn(`${IAP_LOG_PREFIX} Purchase completed but restore verification failed:`, restoreResult);
          // Don't fail the purchase - the purchase listener validated it
          // Just set a default expiry
          const defaultExpiry = Date.now() + (30 * 24 * 60 * 60 * 1000); // 30 days
          setStatus('PREMIUM_ACTIVE');
          setExpiresDateMs(defaultExpiry);
          await saveCachedEntitlement(defaultExpiry);
        }
        
        // Success - don't throw
        return;
        
      } else if (result === 'CANCELLED') {
        console.log(`${IAP_LOG_PREFIX} Purchase cancelled by user`);
        throw new Error('CANCELLED');
        
      } else {
        console.error(`${IAP_LOG_PREFIX} Purchase failed with result: ${result}`);
        throw new Error('Purchase failed');
      }
      
    } catch (error) {
      console.error(`${IAP_LOG_PREFIX} Buy error:`, error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [loading]);

  /**
   * Restore purchases
   */
  const restore = useCallback(async (): Promise<void> => {
    if (loading) return;
    
    console.log(`${IAP_LOG_PREFIX} Starting restore...`);
    setLoading(true);

    try {
      const result = await restoreCloakr();
      console.log(`${IAP_LOG_PREFIX} Restore result:`, result);

      if (result.restored && result.expiresDateMs) {
        setStatus('PREMIUM_ACTIVE');
        setExpiresDateMs(result.expiresDateMs);
        await saveCachedEntitlement(result.expiresDateMs);
        console.log(`${IAP_LOG_PREFIX} Restore successful`);
      } else {
        // Ensure FREE status on failed restore
        setStatus('FREE');
        setExpiresDateMs(null);
        await clearCachedEntitlement();
        
        // Propagate specific error reason
        if (result.reason) {
          throw new Error(result.reason);
        }
        throw new Error('Restore failed');
      }
    } catch (error) {
      console.error(`${IAP_LOG_PREFIX} Restore error:`, error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [loading]);

  /**
   * Open manage subscriptions deep link
   */
  const openManageSubscriptions = useCallback((): void => {
    if (showManageLink) {
      console.log(`${IAP_LOG_PREFIX} Opening manage subscriptions`);
      Linking.openURL('itms-apps://apps.apple.com/account/subscriptions');
    }
  }, [showManageLink]);

  // Initialize on mount
  useEffect(() => {
    initialize();

    // Cleanup on unmount
    return () => {
      endIAP();
    };
  }, [initialize]);

  // Debug logging for status changes
  useEffect(() => {
    console.log(`${IAP_LOG_PREFIX} Status changed: ${status}, isPremium: ${isPremium}`);
    if (expiresDateMs) {
      console.log(`${IAP_LOG_PREFIX} Expires: ${new Date(expiresDateMs).toISOString()}`);
    }
    
    // Log diagnostics
    dumpDiagnostics();
  }, [status, isPremium, expiresDateMs]);

  const contextValue: EntitlementsContextType = {
    status,
    isPremium,
    price,
    loading,
    buy,
    restore,
    openManageSubscriptions: showManageLink ? openManageSubscriptions : () => {},
  };

  return (
    <EntitlementsContext.Provider value={contextValue}>
      {children}
    </EntitlementsContext.Provider>
  );
}

export function useEntitlements(): EntitlementsContextType {
  const context = useContext(EntitlementsContext);
  if (!context) {
    throw new Error('useEntitlements must be used within EntitlementsProvider');
  }
  return context;
}