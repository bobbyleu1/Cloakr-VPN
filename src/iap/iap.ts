// src/iap/iap.ts
import {Platform} from 'react-native';
import * as RNIap from 'react-native-iap';

export const CLOAKR_IOS_PRODUCT_ID = 'cloakr.monthly.unlimited6';
const LOG = '[IAP]';

type BackendValidationResponse = {
  status: number | null;
  environment: 'production' | 'sandbox' | 'unknown';
  latestProductId: string | null;
  activeEntitlement: boolean;
  expiresDateMs: number | null;
  cancellationDateMs: number | null;
  isInBillingRetryPeriod: boolean;
  isInGracePeriod: boolean;
  validationEndpoint: 'production' | 'sandbox' | 'error';
  error?: string;
};

let purchaseUpdateSub: RNIap.PurchaseUpdatedListener | null = null;
let purchaseErrorSub: RNIap.PurchaseErrorListener | null = null;
let pendingResolver:
  | ((v: { ok: boolean; reason?: string }) => void)
  | null = null;

let cachedPrice: string | null = null;

export async function initIAP() {
  if (Platform.OS !== 'ios') return;
  console.log(LOG, 'Initializing IAP connection...');
  await RNIap.initConnection();
  // Optional: small delay to allow StoreKit to be fully ready
  await new Promise((r) => setTimeout(r, 500));

  // Listeners (ONE set globally)
  if (!purchaseUpdateSub) {
    console.log(LOG, 'Setting up purchase update listener');
    purchaseUpdateSub = RNIap.purchaseUpdatedListener(async (purchase) => {
      console.log(LOG, 'Purchase updated:', purchase.productId, purchase.transactionId);
      try {
        // Only handle our product
        const pid =
          (purchase.productId as string) ??
          (purchase?.transactionReceipt ? CLOAKR_IOS_PRODUCT_ID : null);

        if (pid !== CLOAKR_IOS_PRODUCT_ID) {
          console.log(LOG, 'Not our product:', pid);
          // Not our SKU; finish just in case and ignore
          if (purchase.transactionReceipt) {
            await RNIap.finishTransaction(purchase, true);
          }
          return;
        }

        if (!purchase.transactionReceipt) {
          console.warn(LOG, 'No transaction receipt in purchase');
          // No receipt—this *can* happen, let the caller know
          if (pendingResolver) pendingResolver({ ok: false, reason: 'NO_RECEIPT' });
          return;
        }

        console.log(LOG, 'Validating receipt with backend...');
        // Validate on backend BEFORE unlocking
        const vr = await validateReceiptWithBackend(purchase.transactionReceipt);
        const ok = vr.activeEntitlement === true;
        console.log(LOG, 'Backend validation result:', { activeEntitlement: ok, environment: vr.environment });

        // Always finish the transaction once handled to avoid re-prompts
        await RNIap.finishTransaction(purchase, true);
        console.log(LOG, 'Transaction finished');

        if (pendingResolver) pendingResolver({ ok, reason: ok ? undefined : 'NOT_ACTIVE' });
      } catch (e: any) {
        console.warn(LOG, 'purchaseUpdated error', e?.message ?? e);
        // Best effort finish to clear queue
        try {
          await RNIap.finishTransaction(purchase, true);
        } catch {}
        if (pendingResolver) pendingResolver({ ok: false, reason: 'SERVER_ERROR' });
      } finally {
        pendingResolver = null;
      }
    });
  }

  if (!purchaseErrorSub) {
    console.log(LOG, 'Setting up purchase error listener');
    purchaseErrorSub = RNIap.purchaseErrorListener((e) => {
      console.log(LOG, 'Purchase error:', e.code, e.message);
      // User cancels or StoreKit error before any receipt exists
      if (pendingResolver) {
        const isCancel =
          e?.code === 'E_USER_CANCELLED' ||
          e?.code === 'E_USER_CANCELLED' ||
          e?.message?.toLowerCase?.().includes('cancel');
        pendingResolver({ ok: false, reason: isCancel ? 'CANCELLED' : 'FAILED' });
        pendingResolver = null;
      }
    });
  }
  
  console.log(LOG, 'IAP initialization complete');
}

