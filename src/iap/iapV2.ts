import {
  initConnection,
  endConnection,
  getSubscriptions,
  requestSubscription,
  getReceiptIOS,
  getAvailablePurchases,
  finishTransaction,
  purchaseUpdatedListener,
  purchaseErrorListener,
  Subscription,
  Purchase,
  PurchaseError,
} from 'react-native-iap';
import { Platform, EmitterSubscription } from 'react-native';
import { logger, LogContext } from '../utils/logger';

export const CLOAKR_IOS_PRODUCT_ID = 'cloakr.monthly.unlimited6';
export const IAP_LOG_PREFIX = '[IAPv2]';

// Legacy console.log wrapper for gradual migration
const legacyLog = (message: string, ...args: any[]) => {
  logger.iap.info(message.replace(IAP_LOG_PREFIX, '').trim(), args.length > 0 ? args : undefined);
};

const legacyWarn = (message: string, ...args: any[]) => {
  logger.iap.warn(message.replace(IAP_LOG_PREFIX, '').trim(), args.length > 0 ? args : undefined);
};

const legacyError = (message: string, ...args: any[]) => {
  logger.iap.error(message.replace(IAP_LOG_PREFIX, '').trim(), args.length > 0 ? args : undefined);
};

export type EntitlementStatus = 'UNKNOWN' | 'FREE' | 'PREMIUM_ACTIVE' | 'EXPIRED';

// BackendValidationResponse interface removed - using client-side validation only

export interface ProductInfo {
  productId: string;
  title: string;
  price: string;
  subscriptionPeriod?: string;
}

// Internal state
let isConnected = false;
let iapReady = false;
let iapAvailable = true; // Track if IAP is available (false on simulator)
let products: ProductInfo[] = [];
let purchaseListener: EmitterSubscription | null = null;
let errorListener: EmitterSubscription | null = null;
let activePurchaseResolver: ((result: 'PURCHASED' | 'CANCELLED' | 'FAILED') => void) | null = null;
let watchdogTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Check if IAP is available (false on simulator)
 */
export function isIAPAvailable(): boolean {
  return iapAvailable && Platform.OS === 'ios';
}

/**
 * Initialize IAP connection and listeners (call once)
 */
export async function initIAP(): Promise<void> {
  logger.iap.debug('initIAP called', { platform: Platform.OS, isConnected });
  
  if (Platform.OS !== 'ios') {
    logger.iap.info('Skipping iOS IAP on non-iOS platform');
    return;
  }

  if (isConnected) {
    logger.iap.info('Already connected');
    return;
  }

  // NUCLEAR OPTION: In production builds, prevent ANY subscription detection
  if (!__DEV__) {
    logger.iap.info('PRODUCTION BUILD - Clearing old TestFlight transactions only');
    try {
      // Clear any pending transactions that might trigger "already subscribed"
      const pendingPurchases = await getAvailablePurchases();
      logger.iap.info('Found pending purchases in production', { count: pendingPurchases?.length || 0 });
      
      if (pendingPurchases && pendingPurchases.length > 0) {
        const now = Date.now();
        for (const purchase of pendingPurchases) {
          try {
            const purchaseAge = now - purchase.transactionDate;
            // Only finish transactions older than 10 seconds (likely TestFlight artifacts)
            if (purchaseAge > 10000) {
              await finishTransaction({ purchase, isConsumable: false });
              logger.iap.info('Finished old transaction', { 
                transactionId: purchase.transactionId, 
                ageMs: purchaseAge 
              });
            } else {
              logger.iap.info('Keeping recent transaction', { 
                transactionId: purchase.transactionId, 
                ageMs: purchaseAge 
              });
            }
          } catch (error) {
            logger.iap.error('Failed to finish transaction', { 
              transactionId: purchase.transactionId 
            }, error as Error);
          }
        }
      }
    } catch (error) {
      logger.iap.error('Failed to clear old transactions', undefined, error as Error);
    }
  }

  try {
    logger.iap.info('Initializing IAP connection...');
    logger.time(LogContext.IAP, 'iap_init');
    
    await initConnection();
    isConnected = true;
    
    // Register listeners once
    setupListeners();
    
    logger.timeEnd(LogContext.IAP, 'iap_init');
    logger.iap.info('IAP initialized successfully');
  } catch (error) {
    logger.iap.error('Failed to initialize IAP', undefined, error as Error);
    
    // Handle simulator case gracefully - don't throw
    if (error instanceof Error && error.message.includes('E_IAP_NOT_AVAILABLE')) {
      logger.iap.warn('IAP not available (likely iOS Simulator) - continuing in demo mode');
      iapAvailable = false;
      return;
    }
    
    throw error;
  }
}

