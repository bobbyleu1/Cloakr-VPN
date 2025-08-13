/**
 * Production-grade Apple Receipt Validation for Cloakr
 * 
 * Features:
 * - Production-first verification with 21007 fallback
 * - 10s timeout with AbortController  
 * - Normalized response structure
 * - Security: no raw receipt/secret logging
 * - Target product: cloakr.monthly.unlimited6
 */

// Apple endpoints
const APPLE_PRODUCTION_URL = 'https://buy.itunes.apple.com/verifyReceipt';
const APPLE_SANDBOX_URL = 'https://sandbox.itunes.apple.com/verifyReceipt';

// Target product ID
const CLOAKR_PRODUCT_ID = 'cloakr.monthly.unlimited6';

// Shared secret from environment
const APPLE_SHARED_SECRET = process.env.APPLE_SHARED_SECRET;

/**
 * Post to Apple with 10s timeout using AbortController
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
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Apple verification timeout after 10s');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Verify receipt with production-first approach
 */
async function verifyWithApple(receiptData) {
  if (!APPLE_SHARED_SECRET) {
    throw new Error('APPLE_SHARED_SECRET environment variable not set');
  }

  const payload = {
    'receipt-data': receiptData,
    'password': APPLE_SHARED_SECRET,
    'exclude-old-transactions': true,
  };

  console.log('[RECEIPT_V2] Trying production endpoint first...');
  console.log('[RECEIPT_V2] Receipt data length:', receiptData?.length || 0);

  // Try production first
  const prodResponse = await postToApple(APPLE_PRODUCTION_URL, payload);
  
  if (prodResponse.status === 21007) {
    console.log('[RECEIPT_V2] Status 21007 - sandbox receipt, retrying with sandbox...');
    const sandboxResponse = await postToApple(APPLE_SANDBOX_URL, payload);
    return {
      response: sandboxResponse,
      endpoint: 'sandbox',
    };
  }

  return {
    response: prodResponse,
    endpoint: 'production',
  };
}

/**
 * Process Apple response and extract subscription info
 */
function processAppleResponse(appleResponse, validationEndpoint) {
  const { status, environment, latest_receipt_info, pending_renewal_info } = appleResponse;
  const now = Date.now();

  console.log(`[RECEIPT_V2] Processing response: status=${status}, environment=${environment}, endpoint=${validationEndpoint}`);

  // Handle non-zero status codes
  if (status !== 0) {
    console.log(`[RECEIPT_V2] Non-zero status: ${status}`);
    return {
      status,
      environment: environment || 'unknown',
      latestProductId: null,
      activeEntitlement: false,
      expiresDateMs: null,
      cancellationDateMs: null,
      isInBillingRetryPeriod: false,
      isInGracePeriod: false,
      validationEndpoint,
      error: getStatusErrorMessage(status),
    };
  }

  // Status 0 - valid receipt, process subscription info
  if (!latest_receipt_info || latest_receipt_info.length === 0) {
    return {
      status,
      environment: environment || 'unknown',
      latestProductId: null,
      activeEntitlement: false,
      expiresDateMs: null,
      cancellationDateMs: null,
      isInBillingRetryPeriod: false,
      isInGracePeriod: false,
      validationEndpoint,
      error: 'No subscription information found in receipt',
    };
  }

  // Find transactions for target product
  const targetTransactions = latest_receipt_info.filter(
    item => item.product_id === CLOAKR_PRODUCT_ID
  );

  if (targetTransactions.length === 0) {
    console.log(`[RECEIPT_V2] No transactions found for ${CLOAKR_PRODUCT_ID}`);
    return {
      status,
      environment: environment || 'unknown',
      latestProductId: null,
      activeEntitlement: false,
      expiresDateMs: null,
      cancellationDateMs: null,
      isInBillingRetryPeriod: false,
      isInGracePeriod: false,
      validationEndpoint,
      error: 'No subscription found for target product',
    };
  }

  // Get the latest transaction by expires_date_ms
  const latestTransaction = targetTransactions.reduce((latest, current) => {
    const latestExpires = parseInt(latest.expires_date_ms || '0');
    const currentExpires = parseInt(current.expires_date_ms || '0');
    return currentExpires > latestExpires ? current : latest;
  });

  const expiresDateMs = parseInt(latestTransaction.expires_date_ms);
  const cancellationDateMs = latestTransaction.cancellation_date_ms ? 
    parseInt(latestTransaction.cancellation_date_ms) : null;

  console.log(`[RECEIPT_V2] Latest transaction:`, {
    productId: latestTransaction.product_id,
    expiresDateMs,
    cancellationDateMs,
    now,
  });

  // Check for pending renewal info
  const pendingRenewal = pending_renewal_info?.find(
    item => item.product_id === CLOAKR_PRODUCT_ID
  );

  const isInBillingRetryPeriod = pendingRenewal?.is_in_billing_retry_period === '1';
  const isInGracePeriod = pendingRenewal?.grace_period_expires_date_ms ? 
    parseInt(pendingRenewal.grace_period_expires_date_ms) > now : false;

  // Determine if subscription is active
  // Active if: not expired AND not cancelled
  const activeEntitlement = expiresDateMs > now && !cancellationDateMs;

  console.log(`[RECEIPT_V2] Entitlement result:`, {
    activeEntitlement,
    expired: expiresDateMs <= now,
    cancelled: !!cancellationDateMs,
    isInBillingRetryPeriod,
    isInGracePeriod,
  });

  return {
    status,
    environment: environment || validationEndpoint,
    latestProductId: latestTransaction.product_id,
    activeEntitlement,
    expiresDateMs,
    cancellationDateMs,
    isInBillingRetryPeriod,
    isInGracePeriod,
    validationEndpoint,
  };
}

