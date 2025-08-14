import {
  initConnection,
  endConnection,
  getSubscriptions,
  requestSubscription,
  getReceiptIOS,
  getAvailablePurchases,
  getPendingPurchasesIOS,
  finishTransaction,
  purchaseUpdatedListener,
  purchaseErrorListener,
  Subscription,
  PurchaseError,
  Purchase,
} from 'react-native-iap';
import { Platform, EmitterSubscription } from 'react-native';
import { fetchRemoteConfig } from '../config/remoteConfig';

export interface PremiumProduct {
  productId: string;
  price: string;
  localizedPrice: string;
  title: string;
  description: string;
  currency: string;
}

export interface PurchaseResult {
  success: boolean;
  error?: string;
  cancelled?: boolean;
  receiptData?: string;
}

export interface DiagnosticsInfo {
  iapReady: boolean;
  canMakePayments: boolean | 'unknown';
  activeProductIds: string[];
  fetchedProducts: string[];
  listenersRegistered: boolean;
  storekitEnv: 'sandbox' | 'production' | 'unknown';
}

export interface RestoreResult {
  restored: boolean;
  reason?: 'NO_PURCHASES' | 'NOT_ACTIVE' | 'NETWORK_ERROR' | 'SERVER_ERROR';
  expiresDateMs?: number;
}

export interface BackendValidationResponse {
  ok: boolean;
  valid: boolean;
  environment: 'production' | 'sandbox';
  status: number;
  expiresAt: string | null;
  originalTransactionId: string | null;
  productId: string | null;
}


const IAP_ERRORS = {
  E_IAP_NOT_READY: 'E_IAP_NOT_READY',
  E_NO_PRODUCTS: 'E_NO_PRODUCTS', 
  E_CANNOT_PAY: 'E_CANNOT_PAY',
  E_IAP_TIMEOUT: 'E_IAP_TIMEOUT',
  E_MULTIPLE_REQUESTS: 'E_MULTIPLE_REQUESTS',
} as const;

export interface ReceiptValidationResult {
  isValid: boolean;
  isExpired: boolean;
  expirationDate?: Date;
  error?: string;
}

class IAPManager {
  private isConnected = false;
  private products: PremiumProduct[] = [];
  private subscriptions: Subscription[] = [];
  private iapReady = false;
  private canMakePayments: boolean | 'unknown' = 'unknown';
  private activeProductIds: string[] = [];
  private listenersRegistered = false;
  private purchaseUpdateSubscription: EmitterSubscription | null = null;
  private purchaseErrorSubscription: EmitterSubscription | null = null;
  private requestInFlight = false;
  private activePurchaseResolver: ((result: PurchaseResult) => void) | null = null;
  private activePurchaseRejecter: ((error: Error) => void) | null = null;
  private watchdogTimer: ReturnType<typeof setTimeout> | null = null;
  
  /**
   * Initialize IAP connection (idempotent)
   * Call this on app mount/component mount
   */
  async initialize(): Promise<void> {
    if (Platform.OS !== 'ios') {
      console.log('[IAP] Skipping iOS IAP on non-iOS platform');
      return;
    }
    
    if (this.isConnected) {
      console.log('[IAP] Connection already established');
      return;
    }
    
    try {
      console.log('[IAP] Initializing IAP connection...');
      const result = await initConnection();
      this.isConnected = true;
      console.log('[IAP] Connection established:', result);
      
      // Register listeners once after connection
      this.setupListeners();
      
      // Check StoreKit responsiveness
      try {
        const receipt = await getReceiptIOS({ forceRefresh: false });
        console.log('[IAP] StoreKit responsive, receipt length:', receipt?.length || 0);
      } catch (receiptError) {
        console.log('[IAP] StoreKit receipt check failed (ok if no purchases):', receiptError);
      }
    } catch (error) {
      console.error('[IAP] Failed to initialize connection:', error);
      throw error;
    }
  }