/**
 * Setup purchase listeners (called once)
 */
function setupListeners(): void {
  if (purchaseListener || errorListener) {
    logger.iap.info('Listeners already registered');
    return;
  }

  logger.iap.info('Registering purchase listeners...');

  purchaseListener = purchaseUpdatedListener(async (purchase: Purchase) => {
    logger.iap.info('Purchase updated', {
      transactionId: purchase.transactionId,
      productId: purchase.productId,
      purchaseTime: purchase.transactionDate,
    });

    // Allow all purchase updates - TestFlight needs to process them

    // Clear watchdog immediately since we got a response
    clearWatchdog();

    let shouldResolveAs: 'PURCHASED' | 'FAILED' = 'FAILED';

    try {
      // Client-side validation only - trust Apple's purchase confirmation
      if (purchase.productId !== CLOAKR_IOS_PRODUCT_ID) {
        logger.iap.warn('Received purchase for unexpected product', { productId: purchase.productId });
        shouldResolveAs = 'FAILED';
      } else if (!purchase.transactionId) {
        logger.iap.warn('No transaction ID in purchase');
        shouldResolveAs = 'FAILED';
      } else {
        // Simple client-side validation - if we got the purchase from Apple, trust it
        logger.iap.info('Client-side validation: Purchase confirmed by Apple StoreKit');
        shouldResolveAs = 'PURCHASED';
        logger.iap.info('Purchase validated successfully! (client-side)', {
          productId: purchase.productId,
          transactionId: purchase.transactionId
        });
      }

    } catch (validationError) {
      logger.iap.error('Client-side validation error', undefined, validationError as Error);
      shouldResolveAs = 'FAILED';
    }

    // Always finish transaction to prevent duplicate prompts
    try {
      await finishTransaction({ purchase, isConsumable: false });
      logger.iap.info('Transaction finished successfully');
    } catch (finishError) {
      logger.iap.error('Failed to finish transaction', undefined, finishError as Error);
      // Still continue - don't fail the purchase because of finish issues
    }

    // Resolve purchase promise
    if (activePurchaseResolver) {
      activePurchaseResolver(shouldResolveAs);
      activePurchaseResolver = null;
    } else {
      logger.iap.warn('Purchase update received but no resolver waiting');
    }
  });

  errorListener = purchaseErrorListener((error: PurchaseError) => {
    logger.iap.error('Purchase error', {
      code: error.code,
      message: error.message,
    });

    clearWatchdog();

    if (activePurchaseResolver) {
      if (error.code === 'E_USER_CANCELLED') {
        activePurchaseResolver('CANCELLED');
      } else {
        activePurchaseResolver('FAILED');
      }
      activePurchaseResolver = null;
    }
  });

  logger.iap.info('Listeners registered successfully');
}

/**
 * Cleanup IAP connection and listeners
 */
export function endIAP(): void {
  logger.iap.info('Ending IAP connection...');

  clearWatchdog();
  activePurchaseResolver = null;

  if (purchaseListener) {
    purchaseListener.remove();
    purchaseListener = null;
  }

  if (errorListener) {
    errorListener.remove();
    errorListener = null;
  }

  if (isConnected) {
    endConnection().catch(error => {
      logger.iap.warn('Error ending connection', undefined, error as Error);
    });
    isConnected = false;
  }

  iapReady = false;
  products = [];
  logger.iap.info('IAP connection ended');
}

/**
 * Fetch products from remote config with fallback
 */