export async function endIAP() {
  console.log(LOG, 'Ending IAP connection');
  purchaseUpdateSub?.remove?.();
  purchaseErrorSub?.remove?.();
  purchaseUpdateSub = null;
  purchaseErrorSub = null;
  try {
    await RNIap.endConnection();
  } catch {}
}

/** Load product + localized price for display */
export async function loadProductAndPrice(): Promise<{ price: string | null }> {
  if (Platform.OS !== 'ios') return { price: null };
  console.log(LOG, 'Loading product and price...');
  try {
    const products = await RNIap.getSubscriptions({ skus: [CLOAKR_IOS_PRODUCT_ID] } as any);
    console.log(LOG, 'Retrieved products:', products?.length || 0);
    const p =
      products?.find((x: any) => x.productId === CLOAKR_IOS_PRODUCT_ID) ?? products?.[0];
    cachedPrice = p?.localizedPrice ?? p?.price ?? null;
    console.log(LOG, 'Cached price:', cachedPrice);
    return { price: cachedPrice };
  } catch (e) {
    console.warn(LOG, 'getSubscriptions failed', e);
    return { price: null };
  }
}

/** Opens Apple's purchase sheet */
export async function purchaseSubscription(): Promise<
  'PURCHASED' | 'CANCELLED' | 'FAILED'
> {
  if (Platform.OS !== 'ios') return 'FAILED';
  console.log(LOG, 'Starting purchase flow...');
  
  // Ensure listeners + connection are ready
  await initIAP();

  // Guard: clean any stale resolver
  pendingResolver = null;

  // Start a promise that resolves when purchaseUpdatedListener fires
  const resultP = new Promise<{ ok: boolean; reason?: string }>((resolve) => {
    pendingResolver = resolve;
  });

  // RN-IAP param differs by version; most current builds accept { sku } on iOS.
  try {
    console.log(LOG, 'Requesting subscription for:', CLOAKR_IOS_PRODUCT_ID);
    await RNIap.requestSubscription({ sku: CLOAKR_IOS_PRODUCT_ID } as any);
    console.log(LOG, 'requestSubscription call completed, waiting for response...');
  } catch (e: any) {
    console.error(LOG, 'requestSubscription failed:', e);
    const msg = e?.message?.toLowerCase?.() ?? '';
    if (msg.includes('cancel')) return 'CANCELLED';
    return 'FAILED';
  }

  // Watchdog (45s) in case nothing comes back
  const watchdog = new Promise<{ ok: boolean; reason?: string }>((resolve) =>
    setTimeout(() => {
      console.warn(LOG, 'Purchase timed out after 45s');
      resolve({ ok: false, reason: 'TIMEOUT' });
    }, 45_000),
  );

  const { ok, reason } = await Promise.race([resultP, watchdog]);
  console.log(LOG, 'Purchase result:', { ok, reason });

  if (ok) return 'PURCHASED';
  if (reason === 'CANCELLED') return 'CANCELLED';
  return 'FAILED';
}