  /**
   * Ensure IAP is ready with all prerequisites
   */
  async ensureIapReady(): Promise<void> {
    console.log('[IAP] Ensuring IAP readiness...');
    
    if (Platform.OS !== 'ios') {
      console.log('[IAP] Non-iOS platform, marking ready');
      this.iapReady = true;
      return;
    }

    // Step 1: Initialize connection
    await this.initialize();
    
    // Step 2: Get active product IDs from remote config
    console.log('[IAP] Fetching active product IDs from remote config...');
    try {
      const remoteConfig = await fetchRemoteConfig();
      this.activeProductIds = remoteConfig.ios.activeProductIds;
      console.log('[IAP] Active product IDs:', this.activeProductIds);
    } catch (error) {
      console.warn('[IAP] Failed to fetch remote config, using fallback:', error);
      this.activeProductIds = ['cloakr.monthly.unlimited6'];
    }
    
    // Step 3: Fetch subscription products
    console.log('[IAP] Fetching subscription products for IDs:', this.activeProductIds);
    const subscriptions = await getSubscriptions({ skus: this.activeProductIds });
    console.log('[IAP] Raw subscriptions from App Store:', subscriptions);
    
    this.subscriptions = subscriptions || [];
    
    // Transform subscriptions to our interface
    this.products = this.subscriptions.map((sub: Subscription) => ({
      productId: sub.productId,
      price: (sub as any).price || '5.99',
      localizedPrice: (sub as any).localizedPrice || '$5.99',
      title: (sub as any).title || 'Cloakr Premium Monthly',
      description: (sub as any).description || 'Unlimited VPN access with no ads',
      currency: (sub as any).currency || 'USD',
    }));
    
    console.log('[IAP] Processed products count:', this.products.length);
    console.log('[IAP] Product SKUs:', this.products.map(p => p.productId));
    
    // Step 4: Check if device can make payments (feature not available in current version)
    this.canMakePayments = 'unknown';
    console.log('[IAP] Payment capability check skipped (not available in this version)');
    
    // Step 5: Mark ready if we have products and can pay
    this.iapReady = this.products.length > 0;
    console.log('[IAP] IAP ready status:', this.iapReady);
    
    if (!this.iapReady) {
      const reason = this.products.length === 0 ? 'no products' : 'cannot make payments';
      console.warn(`[IAP] IAP not ready: ${reason}`);
    }
  }
  
  /**
   * Setup purchase listeners (register once)
   */
  private setupListeners(): void {
    if (this.listenersRegistered) {
      console.log('[IAP] Listeners already registered');
      return;
    }
    
    console.log('[IAP] Registering purchase listeners...');
    
    this.purchaseUpdateSubscription = purchaseUpdatedListener((purchase: Purchase) => {
      console.log('[IAP] Purchase updated:', {
        transactionId: purchase.transactionId,
        productId: purchase.productId,
        transactionDate: purchase.transactionDate,
      });
      
      this.handlePurchaseUpdate(purchase);
    });
    
    this.purchaseErrorSubscription = purchaseErrorListener((error: PurchaseError) => {
      console.log('[IAP] Purchase error:', {
        code: error.code,
        message: error.message,
        debugMessage: error.debugMessage,
      });
      
      this.handlePurchaseError(error);
    });
    
    this.listenersRegistered = true;
    console.log('[IAP] Purchase listeners registered successfully');
  }
  
  /**
   * Handle purchase update from listener
   */
  private async handlePurchaseUpdate(purchase: Purchase): Promise<void> {
    try {
      // Clear watchdog timer
      this.clearWatchdog();
      
      // Validate receipt with Supabase backend
      let isValid = true;
      try {
        const receiptData = await getReceiptIOS({ forceRefresh: false });
        if (receiptData) {
          const validation = await this.validateReceiptWithBackend(receiptData);
          isValid = validation.ok && validation.valid;
          console.log('[IAP] Receipt validation result:', validation);
        }
      } catch (validationError) {
        console.warn('[IAP] Receipt validation failed:', validationError);
        isValid = false;
      }
      
      // Always finish transaction
      try {
        await finishTransaction({ purchase, isConsumable: false });
        console.log('[IAP] Transaction finished successfully');
      } catch (finishError) {
        console.error('[IAP] Failed to finish transaction:', finishError);
      }
      
      // Resolve active purchase promise
      if (this.activePurchaseResolver) {
        this.activePurchaseResolver({
          success: isValid,
          error: isValid ? undefined : 'Receipt validation failed',
          receiptData: purchase.transactionReceipt,
        });
        this.clearActivePurchase();
      }
    } catch (error) {
      console.error('[IAP] Error handling purchase update:', error);
      if (this.activePurchaseRejecter) {
        this.activePurchaseRejecter(error as Error);
        this.clearActivePurchase();
      }
    }
  }
  