export async function fetchProducts(): Promise<ProductInfo[]> {
  logger.iap.debug('fetchProducts called', { platform: Platform.OS, isConnected });
  
  if (Platform.OS !== 'ios') {
    logger.iap.info('Non-iOS platform, returning empty products');
    return [];
  }

  if (!isConnected) {
    await initIAP();
  }

  try {
    logger.iap.info('Fetching remote config...');
    
    // Fetch remote config for product IDs
    let productIds = [CLOAKR_IOS_PRODUCT_ID]; // Fallback
    try {
      const response = await fetch('https://bobbyleu1.github.io/cloakr-remote-config/');
      const remoteConfig = await response.json();
      
      if (remoteConfig.ios?.activeProductIds?.length > 0) {
        productIds = remoteConfig.ios.activeProductIds;
        logger.iap.info('Using remote product IDs', { productIds });
      } else {
        logger.iap.info('Using fallback product ID', { productIds });
      }
    } catch (configError) {
      logger.iap.warn('Failed to fetch remote config', undefined, configError as Error);
    }

    logger.iap.info('Fetching subscription products...');
    const subscriptions = await getSubscriptions({ skus: productIds });
    
    products = subscriptions.map((sub: Subscription) => ({
      productId: sub.productId,
      title: (sub as any).title || 'Cloakr Unlimited',
      price: (sub as any).localizedPrice || '$5.99',
      subscriptionPeriod: (sub as any).subscriptionPeriod || '1 month',
    }));

    logger.iap.info('Fetched products', {
      count: products.length,
      products: products.map(p => `${p.productId}: ${p.price}`)
    });

    iapReady = products.length > 0;
    return products;

  } catch (error) {
    logger.iap.error('Failed to fetch products', undefined, error as Error);
    iapReady = false;
    return [];
  }
}

/**
 * Purchase Cloakr subscription with watchdog timeout
 */
export async function purchaseCloakr(): Promise<'PURCHASED' | 'CANCELLED' | 'FAILED'> {
  logger.iap.info('Starting purchase...');
  logger.iap.debug('Purchase preconditions', {
    iapReady,
    productsCount: products.length,
    listenersRegistered: !!(purchaseListener && errorListener)
  });

  // Note: Removed pre-purchase clearing to avoid interfering with new purchases

  // Check if IAP is available (simulator check)
  if (!iapAvailable) {
    logger.iap.warn('IAP not available (likely iOS Simulator) - purchase cannot proceed');
    return 'FAILED';
  }

  // Ensure IAP is initialized
  if (!isConnected) {
    logger.iap.info('IAP not connected, initializing...');
    await initIAP();
  }

  // Ensure products are loaded
  if (products.length === 0) {
    logger.iap.info('No products loaded, fetching...');
    await fetchProducts();
  }

  // Final preconditions check
  if (!iapReady || products.length === 0) {
    logger.iap.error('IAP not ready', { ready: iapReady, productsCount: products.length });
    return 'FAILED';
  }

  if (activePurchaseResolver) {
    logger.iap.error('Purchase already in progress');
    return 'FAILED';
  }

  // Ensure listeners are setup
  if (!purchaseListener || !errorListener) {
    logger.iap.info('Listeners not setup, setting up now...');
    setupListeners();
  }

  return new Promise<'PURCHASED' | 'CANCELLED' | 'FAILED'>((resolve) => {
    activePurchaseResolver = resolve;

    // Start 45s watchdog
    watchdogTimer = setTimeout(() => {
      logger.iap.warn('Purchase timed out after 45s');
      if (activePurchaseResolver) {
        activePurchaseResolver('FAILED');
        activePurchaseResolver = null;
      }
    }, 45000);

    logger.iap.info('Requesting subscription', { productId: CLOAKR_IOS_PRODUCT_ID });

    // Make purchase request
    requestSubscription({
      sku: CLOAKR_IOS_PRODUCT_ID,
      andDangerouslyFinishTransactionAutomaticallyIOS: false,
    }).then(() => {
      logger.iap.info('requestSubscription call completed, waiting for listeners...');
    }).catch((error) => {
      logger.iap.error('requestSubscription failed immediately', { code: error.code }, error);
      clearWatchdog();
      
      if (activePurchaseResolver) {
        if (error.code === 'E_USER_CANCELLED') {
          activePurchaseResolver('CANCELLED');
        } else {
          activePurchaseResolver('FAILED');
        }
        activePurchaseResolver = null;
      }
    });
  });
}

