/**
 * Backend Receipt Validation for iOS In-App Purchases
 * 
 * This Node.js module handles receipt validation with Apple's servers
 * following Apple's recommended approach for production apps.
 * 
 * SECURITY NOTE: This code should run on your backend server only.
 * Never include your shared secret in client-side code.
 */

const fetch = require('node-fetch'); // npm install node-fetch
const { AbortController } = require('abort-controller'); // npm install abort-controller

// Configuration
const APPLE_PRODUCTION_URL = 'https://buy.itunes.apple.com/verifyReceipt';
const APPLE_SANDBOX_URL = 'https://sandbox.itunes.apple.com/verifyReceipt';

// Server-side product allowlist - never trust client input for this
const ALLOWED_PRODUCT_IDS = ['cloakr.monthly.unlimited6'];

// IMPORTANT: Get this from App Store Connect > App Information > App-Specific Shared Secret
// Store this securely in environment variables, never in code
const SHARED_SECRET = process.env.APPLE_SHARED_SECRET || 'your-shared-secret-here';

/**
 * Normalize response shape to ensure consistent boolean types
 */
function normalizeResponse(response) {
  return {
    status: response.status ?? null,
    environment: response.environment || 'unknown',
    latestProductId: response.latestProductId || null,
    activeEntitlement: !!response.activeEntitlement,
    expiresDateMs: response.expiresDateMs ?? null,
    cancellationDateMs: response.cancellationDateMs ?? null,
    isInBillingRetryPeriod: !!response.isInBillingRetryPeriod,
    isInGracePeriod: !!response.isInGracePeriod,
    validationEndpoint: response.validationEndpoint || 'error',
    ...(response.error && { error: response.error }),
    // Include any additional fields
    ...Object.keys(response).reduce((acc, key) => {
      if (!['status', 'environment', 'latestProductId', 'activeEntitlement', 
           'expiresDateMs', 'cancellationDateMs', 'isInBillingRetryPeriod', 
           'isInGracePeriod', 'validationEndpoint', 'error'].includes(key)) {
        acc[key] = response[key];
      }
      return acc;
    }, {})
  };
}

/**
 * Verify receipt with Apple servers using production-first approach
 */
async function verifyWithApple(receiptData, sharedSecret) {
  const payload = {
    'receipt-data': receiptData,
    'password': sharedSecret,
    'exclude-old-transactions': true
  };
  
  console.log('[RECEIPT] Trying production endpoint first...');
  const prodResponse = await postToApple(APPLE_PRODUCTION_URL, payload);
  
  if (prodResponse.status === 21007) {
    console.log('[RECEIPT] Status 21007 - sandbox receipt, retrying with sandbox endpoint...');
    const sandboxResponse = await postToApple(APPLE_SANDBOX_URL, payload);
    return {
      json: sandboxResponse,
      endpoint: 'sandbox'
    };
  }
  
  return {
    json: prodResponse,
    endpoint: 'production'
  };
}

/**
 * Post to Apple verification endpoint with real timeout using AbortController
 */
async function postToApple(url, payload) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Apple verifyReceipt timeout after 10s');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function validateIOSReceipt(receiptData, validProductIds = []) {
  try {
    console.log('[RECEIPT] Starting receipt validation...');
    console.log('[RECEIPT] Receipt data length:', receiptData?.length || 0);
    
    // Use server allowlist instead of client-provided productIds
    const serverProductIds = ALLOWED_PRODUCT_IDS;
    console.log('[RECEIPT] Server product allowlist:', serverProductIds);
    
    // Step 1: Verify with Apple using production-first approach
    const { json: appleResponse, endpoint: usedEndpoint } = await verifyWithApple(receiptData, SHARED_SECRET);
    
    console.log(`[RECEIPT] Apple response from ${usedEndpoint}:`, {
      status: appleResponse.status,
      environment: appleResponse.environment
    });
    
    // Step 2: Process the validation result with Apple's environment
    const appleEnv = appleResponse.environment?.toLowerCase() || usedEndpoint;
    const result = processValidationResult(appleResponse, serverProductIds, appleEnv);
    
    // Step 3: Add metadata
    result.validationEndpoint = usedEndpoint;
    result.appleStatus = appleResponse.status;
    
    console.log('[RECEIPT] Final validation result:', {
      activeEntitlement: result.activeEntitlement,
      latestProductId: result.latestProductId,
      environment: result.environment,
      endpoint: usedEndpoint,
      appleStatus: appleResponse.status,
      expiresDateMs: result.expiresDateMs,
      cancellationDateMs: result.cancellationDateMs,
      isInBillingRetryPeriod: result.isInBillingRetryPeriod,
      isInGracePeriod: result.isInGracePeriod
    });
    
    return result;
    
  } catch (error) {
    console.error('[RECEIPT] Receipt validation error:', error.message);
    return normalizeResponse({
      status: null,
      environment: 'unknown',
      latestProductId: null,
      activeEntitlement: false,
      expiresDateMs: null,
      cancellationDateMs: null,
      isInBillingRetryPeriod: false,
      isInGracePeriod: false,
      validationEndpoint: 'error',
      error: 'Receipt validation failed'
    });
  }
}