  /**
   * Handle purchase error from listener
   */
  private handlePurchaseError(error: PurchaseError): void {
    // Clear watchdog timer
    this.clearWatchdog();
    
    let mappedError: PurchaseResult;
    
    if (error.code === 'E_USER_CANCELLED') {
      mappedError = { success: false, cancelled: true };
      console.log('[IAP] User cancelled purchase');
    } else {
      mappedError = {
        success: false,
        error: `Purchase failed: ${error.message}`,
      };
    }
    
    // Resolve active purchase promise
    if (this.activePurchaseResolver) {
      this.activePurchaseResolver(mappedError);
      this.clearActivePurchase();
    }
  }
  
  /**
   * Start watchdog timer for purchase timeout
   */
  private startWatchdog(): void {
    this.clearWatchdog();
    
    this.watchdogTimer = setTimeout(() => {
      console.log('[IAP][TIMEOUT] No purchase callback within 45s');
      
      if (this.activePurchaseResolver) {
        this.activePurchaseResolver({
          success: false,
          error: 'Store response timed out. Please try again.',
        });
        this.clearActivePurchase();
      }
    }, 45000); // 45 second timeout
  }
  
  /**
   * Clear watchdog timer
   */
  private clearWatchdog(): void {
    if (this.watchdogTimer) {
      clearTimeout(this.watchdogTimer);
      this.watchdogTimer = null;
    }
  }
  
  /**
   * Clear active purchase state
   */
  private clearActivePurchase(): void {
    this.activePurchaseResolver = null;
    this.activePurchaseRejecter = null;
    this.requestInFlight = false;
    this.clearWatchdog();
  }

  /**
   * Request Cloakr subscription with comprehensive safeguards
   */
  async requestCloakrSubscription(): Promise<PurchaseResult> {
    console.log('[IAP] Starting subscription request...');
    
    // Prevent multiple simultaneous requests
    if (this.requestInFlight) {
      console.warn('[IAP] Request already in flight');
      throw new Error(IAP_ERRORS.E_MULTIPLE_REQUESTS);
    }
    
    // Pre-condition checks
    if (!this.isIapReady()) {
      console.error('[IAP] IAP not ready for purchase');
      throw new Error(IAP_ERRORS.E_IAP_NOT_READY);
    }
    
    if (this.products.length === 0) {
      console.error('[IAP] No products available');
      throw new Error(IAP_ERRORS.E_NO_PRODUCTS);
    }
    
    if (this.canMakePayments === false) {
      console.error('[IAP] Device cannot make payments');
      throw new Error(IAP_ERRORS.E_CANNOT_PAY);
    }
    
    const targetSku = 'cloakr.monthly.unlimited6';
    console.log('[IAP] Requesting subscription for SKU:', targetSku);
    
    this.requestInFlight = true;
    
    return new Promise<PurchaseResult>((resolve, reject) => {
      this.activePurchaseResolver = resolve;
      this.activePurchaseRejecter = reject;
      
      // Start watchdog timer
      this.startWatchdog();
      
      // Make the purchase request
      requestSubscription({
        sku: targetSku,
        andDangerouslyFinishTransactionAutomaticallyIOS: false,
      }).catch((error) => {
        console.error('[IAP] requestSubscription failed:', error);
        this.clearActivePurchase();
        
        // Handle immediate errors from the request itself
        if (error.code === 'E_USER_CANCELLED') {
          resolve({ success: false, cancelled: true });
        } else {
          resolve({ success: false, error: `Request failed: ${error.message}` });
        }
      });
    });
  }
  