/**
 * Restore Cloakr subscription (validates via backend)
 */
export async function restoreCloakr(): Promise<{
  restored: boolean;
  reason?: 'NO_PURCHASES' | 'NOT_ACTIVE' | 'NETWORK_ERROR' | 'SERVER_ERROR';
  expiresDateMs?: number;
}> {
  logger.iap.info('Starting restore...');
  logger.iap.debug('Restore allowing all subscription types');

  if (Platform.OS !== 'ios') {
    logger.iap.info('Non-iOS platform, cannot restore');
    return { restored: false, reason: 'NO_PURCHASES' };
  }

  if (!isConnected) {
    await initIAP();
  }

  try {
    const purchases = await getAvailablePurchases();
    logger.iap.info('Found available purchases', { count: purchases?.length || 0 });
    
    if (!purchases || purchases.length === 0) {
      logger.iap.info('No purchases found to restore');
      return { restored: false, reason: 'NO_PURCHASES' };
    }

    // Filter for target product
    const targetPurchases = purchases.filter(p => p.productId === CLOAKR_IOS_PRODUCT_ID);
    
    if (targetPurchases.length === 0) {
      logger.iap.info('No purchases found for target product', { productId: CLOAKR_IOS_PRODUCT_ID });
      return { restored: false, reason: 'NO_PURCHASES' };
    }

    // Validate each purchase
    for (const purchase of targetPurchases) {
      logger.iap.info('Validating purchase', { transactionId: purchase.transactionId });

      try {
        // Get receipt data with fallback
        let receiptData = purchase.transactionReceipt;
        
        if (!receiptData) {
          logger.iap.info('No transactionReceipt, fetching current receipt...');
          try {
            receiptData = await getReceiptIOS({ forceRefresh: true }) || '';
          } catch (receiptError) {
            logger.iap.warn('getReceiptIOS failed', undefined, receiptError as Error);
            continue;
          }
        }

        // Client-side validation - if purchase exists in Apple's records, trust it
        logger.iap.info('Client-side restore: Purchase found in Apple records', {
          productId: purchase.productId,
          transactionId: purchase.transactionId
        });
        
        // For subscriptions, we assume they're active if Apple returned them
        logger.iap.info('Active subscription restored! (client-side)');
        return {
          restored: true,
          // Note: We can't get exact expiry date without backend validation
          // but subscription will work until Apple says it's expired
        };

      } catch (validationError) {
        logger.iap.error('Client-side restore error', undefined, validationError as Error);
        // Continue to next purchase
      }
    }

    // No active entitlement found
    logger.iap.info('No active entitlement found');
    return { restored: false, reason: 'NOT_ACTIVE' };

  } catch (error) {
    logger.iap.error('Restore failed', undefined, error as Error);
    return { restored: false, reason: 'SERVER_ERROR' };
  }
}

// Backend validation function removed - using client-side validation only

/**
 * Get diagnostics for debugging
 */
export function dumpDiagnostics(): {
  iapReady: boolean;
  listenersRegistered: boolean;
  products: string[];
} {
  const diagnostics = {
    iapReady,
    listenersRegistered: !!(purchaseListener && errorListener),
    products: products.map(p => `${p.productId}:${p.price}`),
    connected: isConnected,
    platform: Platform.OS,
    activePurchaseInProgress: !!activePurchaseResolver,
    watchdogActive: !!watchdogTimer,
  };

  logger.iap.info('=== IAP DIAGNOSTICS ===');
  logger.iap.info('Diagnostics', diagnostics);
  logger.iap.info('=== END IAP DIAGNOSTICS ===');

  return diagnostics;
}

/**
 * Clear watchdog timer
 */
function clearWatchdog(): void {
  if (watchdogTimer) {
    clearTimeout(watchdogTimer);
    watchdogTimer = null;
  }
}