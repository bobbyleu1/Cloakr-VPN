import { Platform } from 'react-native';
import { iapManager } from './iapManager';
import { logger } from './logger';

export interface PremiumProduct {
  productId: string;
  price: string;
  localizedPrice: string;
  title: string;
  description: string;
}

export interface PurchaseResult {
  success: boolean;
  error?: string;
  cancelled?: boolean;
}

class StoreKit {
  /**
   * Check current entitlements for the given product IDs
   */
  async checkCurrentEntitlements(productIds: string[]): Promise<boolean> {
    logger.iap.debug('Checking current entitlements', { productIds, platform: Platform.OS, isDev: __DEV__ });
    
    if (Platform.OS !== 'ios' || __DEV__) {
      logger.iap.info('Skipping entitlements check', { platform: Platform.OS, isDev: __DEV__ });
      return false;
    }

    try {
      const result = await iapManager.checkSubscriptionStatus(productIds);
      logger.iap.info('Entitlements check completed', { result });
      return result;
    } catch (error) {
      logger.iap.error('Failed to check entitlements', { productIds }, error as Error);
      return false;
    }
  }

  /**
   * Fetch products from the App Store
   */
  async fetchProducts(productIds: string[]): Promise<PremiumProduct[]> {
    logger.iap.debug('Fetching products', { productIds, platform: Platform.OS });
    
    if (Platform.OS !== 'ios') {
      logger.iap.info('Skipping product fetch on non-iOS platform');
      return [];
    }

    try {
      await iapManager.ensureIapReady();
      const products = iapManager.getResolvedProducts();
      logger.iap.info('Products fetched successfully', { count: products.length });
      return products;
    } catch (error) {
      logger.iap.error('Failed to fetch products', { productIds }, error as Error);
      return [];
    }
  }

  /**
   * Purchase a product
   */
  async purchaseProduct(productId: string): Promise<PurchaseResult> {
    logger.iap.info('Purchase product requested', { productId, platform: Platform.OS });
    
    if (Platform.OS !== 'ios') {
      logger.iap.warn('Purchase blocked on non-iOS platform');
      return { success: false, error: 'iOS only' };
    }

    try {
      const result = await iapManager.purchaseProduct(productId);
      logger.iap.info('Purchase result', { productId, success: result.success, cancelled: result.cancelled });
      return {
        success: result.success,
        error: result.error,
        cancelled: result.cancelled,
      };
    } catch (error) {
      logger.iap.error('Purchase failed', { productId }, error as Error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Purchase failed',
      };
    }
  }

  /**
   * Restore purchases
   */
  async restorePurchases(): Promise<boolean> {
    logger.iap.info('Restore purchases requested', { platform: Platform.OS });
    
    if (Platform.OS !== 'ios') {
      logger.iap.warn('Restore blocked on non-iOS platform');
      return false;
    }

    try {
      const result = await iapManager.restorePurchases();
      logger.iap.info('Restore result', { restored: result.restored });
      return result.restored;
    } catch (error) {
      logger.iap.error('Restore failed', undefined, error as Error);
      return false;
    }
  }
}

// Export singleton instance
export const storeKit = new StoreKit();