  /**
   * Legacy purchase method for backward compatibility
   */
  async purchaseProduct(productId: string): Promise<PurchaseResult> {
    // Ensure IAP is ready first
    try {
      await this.ensureIapReady();
    } catch (error) {
      console.error('[IAP] Failed to ensure IAP ready:', error);
      return { success: false, error: 'IAP initialization failed' };
    }
    
    return this.requestCloakrSubscription();
  }

  /**
   * Validate receipt with Apple servers
   * Implements Apple's recommended approach: try production first, then sandbox
   */
  private async validateReceipt(receiptData: string): Promise<ReceiptValidationResult> {
    const productionUrl = 'https://buy.itunes.apple.com/verifyReceipt';
    const sandboxUrl = 'https://sandbox.itunes.apple.com/verifyReceipt';
    
    try {
      // First try production environment
      console.log('Validating receipt against production environment...');
      let result = await this.validateReceiptAtUrl(receiptData, productionUrl);
      
      // If production returns status 21007 (sandbox receipt), try sandbox
      if (!result.isValid && result.error?.includes('21007')) {
        console.log('Sandbox receipt detected, validating against sandbox environment...');
        result = await this.validateReceiptAtUrl(receiptData, sandboxUrl);
      }
      
      return result;
    } catch (error) {
      console.error('Receipt validation error:', error);
      return {
        isValid: false,
        isExpired: true,
        error: 'Receipt validation failed'
      };
    }
  }