/**
 * Process Apple's validation response
 */
function processValidationResult(appleResponse, validProductIds, appleEnvironment) {
  const { status, receipt, latest_receipt_info, pending_renewal_info } = appleResponse;
  
  console.log(`[RECEIPT] Processing validation result with status: ${status}`);
  
  switch (status) {
    case 0: // Valid receipt
      console.log('[RECEIPT] Receipt is valid, processing subscription info...');
      return processValidReceipt(latest_receipt_info, validProductIds, pending_renewal_info, appleEnvironment);
      
    case 21000:
      return normalizeResponse({ 
        status, 
        environment: 'unknown',
        latestProductId: null,
        activeEntitlement: false,
        expiresDateMs: null,
        cancellationDateMs: null,
        isInBillingRetryPeriod: false,
        isInGracePeriod: false,
        validationEndpoint: 'error',
        error: 'The App Store could not read the JSON object you provided.' 
      });
      
    case 21002:
      return normalizeResponse({ 
        status, 
        environment: 'unknown',
        latestProductId: null,
        activeEntitlement: false,
        expiresDateMs: null,
        cancellationDateMs: null,
        isInBillingRetryPeriod: false,
        isInGracePeriod: false,
        validationEndpoint: 'error',
        error: 'The data in the receipt-data property was malformed or missing.' 
      });
      
    case 21003:
      return normalizeResponse({ 
        status, 
        environment: 'unknown',
        latestProductId: null,
        activeEntitlement: false,
        expiresDateMs: null,
        cancellationDateMs: null,
        isInBillingRetryPeriod: false,
        isInGracePeriod: false,
        validationEndpoint: 'error',
        error: 'The receipt could not be authenticated.' 
      });
      
    case 21004:
      return normalizeResponse({ 
        status, 
        environment: 'unknown',
        latestProductId: null,
        activeEntitlement: false,
        expiresDateMs: null,
        cancellationDateMs: null,
        isInBillingRetryPeriod: false,
        isInGracePeriod: false,
        validationEndpoint: 'error',
        error: 'The shared secret you provided does not match the shared secret on file for your account.' 
      });
      
    case 21005:
      return normalizeResponse({ 
        status, 
        environment: 'unknown',
        latestProductId: null,
        activeEntitlement: false,
        expiresDateMs: null,
        cancellationDateMs: null,
        isInBillingRetryPeriod: false,
        isInGracePeriod: false,
        validationEndpoint: 'error',
        error: 'The receipt server is not currently available.' 
      });
      
    case 21006:
      console.log('[RECEIPT] Receipt valid but subscription expired');
      return normalizeResponse({ 
        status, 
        environment: 'unknown',
        latestProductId: null,
        activeEntitlement: false,
        expiresDateMs: null,
        cancellationDateMs: null,
        isInBillingRetryPeriod: false,
        isInGracePeriod: false,
        validationEndpoint: 'error',
        error: 'This receipt is valid but the subscription has expired.' 
      });
      
    case 21007:
      return normalizeResponse({ 
        status, 
        environment: appleEnvironment || 'sandbox',
        latestProductId: null,
        activeEntitlement: false,
        expiresDateMs: null,
        cancellationDateMs: null,
        isInBillingRetryPeriod: false,
        isInGracePeriod: false,
        validationEndpoint: 'error',
        error: 'This receipt is from the test environment, but it was sent to the production environment for verification.' 
      });
      
    case 21008:
      return normalizeResponse({ 
        status, 
        environment: 'production',
        latestProductId: null,
        activeEntitlement: false,
        expiresDateMs: null,
        cancellationDateMs: null,
        isInBillingRetryPeriod: false,
        isInGracePeriod: false,
        validationEndpoint: 'error',
        error: 'This receipt is from the production environment, but it was sent to the test environment for verification.' 
      });
      
    case 21009:
      return normalizeResponse({ 
        status, 
        environment: 'unknown',
        latestProductId: null,
        activeEntitlement: false,
        expiresDateMs: null,
        cancellationDateMs: null,
        isInBillingRetryPeriod: false,
        isInGracePeriod: false,
        validationEndpoint: 'error',
        error: 'Internal data access error.' 
      });
      
    case 21010:
      return normalizeResponse({ 
        status, 
        environment: 'unknown',
        latestProductId: null,
        activeEntitlement: false,
        expiresDateMs: null,
        cancellationDateMs: null,
        isInBillingRetryPeriod: false,
        isInGracePeriod: false,
        validationEndpoint: 'error',
        error: 'The user account cannot be found or has been deleted.' 
      });
      
    default:
      console.error(`[RECEIPT] Unknown Apple validation status: ${status}`);
      return normalizeResponse({ 
        status, 
        environment: 'unknown',
        latestProductId: null,
        activeEntitlement: false,
        expiresDateMs: null,
        cancellationDateMs: null,
        isInBillingRetryPeriod: false,
        isInGracePeriod: false,
        validationEndpoint: 'error',
        error: `Unknown validation status: ${status}` 
      });
  }
}

