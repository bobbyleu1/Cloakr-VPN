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

export const CLOAKR_IOS_PRODUCT_ID = 'cloakr.monthly.unlimited6';
export const IAP_LOG_PREFIX = '[IAPv2]';

export type EntitlementStatus = 'UNKNOWN' | 'FREE' | 'PREMIUM_ACTIVE' | 'EXPIRED';

export interface BackendValidationResponse {
  status: number | null;
  environment: 'sandbox' | 'production' | 'unknown';
  latestProductId: string | null;
  activeEntitlement: boolean;
  expiresDateMs: number | null;
  cancellationDateMs: number | null;
  isInBillingRetryPeriod: boolean;
  isInGracePeriod: boolean;
  validationEndpoint: 'production' | 'sandbox' | 'error';
  error?: string;
}

export interface ProductInfo {
  productId: string;
  title: string;
  price: string;
  subscriptionPeriod?: string;
}

// Internal state
let isConnected = false;
let iapReady = false;
let products: ProductInfo[] = [];
let purchaseListener: EmitterSubscription | null = null;
let errorListener: EmitterSubscription | null = null;
let activePurchaseResolver: ((result: 'PURCHASED' | 'CANCELLED' | 'FAILED') => void) | null = null;
let watchdogTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Initialize IAP connection and listeners (call once)
 */
export async function initIAP(): Promise<void> {
  if (Platform.OS !== 'ios') {
    console.log(`${IAP_LOG_PREFIX} Skipping iOS IAP on non-iOS platform`);
    return;
  }

  if (isConnected) {
    console.log(`${IAP_LOG_PREFIX} Already connected`);
    return;
  }

  try {
    console.log(`${IAP_LOG_PREFIX} Initializing IAP connection...`);
    await initConnection();
    isConnected = true;
    
    // Register listeners once
    setupListeners();
    
    console.log(`${IAP_LOG_PREFIX} IAP initialized successfully`);
  } catch (error) {
    console.error(`${IAP_LOG_PREFIX} Failed to initialize:`, error);
    throw error;
  }
}

/**
 * Setup purchase listeners (called once)
 */