  /**
   * Validate receipt against a specific Apple URL
   */
  private async validateReceiptAtUrl(
    receiptData: string, 
    url: string
  ): Promise<ReceiptValidationResult> {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          'receipt-data': receiptData,
          'exclude-old-transactions': true
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      console.log(`Receipt validation response from ${url}:`, result.status);
      
      // Handle different status codes
      switch (result.status) {
        case 0: // Valid receipt
          return this.processValidReceipt(result);
        case 21007: // Sandbox receipt sent to production
          return {
            isValid: false,
            isExpired: true,
            error: '21007: Sandbox receipt sent to production'
          };
        default:
          return {
            isValid: false,
            isExpired: true,
            error: `Receipt validation failed with status: ${result.status}`
          };
      }
    } catch (error) {
      console.error(`Receipt validation failed at ${url}:`, error);
      return {
        isValid: false,
        isExpired: true,
        error: `Network error: ${(error as Error).message}`
      };
    }
  }

  /**
   * Process a valid receipt response from Apple
   */
  private processValidReceipt(result: any): ReceiptValidationResult {
    try {
      const latestReceiptInfo = result.latest_receipt_info || [];
      
      if (latestReceiptInfo.length === 0) {
        return {
          isValid: false,
          isExpired: true,
          error: 'No subscription information found'
        };
      }

      // Get the latest subscription info
      const latestSubscription = latestReceiptInfo[latestReceiptInfo.length - 1];
      const expirationDate = new Date(parseInt(latestSubscription.expires_date_ms));
      const now = new Date();
      
      return {
        isValid: true,
        isExpired: expirationDate < now,
        expirationDate
      };
    } catch (error) {
      return {
        isValid: false,
        isExpired: true,
        error: 'Failed to process receipt data'
      };
    }
  }

  /**
   * Check if user has active subscription
   * Call this on app startup to check subscription status
   */
  async checkSubscriptionStatus(validProductIds: string[]): Promise<boolean> {
    await this.initialize();
    
    try {
      if (Platform.OS === 'ios') {
        const receiptData = await getReceiptIOS({ forceRefresh: false });
        if (receiptData) {
          const validation = await this.validateReceipt(receiptData);
          return validation.isValid && !validation.isExpired;
        }
      }
      return false;
    } catch (error) {
      console.error('Failed to check subscription status:', error);
      return false;
    }
  }

  /**
   * Check if IAP is ready for purchases
   */
  isIapReady(): boolean {
    return this.iapReady;
  }
  
  /**
   * Get resolved products after ensureIapReady()
   */
  getResolvedProducts(): PremiumProduct[] {
    return this.products;
  }
  
  /**
   * Get cached products (legacy)
   */
  getCachedProducts(): PremiumProduct[] {
    return this.products;
  }
  
  /**
   * Get comprehensive diagnostics for debugging
   */
  dumpDiagnostics(): DiagnosticsInfo {
    let storekitEnv: 'sandbox' | 'production' | 'unknown' = 'unknown';
    
    // Try to determine environment from receipt or other indicators
    // This is best-effort and may not always be accurate
    try {
      // Could implement receipt parsing to detect environment
      storekitEnv = __DEV__ ? 'sandbox' : 'production';
    } catch {
      storekitEnv = 'unknown';
    }
    
    const diagnostics: DiagnosticsInfo = {
      iapReady: this.iapReady,
      canMakePayments: this.canMakePayments,
      activeProductIds: this.activeProductIds,
      fetchedProducts: this.products.map(p => p.productId),
      listenersRegistered: this.listenersRegistered,
      storekitEnv,
    };
    
    console.log('[IAP][DIAGNOSTICS]', diagnostics);
    return diagnostics;
  }
  
  /**
   * Clean up pending purchases on app launch
   */
  async cleanupPendingPurchases(): Promise<void> {
    if (Platform.OS !== 'ios') return;
    
    try {
      console.log('[IAP] Checking for pending purchases...');
      
      // Small delay to let the app settle
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const pendingPurchases = await getPendingPurchasesIOS();
      console.log('[IAP] Pending purchases found:', pendingPurchases?.length || 0);
      
      if (pendingPurchases && pendingPurchases.length > 0) {
        for (const purchase of pendingPurchases) {
          console.log('[IAP] Processing pending purchase:', purchase.productId);
          try {
            await finishTransaction({ purchase, isConsumable: false });
            console.log('[IAP] Finished pending transaction:', purchase.transactionId);
          } catch (error) {
            console.error('[IAP] Failed to finish pending transaction:', error);
          }
        }
      }
      
      // Also check available purchases
      const availablePurchases = await getAvailablePurchases();
      console.log('[IAP] Available purchases count:', availablePurchases?.length || 0);
      if (availablePurchases && availablePurchases.length > 0) {
        console.log('[IAP] Available purchase SKUs:', availablePurchases.map(p => p.productId));
      }
    } catch (error) {
      console.error('[IAP] Error during pending purchase cleanup:', error);
    }
  }
  
  /**
   * Restore purchases with proper backend validation
   * Returns detailed result with reason for any failures
   */
  async restorePurchases(): Promise<RestoreResult> {
    console.log('[IAP][RESTORE] Starting restore purchases...');
    
    if (Platform.OS !== 'ios') {
      console.log('[IAP][RESTORE] Non-iOS platform, skipping restore');
      return { restored: false, reason: 'NO_PURCHASES' };
    }
    
    try {
      // Ensure connection is initialized
      await this.initialize();
      
      console.log('[IAP][RESTORE] Fetching available purchases...');
      const purchases = await getAvailablePurchases();
      console.log('[IAP][RESTORE] Available purchases count:', purchases?.length || 0);
      
      if (!purchases || purchases.length === 0) {
        console.log('[IAP][RESTORE] No purchases found');
        return { restored: false, reason: 'NO_PURCHASES' };
      }
      
      // Filter to target product ID
      const targetProductId = 'cloakr.monthly.unlimited6';
      const matchingPurchases = purchases.filter(p => p.productId === targetProductId);
      
      console.log('[IAP][RESTORE] Matching purchases for', targetProductId, ':', matchingPurchases.length);
      
      if (matchingPurchases.length === 0) {
        console.log('[IAP][RESTORE] No purchases found for target product');
        return { restored: false, reason: 'NO_PURCHASES' };
      }
      
      // Validate each matching purchase with backend
      for (const purchase of matchingPurchases) {
        console.log('[IAP][RESTORE] Validating purchase:', purchase.transactionId);
        
        try {
          // Extract receipt payload with fallback to getReceiptIOS
          let receiptData = purchase.transactionReceipt;
          
          // If no transactionReceipt, try to get the current receipt with forceRefresh
          if (!receiptData && Platform.OS === 'ios') {
            console.log('[IAP][RESTORE] No transactionReceipt, fetching current receipt with forceRefresh...');
            try {
              receiptData = await getReceiptIOS({ forceRefresh: true });
            } catch (receiptError) {
              console.warn('[IAP][RESTORE] getReceiptIOS failed:', receiptError);
              continue;
            }
          }
          
          if (!receiptData) {
            console.log('[IAP][RESTORE] No receipt data available, skipping purchase');
            continue;
          }
          
          // Validate with backend
          const validationResult = await this.validateReceiptWithBackend(receiptData);
          
          console.log('[IAP][RESTORE] Backend validation result:', {
            ok: validationResult.ok,
            valid: validationResult.valid,
            productId: validationResult.productId,
            expiresAt: validationResult.expiresAt,
            environment: validationResult.environment
          });
          
          // Check if we have a valid entitlement for our target product
          if (validationResult.ok && validationResult.valid && 
              validationResult.productId === targetProductId) {
            console.log('[IAP][RESTORE] Active entitlement found! Restoring premium access');
            
            // Convert expiresAt ISO string to milliseconds if available
            let expiresDateMs: number | undefined;
            if (validationResult.expiresAt) {
              expiresDateMs = new Date(validationResult.expiresAt).getTime();
            }
            
            return { 
              restored: true, 
              expiresDateMs
            };
          }
          
        } catch (validationError) {
          console.error('[IAP][RESTORE] Validation error for purchase:', validationError);
          
          // If it's a specific backend error, propagate it up
          if (validationError instanceof Error && 
              (validationError.message === 'NETWORK_ERROR' || validationError.message === 'SERVER_ERROR')) {
            throw validationError;
          }
          
          // Continue to check other purchases for other errors
        }
      }
      
      // If we get here, no active entitlement was found
      console.log('[IAP][RESTORE] No active entitlement found');
      return { restored: false, reason: 'NOT_ACTIVE' };
      
    } catch (error) {
      console.error('[IAP][RESTORE] Restore purchases failed:', error);
      
      // Map specific error types
      if (error instanceof Error) {
        if (error.message === 'NETWORK_ERROR') {
          return { restored: false, reason: 'NETWORK_ERROR' };
        }
        if (error.message === 'SERVER_ERROR') {
          return { restored: false, reason: 'SERVER_ERROR' };
        }
      }
      
      // Default to server error for unexpected errors
      return { restored: false, reason: 'SERVER_ERROR' };
    }
  }
  
  /**
   * Validate receipt with our backend service with timeout and retry
   */
  private async validateReceiptWithBackend(receiptData: string): Promise<BackendValidationResponse> {
    // Use Supabase Edge Function for receipt verification
    const backendUrl = 'https://yhzvxiwxxpkcneqtbgeu.supabase.co/functions/v1/verify-receipt';
    
    console.log('[IAP][RESTORE] Validating receipt with backend:', backendUrl);
    
    // Validate HTTPS for non-dev environments
    if (!__DEV__ && !backendUrl.startsWith('https://')) {
      throw new Error('Backend URL must use HTTPS for TestFlight/production (ATS requirement)');
    }
    
    // Attempt validation with timeout and retry
    const maxRetries = 2;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[IAP][RESTORE] Validation attempt ${attempt}/${maxRetries}`);
        
        // Create AbortController for 10s timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        try {
          const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
          const headers: Record<string, string> = { 'Content-Type': 'application/json' };
          
          // Add Supabase auth header if available
          if (supabaseAnonKey) {
            headers['Authorization'] = `Bearer ${supabaseAnonKey}`;
          }
          
          const response = await fetch(backendUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              receiptBase64: receiptData, // Supabase function expects receiptBase64
              bundleId: 'com.vroomstudios.cloakr', // Bundle ID validation
              productIds: ['cloakr.monthly.unlimited6'] // Product IDs to validate
            }),
            signal: controller.signal,
          });
          
          clearTimeout(timeoutId);
          
          if (!response.ok) {
            const errorText = await response.text().catch(() => 'Unknown error');
            console.error('[IAP][RESTORE] Backend HTTP error:', response.status, errorText);
            
            // Server error (5xx) - throw as SERVER_ERROR, don't retry
            if (response.status >= 500) {
              throw new Error('SERVER_ERROR');
            }
            // Client error (4xx) - throw immediately, don't retry
            throw new Error(`Backend validation failed: HTTP ${response.status} - ${errorText}`);
          }
          
          const result = await response.json();
          console.log('[IAP][RESTORE] Supabase function response:', {
            ok: result.ok,
            valid: result.valid,
            environment: result.environment,
            status: result.status,
            expiresAt: result.expiresAt,
            productId: result.productId
          });
          
          // Log Apple status for debugging
          if (result.status !== 0) {
            console.warn(`[IAP][RESTORE] Apple validation status ${result.status} - see Apple docs for details`);
          }
          
          return result as BackendValidationResponse;
          
        } catch (fetchError) {
          clearTimeout(timeoutId);
          
          // Handle timeout
          if (fetchError instanceof Error && fetchError.name === 'AbortError') {
            console.warn(`[IAP][RESTORE] Backend timeout on attempt ${attempt}`);
            if (attempt === maxRetries) {
              throw new Error('NETWORK_ERROR');
            }
            continue; // Retry
          }
          
          // Handle network errors (TypeError typically indicates network issues)
          if (fetchError instanceof TypeError) {
            console.warn(`[IAP][RESTORE] Network error on attempt ${attempt}:`, fetchError.message);
            if (attempt === maxRetries) {
              throw new Error('NETWORK_ERROR');
            }
            continue; // Retry
          }
          
          // Other errors (don't retry)
          throw fetchError;
        }
        
      } catch (error) {
        // On final attempt, categorize the error
        if (attempt === maxRetries) {
          if (error instanceof Error) {
            if (error.message === 'SERVER_ERROR') {
              throw new Error('SERVER_ERROR');
            }
            if (error.message === 'NETWORK_ERROR') {
              throw new Error('NETWORK_ERROR');
            }
          }
          console.error('[IAP][RESTORE] Backend validation failed after retries:', error);
          throw new Error('SERVER_ERROR');
        }
        
        // On non-final attempts, only retry network errors
        if (error instanceof Error && (
          error.message === 'NETWORK_ERROR' || 
          error instanceof TypeError ||
          error.name === 'AbortError'
        )) {
          console.warn(`[IAP][RESTORE] Retrying after error on attempt ${attempt}:`, error.message);
          continue;
        }
        
        // Other errors don't warrant retry
        throw error;
      }
    }
    
    // This should never be reached
    throw new Error('SERVER_ERROR');
  }

  /**
   * Disconnect IAP connection and cleanup
   * Call this on app unmount/component unmount
   */
  async disconnect(): Promise<void> {
    console.log('[IAP] Disconnecting...');
    
    // Clear any active purchase state
    this.clearActivePurchase();
    
    // Remove listeners
    if (this.purchaseUpdateSubscription) {
      this.purchaseUpdateSubscription.remove();
      this.purchaseUpdateSubscription = null;
    }
    
    if (this.purchaseErrorSubscription) {
      this.purchaseErrorSubscription.remove();
      this.purchaseErrorSubscription = null;
    }
    
    this.listenersRegistered = false;
    
    // End connection
    if (this.isConnected) {
      try {
        await endConnection();
        this.isConnected = false;
        this.iapReady = false;
        console.log('[IAP] Connection ended successfully');
      } catch (error) {
        console.warn('[IAP] Failed to end connection:', error);
      }
    }
  }
}

// Export singleton instance
export const iapManager = new IAPManager();

// Export the restore purchases function for easy access
export async function restorePurchases(): Promise<RestoreResult> {
  return iapManager.restorePurchases();
}