/**
 * Process a valid receipt and extract subscription information
 */
function processValidReceipt(latestReceiptInfo, validProductIds, pendingRenewalInfo, appleEnvironment) {
  if (!latestReceiptInfo || latestReceiptInfo.length === 0) {
    return normalizeResponse({
      status: 0,
      environment: 'unknown',
      latestProductId: null,
      activeEntitlement: false,
      expiresDateMs: null,
      cancellationDateMs: null,
      isInBillingRetryPeriod: false,
      isInGracePeriod: false,
      validationEndpoint: 'error',
      error: 'No subscription information found in receipt'
    });
  }

  // Find subscriptions for valid product IDs (focus on target product)
  const targetProductId = 'cloakr.monthly.unlimited6';
  const validSubscriptions = latestReceiptInfo.filter(item => 
    validProductIds.length === 0 || validProductIds.includes(item.product_id)
  );

  if (validSubscriptions.length === 0) {
    return normalizeResponse({
      status: 0,
      environment: 'unknown',
      latestProductId: null,
      activeEntitlement: false,
      expiresDateMs: null,
      cancellationDateMs: null,
      isInBillingRetryPeriod: false,
      isInGracePeriod: false,
      validationEndpoint: 'error',
      error: 'No valid subscription products found in receipt'
    });
  }

  // Get the most recent subscription by expires_date_ms
  const latestSubscription = validSubscriptions.reduce((latest, current) => {
    const latestExpires = parseInt(latest.expires_date_ms || '0');
    const currentExpires = parseInt(current.expires_date_ms || '0');
    return currentExpires > latestExpires ? current : latest;
  });

  // Extract subscription details
  const expiresDateMs = parseInt(latestSubscription.expires_date_ms);
  const cancellationDateMs = latestSubscription.cancellation_date_ms ? 
    parseInt(latestSubscription.cancellation_date_ms) : null;
  const now = Date.now();
  
  console.log(`[RECEIPT] Processing subscription:`, {
    productId: latestSubscription.product_id,
    expiresDateMs,
    cancellationDateMs,
    now,
    originalTransactionId: latestSubscription.original_transaction_id
  });

  // Check for pending renewal information
  const pendingRenewal = pendingRenewalInfo && pendingRenewalInfo.find(
    item => item.product_id === latestSubscription.product_id
  );

  // Safe null handling for billing retry and grace period
  const isInBillingRetryPeriod = pendingRenewal?.is_in_billing_retry_period === '1' || false;
  const isInGracePeriod = pendingRenewal?.grace_period_expires_date_ms ? 
    parseInt(pendingRenewal.grace_period_expires_date_ms) > now : false;
  
  // Determine if subscription is active
  // Active if: not expired AND not cancelled
  const activeEntitlement = expiresDateMs && expiresDateMs > now && !cancellationDateMs;
  
  console.log(`[RECEIPT] Subscription status:`, {
    activeEntitlement,
    expiresDateMs,
    cancellationDateMs,
    isInBillingRetryPeriod,
    isInGracePeriod
  });

  // Use Apple's environment field directly (no inference needed)
  const environment = appleEnvironment || 'unknown';

  return normalizeResponse({
    status: 0,
    environment,
    latestProductId: latestSubscription.product_id,
    activeEntitlement,
    expiresDateMs,
    cancellationDateMs,
    isInBillingRetryPeriod,
    isInGracePeriod,
    validationEndpoint: 'success',
    // Legacy fields for backward compatibility
    isValid: true,
    isActive: activeEntitlement,
    productId: latestSubscription.product_id,
    originalTransactionId: latestSubscription.original_transaction_id,
    expirationDate: new Date(expiresDateMs).toISOString(),
    isExpired: !activeEntitlement,
    autoRenewEnabled: pendingRenewal ? pendingRenewal.auto_renew_status === '1' : false,
    purchaseDate: new Date(parseInt(latestSubscription.purchase_date_ms)).toISOString()
  });
}