function setupListeners(): void {
  if (purchaseListener || errorListener) {
    console.log(`${IAP_LOG_PREFIX} Listeners already registered`);
    return;
  }

  console.log(`${IAP_LOG_PREFIX} Registering purchase listeners...`);

  purchaseListener = purchaseUpdatedListener(async (purchase: Purchase) => {
    console.log(`${IAP_LOG_PREFIX} Purchase updated:`, {
      transactionId: purchase.transactionId,
      productId: purchase.productId,
      purchaseTime: purchase.transactionDate,
    });

    // Clear watchdog immediately since we got a response
    clearWatchdog();

    let shouldResolveAs: 'PURCHASED' | 'FAILED' = 'FAILED';

    try {
      // Only validate if it's our target product
      if (purchase.productId !== CLOAKR_IOS_PRODUCT_ID) {
        console.warn(`${IAP_LOG_PREFIX} Received purchase for unexpected product: ${purchase.productId}`);
        shouldResolveAs = 'FAILED';
      } else if (!purchase.transactionReceipt) {
        console.warn(`${IAP_LOG_PREFIX} No transaction receipt in purchase`);
        shouldResolveAs = 'FAILED';
      } else {
        // Validate receipt with backend
        console.log(`${IAP_LOG_PREFIX} Validating receipt with backend...`);
        const backendResult = await validateReceiptWithBackend(purchase.transactionReceipt);
        
        console.log(`${IAP_LOG_PREFIX} Backend validation result:`, {
          activeEntitlement: backendResult.activeEntitlement,
          latestProductId: backendResult.latestProductId,
          expiresDateMs: backendResult.expiresDateMs,
          environment: backendResult.environment,
        });

        // Success only if backend confirms active entitlement for our product
        if (backendResult.activeEntitlement && backendResult.latestProductId === CLOAKR_IOS_PRODUCT_ID) {
          shouldResolveAs = 'PURCHASED';
          console.log(`${IAP_LOG_PREFIX} Purchase validated successfully!`);
        } else {
          console.warn(`${IAP_LOG_PREFIX} Backend validation failed: activeEntitlement=${backendResult.activeEntitlement}, productId=${backendResult.latestProductId}`);
          shouldResolveAs = 'FAILED';
        }
      }

    } catch (validationError) {
      console.error(`${IAP_LOG_PREFIX} Receipt validation error:`, validationError);
      shouldResolveAs = 'FAILED';
    }

    // Always finish transaction to prevent duplicate prompts
    try {
      await finishTransaction({ purchase, isConsumable: false });
      console.log(`${IAP_LOG_PREFIX} Transaction finished successfully`);
    } catch (finishError) {
      console.error(`${IAP_LOG_PREFIX} Failed to finish transaction:`, finishError);
      // Still continue - don't fail the purchase because of finish issues
    }

    // Resolve purchase promise
    if (activePurchaseResolver) {
      activePurchaseResolver(shouldResolveAs);
      activePurchaseResolver = null;
    } else {
      console.warn(`${IAP_LOG_PREFIX} Purchase update received but no resolver waiting`);
    }
  });

  errorListener = purchaseErrorListener((error: PurchaseError) => {
    console.log(`${IAP_LOG_PREFIX} Purchase error:`, {
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

  console.log(`${IAP_LOG_PREFIX} Listeners registered successfully`);
}

/**
 * Cleanup IAP connection and listeners
 */
export function endIAP(): void {
  console.log(`${IAP_LOG_PREFIX} Ending IAP connection...`);

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
      console.warn(`${IAP_LOG_PREFIX} Error ending connection:`, error);
    });
    isConnected = false;
  }

  iapReady = false;
  products = [];
  console.log(`${IAP_LOG_PREFIX} IAP connection ended`);
}

/**
 * Fetch products from remote config with fallback
 */
export async function fetchProducts(): Promise<ProductInfo[]> {
  if (Platform.OS !== 'ios') {
    console.log(`${IAP_LOG_PREFIX} Non-iOS platform, returning empty products`);
    return [];
  }

  if (!isConnected) {
    await initIAP();
  }

  try {
    console.log(`${IAP_LOG_PREFIX} Fetching remote config...`);
    
    // Fetch remote config for product IDs
    let productIds = [CLOAKR_IOS_PRODUCT_ID]; // Fallback
    try {
      const response = await fetch('https://bobbyleu1.github.io/cloakr-remote-config/');
      const remoteConfig = await response.json();
      
      if (remoteConfig.ios?.activeProductIds?.length > 0) {
        productIds = remoteConfig.ios.activeProductIds;
        console.log(`${IAP_LOG_PREFIX} Using remote product IDs:`, productIds);
      } else {
        console.log(`${IAP_LOG_PREFIX} Using fallback product ID:`, productIds);
      }
    } catch (configError) {
      console.warn(`${IAP_LOG_PREFIX} Failed to fetch remote config:`, configError);
    }

    console.log(`${IAP_LOG_PREFIX} Fetching subscription products...`);
    const subscriptions = await getSubscriptions({ skus: productIds });
    
    products = subscriptions.map((sub: Subscription) => ({
      productId: sub.productId,
      title: (sub as any).title || 'Cloakr Unlimited',
      price: (sub as any).localizedPrice || '$5.99',
      subscriptionPeriod: (sub as any).subscriptionPeriod || '1 month',
    }));

    console.log(`${IAP_LOG_PREFIX} Fetched ${products.length} products:`, 
      products.map(p => `${p.productId}: ${p.price}`));

    iapReady = products.length > 0;
    return products;

  } catch (error) {
    console.error(`${IAP_LOG_PREFIX} Failed to fetch products:`, error);
    iapReady = false;
    return [];
  }
}

/**
 * Purchase Cloakr subscription with watchdog timeout
 */
export async function purchaseCloakr(): Promise<'PURCHASED' | 'CANCELLED' | 'FAILED'> {
  console.log(`${IAP_LOG_PREFIX} Starting purchase...`);
  console.log(`${IAP_LOG_PREFIX} IAP Ready: ${iapReady}, Products: ${products.length}, Listeners: ${!!(purchaseListener && errorListener)}`);

  // Ensure IAP is initialized
  if (!isConnected) {
    console.log(`${IAP_LOG_PREFIX} IAP not connected, initializing...`);
    await initIAP();
  }

  // Ensure products are loaded
  if (products.length === 0) {
    console.log(`${IAP_LOG_PREFIX} No products loaded, fetching...`);
    await fetchProducts();
  }

  // Final preconditions check
  if (!iapReady || products.length === 0) {
    console.error(`${IAP_LOG_PREFIX} IAP not ready: ready=${iapReady}, products=${products.length}`);
    return 'FAILED';
  }

  if (activePurchaseResolver) {
    console.error(`${IAP_LOG_PREFIX} Purchase already in progress`);
    return 'FAILED';
  }

  // Ensure listeners are setup
  if (!purchaseListener || !errorListener) {
    console.log(`${IAP_LOG_PREFIX} Listeners not setup, setting up now...`);
    setupListeners();
  }

  return new Promise<'PURCHASED' | 'CANCELLED' | 'FAILED'>((resolve) => {
    activePurchaseResolver = resolve;

    // Start 45s watchdog
    watchdogTimer = setTimeout(() => {
      console.warn(`${IAP_LOG_PREFIX} Purchase timed out after 45s`);
      if (activePurchaseResolver) {
        activePurchaseResolver('FAILED');
        activePurchaseResolver = null;
      }
    }, 45000);

    console.log(`${IAP_LOG_PREFIX} Requesting subscription for: ${CLOAKR_IOS_PRODUCT_ID}`);

    // Make purchase request
    requestSubscription({
      sku: CLOAKR_IOS_PRODUCT_ID,
      andDangerouslyFinishTransactionAutomaticallyIOS: false,
    }).then(() => {
      console.log(`${IAP_LOG_PREFIX} requestSubscription call completed, waiting for listeners...`);
    }).catch((error) => {
      console.error(`${IAP_LOG_PREFIX} requestSubscription failed immediately:`, error);
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
  console.log(`${IAP_LOG_PREFIX} Starting restore...`);

  if (Platform.OS !== 'ios') {
    return { restored: false, reason: 'NO_PURCHASES' };
  }

  if (!isConnected) {
    await initIAP();
  }

  try {
    const purchases = await getAvailablePurchases();
    console.log(`${IAP_LOG_PREFIX} Found ${purchases?.length || 0} available purchases`);

    if (!purchases || purchases.length === 0) {
      return { restored: false, reason: 'NO_PURCHASES' };
    }

    // Filter for target product
    const targetPurchases = purchases.filter(p => p.productId === CLOAKR_IOS_PRODUCT_ID);
    
    if (targetPurchases.length === 0) {
      console.log(`${IAP_LOG_PREFIX} No purchases found for ${CLOAKR_IOS_PRODUCT_ID}`);
      return { restored: false, reason: 'NO_PURCHASES' };
    }

    // Validate each purchase
    for (const purchase of targetPurchases) {
      console.log(`${IAP_LOG_PREFIX} Validating purchase:`, purchase.transactionId);

      try {
        // Get receipt data with fallback
        let receiptData = purchase.transactionReceipt;
        
        if (!receiptData) {
          console.log(`${IAP_LOG_PREFIX} No transactionReceipt, fetching current receipt...`);
          try {
            receiptData = await getReceiptIOS({ forceRefresh: true });
          } catch (receiptError) {
            console.warn(`${IAP_LOG_PREFIX} getReceiptIOS failed:`, receiptError);
            continue;
          }
        }

        if (!receiptData) {
          console.log(`${IAP_LOG_PREFIX} No receipt data available`);
          continue;
        }

        // Validate with backend
        const result = await validateReceiptWithBackend(receiptData);
        
        console.log(`${IAP_LOG_PREFIX} Backend validation:`, {
          activeEntitlement: result.activeEntitlement,
          latestProductId: result.latestProductId,
          expiresDateMs: result.expiresDateMs,
        });

        // Check for active entitlement
        if (result.activeEntitlement && result.latestProductId === CLOAKR_IOS_PRODUCT_ID) {
          console.log(`${IAP_LOG_PREFIX} Active entitlement found!`);
          return {
            restored: true,
            expiresDateMs: result.expiresDateMs || undefined,
          };
        }

      } catch (validationError) {
        console.error(`${IAP_LOG_PREFIX} Validation error:`, validationError);
        
        // Propagate network/server errors
        if (validationError instanceof Error) {
          if (validationError.message === 'NETWORK_ERROR') {
            return { restored: false, reason: 'NETWORK_ERROR' };
          }
          if (validationError.message === 'SERVER_ERROR') {
            return { restored: false, reason: 'SERVER_ERROR' };
          }
        }
      }
    }

    // No active entitlement found
    return { restored: false, reason: 'NOT_ACTIVE' };

  } catch (error) {
    console.error(`${IAP_LOG_PREFIX} Restore failed:`, error);
    return { restored: false, reason: 'SERVER_ERROR' };
  }
}

/**
 * Validate receipt with backend server
 */
export async function validateReceiptWithBackend(receiptBase64: string): Promise<BackendValidationResponse> {
  const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL;
  
  if (!backendUrl) {
    throw new Error('EXPO_PUBLIC_BACKEND_URL not configured');
  }

  const url = `${backendUrl}/api/verifyReceipt`;
  
  // Validate HTTPS in production
  if (!__DEV__ && !url.startsWith('https://')) {
    throw new Error('Backend URL must use HTTPS for production');
  }

  console.log(`${IAP_LOG_PREFIX} Validating receipt with backend...`);

  const maxRetries = 2;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`${IAP_LOG_PREFIX} Validation attempt ${attempt}/${maxRetries}`);
      
      // 10s timeout with AbortController
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            receiptData: receiptBase64,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          // Server error (5xx) - don't retry
          if (response.status >= 500) {
            throw new Error('SERVER_ERROR');
          }
          // Client error (4xx) - don't retry
          throw new Error(`HTTP ${response.status}`);
        }

        const result = await response.json();
        console.log(`${IAP_LOG_PREFIX} Backend response:`, {
          activeEntitlement: result.activeEntitlement,
          environment: result.environment,
          endpoint: result.validationEndpoint,
        });

        return result as BackendValidationResponse;

      } catch (fetchError) {
        clearTimeout(timeoutId);

        // Handle timeout and network errors
        if (fetchError instanceof Error && 
            (fetchError.name === 'AbortError' || fetchError instanceof TypeError)) {
          console.warn(`${IAP_LOG_PREFIX} Network error on attempt ${attempt}:`, fetchError.message);
          
          if (attempt === maxRetries) {
            throw new Error('NETWORK_ERROR');
          }
          continue; // Retry
        }

        // Other errors don't warrant retry
        throw fetchError;
      }

    } catch (error) {
      if (attempt === maxRetries) {
        if (error instanceof Error) {
          if (error.message === 'NETWORK_ERROR' || error.message === 'SERVER_ERROR') {
            throw error;
          }
        }
        throw new Error('SERVER_ERROR');
      }

      // Only retry network errors
      if (error instanceof Error && (
        error.message === 'NETWORK_ERROR' || 
        error instanceof TypeError ||
        error.name === 'AbortError'
      )) {
        console.warn(`${IAP_LOG_PREFIX} Retrying after error on attempt ${attempt}`);
        continue;
      }

      throw error;
    }
  }

  throw new Error('SERVER_ERROR');
}

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

  console.log(`${IAP_LOG_PREFIX} === DIAGNOSTICS ===`);
  console.log(`${IAP_LOG_PREFIX} Connected: ${diagnostics.connected}`);
  console.log(`${IAP_LOG_PREFIX} IAP Ready: ${diagnostics.iapReady}`);
  console.log(`${IAP_LOG_PREFIX} Listeners: ${diagnostics.listenersRegistered}`);
  console.log(`${IAP_LOG_PREFIX} Products: ${diagnostics.products.length} - ${diagnostics.products.join(', ')}`);
  console.log(`${IAP_LOG_PREFIX} Platform: ${diagnostics.platform}`);
  console.log(`${IAP_LOG_PREFIX} Purchase in progress: ${diagnostics.activePurchaseInProgress}`);
  console.log(`${IAP_LOG_PREFIX} Watchdog active: ${diagnostics.watchdogActive}`);
  console.log(`${IAP_LOG_PREFIX} === END DIAGNOSTICS ===`);

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