/** Restore purchases: validate receipt via backend, only unlock if active */
export async function restoreSubscription(): Promise<{
  restored: boolean;
  reason?: 'NO_PURCHASES' | 'NOT_ACTIVE' | 'NETWORK_ERROR' | 'SERVER_ERROR';
  expiresDateMs?: number;
}> {
  if (Platform.OS !== 'ios') return { restored: false, reason: 'NO_PURCHASES' };
  console.log(LOG, 'Starting restore flow...');
  await initIAP();

  try {
    const items = await RNIap.getAvailablePurchases();
    console.log(LOG, 'Available purchases:', items?.length || 0);
    
    // Try any item for our product; receipts can be empty here
    const mine = items?.find((i) => i.productId === CLOAKR_IOS_PRODUCT_ID);
    console.log(LOG, 'Found matching purchase:', !!mine);

    // Prefer per-item receipt, fallback to the device receipt
    let base64 = mine?.transactionReceipt ?? null;
    if (!base64) {
      console.log(LOG, 'No per-item receipt, trying device receipt...');
      try {
        base64 = await RNIap.getReceiptIOS({ forceRefresh: true });
      } catch {
        console.warn(LOG, 'Failed to get device receipt');
      }
    }
    if (!base64) {
      console.log(LOG, 'No receipt data available');
      return { restored: false, reason: 'NO_PURCHASES' };
    }

    console.log(LOG, 'Validating receipt with backend...');
    const vr = await validateReceiptWithBackend(base64);
    console.log(LOG, 'Restore validation result:', { 
      activeEntitlement: vr.activeEntitlement, 
      latestProductId: vr.latestProductId,
      expiresDateMs: vr.expiresDateMs 
    });
    
    if (vr.activeEntitlement) {
      return { restored: true, expiresDateMs: vr.expiresDateMs ?? undefined };
    }
    return { restored: false, reason: 'NOT_ACTIVE' };
  } catch (e: any) {
    console.error(LOG, 'Restore error:', e);
    const msg = e?.message ?? '';
    if (msg === 'NETWORK_ERROR') return { restored: false, reason: 'NETWORK_ERROR' };
    if (msg === 'SERVER_ERROR') return { restored: false, reason: 'SERVER_ERROR' };
    return { restored: false, reason: 'SERVER_ERROR' };
  }
}

/** HTTPS + timeout + one retry on network error */
async function validateReceiptWithBackend(
  receiptData: string,
): Promise<BackendValidationResponse> {
  const base = process.env.EXPO_PUBLIC_BACKEND_URL;
  console.log(LOG, 'Backend URL:', base);
  if (!base) throw new Error('SERVER_ERROR');
  const url = `${base.replace(/\/+$/, '')}/api/verifyReceipt`;
  if (!__DEV__ && !url.startsWith('https://')) {
    console.error(LOG, 'Backend must use HTTPS for production');
    throw new Error('SERVER_ERROR');
  }

  const tryOnce = async (): Promise<BackendValidationResponse> => {
    const controller = new AbortController();
    const to = setTimeout(() => controller.abort(), 10_000);
    try {
      console.log(LOG, 'Posting to backend:', url);
      const res = await fetch(url, {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiptData }),
      });
      
      console.log(LOG, 'Backend response status:', res.status);
      if (!res.ok) {
        // don't parse massive error pages—just map class
        if (res.status >= 500) throw new Error('SERVER_ERROR');
        throw new Error('SERVER_ERROR');
      }
      const json = (await res.json()) as BackendValidationResponse;
      console.log(LOG, 'Backend response:', { 
        activeEntitlement: json.activeEntitlement, 
        environment: json.environment, 
        status: json.status 
      });
      return json;
    } catch (e: any) {
      console.error(LOG, 'Backend request failed:', e.message);
      if (e?.name === 'AbortError') throw new Error('NETWORK_ERROR');
      if (e?.message === 'NETWORK_ERROR' || e instanceof TypeError) throw new Error('NETWORK_ERROR');
      throw e;
    } finally {
      clearTimeout(to);
    }
  };

  try {
    return await tryOnce();
  } catch (e: any) {
    if (e?.message === 'NETWORK_ERROR') {
      console.log(LOG, 'Network error, retrying once...');
      // one retry on network
      return await tryOnce();
    }
    throw e;
  }
}

/** Optional: open Apple's manage subscriptions */
export function openManageSubscriptions() {
  console.log(LOG, 'Opening manage subscriptions');
  RNIap.deepLinkToSubscriptionsIOS();
}

/** Helpers for UI */
export function getCachedPrice() {
  return cachedPrice;
}