/**
 * Get error message for Apple status codes
 */
function getStatusErrorMessage(status) {
  const statusMessages = {
    21000: 'The App Store could not read the JSON object you provided.',
    21002: 'The data in the receipt-data property was malformed or missing.',
    21003: 'The receipt could not be authenticated.',
    21004: 'The shared secret you provided does not match the shared secret on file.',
    21005: 'The receipt server is not currently available.',
    21006: 'This receipt is valid but the subscription has expired.',
    21007: 'This receipt is from the test environment.',
    21008: 'This receipt is from the production environment.',
    21009: 'Internal data access error.',
    21010: 'The user account cannot be found or has been deleted.',
  };

  return statusMessages[status] || `Unknown status code: ${status}`;
}

/**
 * Main receipt validation function
 */
async function validateReceipt(receiptData) {
  try {
    console.log('[RECEIPT_V2] Starting receipt validation...');
    
    // Verify with Apple
    const { response: appleResponse, endpoint } = await verifyWithApple(receiptData);
    
    // Process response
    const result = processAppleResponse(appleResponse, endpoint);
    
    console.log('[RECEIPT_V2] Validation complete:', {
      status: result.status,
      activeEntitlement: result.activeEntitlement,
      environment: result.environment,
      endpoint: result.validationEndpoint,
    });

    return result;

  } catch (error) {
    console.error('[RECEIPT_V2] Validation error:', error.message);
    return {
      status: null,
      environment: 'unknown',
      latestProductId: null,
      activeEntitlement: false,
      expiresDateMs: null,
      cancellationDateMs: null,
      isInBillingRetryPeriod: false,
      isInGracePeriod: false,
      validationEndpoint: 'error',
      error: 'Receipt validation failed',
    };
  }
}

/**
 * Express middleware for receipt validation endpoint
 */
function setupReceiptValidationEndpoint(app) {
  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'cloakr-receipt-validation-v2',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
    });
  });

  // Receipt validation endpoint
  app.post('/api/verifyReceipt', async (req, res) => {
    try {
      const { receiptData } = req.body;

      if (!receiptData) {
        return res.status(400).json({
          status: null,
          environment: 'unknown',
          latestProductId: null,
          activeEntitlement: false,
          expiresDateMs: null,
          cancellationDateMs: null,
          isInBillingRetryPeriod: false,
          isInGracePeriod: false,
          validationEndpoint: 'error',
          error: 'Receipt data is required',
        });
      }

      const result = await validateReceipt(receiptData);
      res.json(result);

    } catch (error) {
      console.error('[RECEIPT_V2] Middleware error:', error.message);
      res.status(500).json({
        status: null,
        environment: 'unknown',
        latestProductId: null,
        activeEntitlement: false,
        expiresDateMs: null,
        cancellationDateMs: null,
        isInBillingRetryPeriod: false,
        isInGracePeriod: false,
        validationEndpoint: 'error',
        error: 'Internal server error',
      });
    }
  });

  console.log('[RECEIPT_V2] Endpoints registered:');
  console.log('  GET  /health');
  console.log('  POST /api/verifyReceipt');
  console.log(`[RECEIPT_V2] Target product: ${CLOAKR_PRODUCT_ID}`);
  console.log(`[RECEIPT_V2] Shared secret configured: ${!!APPLE_SHARED_SECRET}`);
}

module.exports = {
  setupReceiptValidationEndpoint,
  validateReceipt,
};