/**
 * Express.js middleware for receipt validation
 */
async function validateReceiptMiddleware(req, res) {
  try {
    const { receiptData } = req.body;
    
    if (!receiptData) {
      return res.status(400).json(normalizeResponse({
        status: null,
        environment: 'unknown',
        latestProductId: null,
        activeEntitlement: false,
        expiresDateMs: null,
        cancellationDateMs: null,
        isInBillingRetryPeriod: false,
        isInGracePeriod: false,
        validationEndpoint: 'error',
        error: 'Receipt data is required'
      }));
    }

    // Ignore client-supplied productIds, use server allowlist
    const validationResult = await validateIOSReceipt(receiptData, ALLOWED_PRODUCT_IDS);
    
    // Enhanced logging for debugging
    console.log('[RECEIPT] Middleware validation result:', {
      isValid: validationResult.isValid,
      isActive: validationResult.isActive || false,
      productId: validationResult.productId || 'none',
      endpoint: validationResult.validationEndpoint || 'unknown',
      appleStatus: validationResult.appleStatus || 'unknown'
    });
    
    res.json(validationResult);
    
  } catch (error) {
    console.error('[RECEIPT] Receipt validation middleware error:', error.message);
    res.status(500).json(normalizeResponse({
      status: null,
      environment: 'unknown',
      latestProductId: null,
      activeEntitlement: false,
      expiresDateMs: null,
      cancellationDateMs: null,
      isInBillingRetryPeriod: false,
      isInGracePeriod: false,
      validationEndpoint: 'error',
      error: 'Internal server error'
    }));
  }
}

/**
 * Health check endpoint for connectivity testing
 */
function healthCheckMiddleware(req, res) {
  res.json({
    status: 'ok',
    service: 'receipt-validation',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
}

// Example usage with Express.js
function setupReceiptValidationEndpoint(app) {
  // CORS support for cross-origin requests
  const cors = require('cors');
  app.use(cors({ 
    origin: true, // Allow all origins - tighten for production
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));
  
  // JSON body parser for request payload
  app.use(require('express').json({ limit: '10mb' }));
  
  // Health check endpoint
  app.get('/health', healthCheckMiddleware);
  app.get('/api/health', healthCheckMiddleware);
  
  // Receipt validation endpoints
  app.post('/api/validate-receipt', validateReceiptMiddleware);
  app.post('/api/verifyReceipt', validateReceiptMiddleware); // Alternative endpoint name
  
  console.log('Receipt validation service endpoints:');
  console.log('  GET  /health - Health check');
  console.log('  GET  /api/health - Health check');
  console.log('  POST /api/validate-receipt - Receipt validation');
  console.log('  POST /api/verifyReceipt - Receipt validation');
  console.log('Expected request body: { "receiptData": "base64-string", "productIds": ["product.id"] }');
  console.log('CORS enabled for all origins');
}

module.exports = {
  validateIOSReceipt,
  validateReceiptMiddleware,
  setupReceiptValidationEndpoint,
  healthCheckMiddleware,
  verifyWithApple,
  postToApple,
  normalizeResponse,
  ALLOWED_PRODUCT_IDS
};