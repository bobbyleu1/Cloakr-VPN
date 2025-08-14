/**
 * Supabase Edge Function: verify-receipt
 * Validates iOS App Store receipts for com.vroomstudios.cloakr
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const PROD_URL = "https://buy.itunes.apple.com/verifyReceipt";
const SANDBOX_URL = "https://sandbox.itunes.apple.com/verifyReceipt";
const EXPECTED_BUNDLE_ID = "com.vroomstudios.cloakr";

// For Apple review, detect if we should start with sandbox
function shouldUseSandboxFirst(): boolean {
  const forceEnv = Deno.env.get("APPLE_ENVIRONMENT");
  if (forceEnv === "sandbox") return true;
  if (forceEnv === "production") return false;
  
  // Auto-detect based on environment or other indicators
  const isReview = Deno.env.get("APPLE_REVIEW_MODE") === "true";
  const isDev = Deno.env.get("DENO_DEPLOYMENT_ID") === undefined;
  
  return isReview || isDev;
}

// CORS for all responses
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, Content-Type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...cors },
  });
}

function badRequest(msg: string) {
  return json({ ok: false, valid: false, status: -1, message: msg }, 200);
}

async function callApple(url: string, receiptData: string, sharedSecret: string) {
  const payload = {
    "receipt-data": receiptData,
    password: sharedSecret,
    "exclude-old-transactions": true,
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    if (!resp.ok) throw new Error(`Apple verifyReceipt HTTP ${resp.status}`);
    return await resp.json();
  } finally {
    clearTimeout(timeout);
  }
}

function parseEntitlement(appleJson: any, opts: { bundleId?: string; productIds?: string[] }) {
  const env = appleJson?.environment ?? "Unknown";
  const status = appleJson?.status;

  const receipt = appleJson?.receipt ?? {};
  if (opts.bundleId && receipt.bundle_id && receipt.bundle_id !== opts.bundleId) {
    return {
      ok: true, valid: false, environment: env, status,
      expiresAt: null, originalTransactionId: null, productId: null,
    };
  }

  const lineItems =
    (appleJson?.latest_receipt_info?.length ? appleJson.latest_receipt_info : receipt.in_app) || [];

  const filtered = lineItems.filter((item: any) =>
    opts.productIds?.length ? opts.productIds.includes(item.product_id) : true
  );

  filtered.sort((a: any, b: any) => {
    const ax = Number(a.expires_date_ms || a.purchase_date_ms || 0);
    const bx = Number(b.expires_date_ms || b.purchase_date_ms || 0);
    return bx - ax;
  });

  let valid = false;
  let expiresAt: string | null = null;
  let originalTransactionId: string | null = null;
  let productId: string | null = null;

  const latest = filtered[0];
  if (latest) {
    productId = latest.product_id ?? null;
    originalTransactionId = latest.original_transaction_id ?? null;

    const expMs = Number(latest.expires_date_ms || 0);
    if (expMs > 0) {
      expiresAt = new Date(expMs).toISOString();
      valid = Date.now() < expMs;
    } else {
      // Non-consumable: no expiry
      valid = true;
      expiresAt = null;
    }
  }

  return { ok: true, valid, environment: env, status, expiresAt, originalTransactionId, productId };
}

serve(async (req: Request): Promise<Response> => {
  // Preflight
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  // Health check
  if (req.method === "GET") return json({ ok: true, service: "cloakr-receipt-service" });

  // Only POST for verification
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json", ...cors },
    });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { receiptBase64, bundleId, productIds } = body as {
      receiptBase64?: string;
      bundleId?: string;
      productIds?: string[];
    };

    if (!receiptBase64 || typeof receiptBase64 !== "string" || receiptBase64.length < 20) {
      return badRequest("Missing or invalid receiptBase64");
    }

    // Bundle check (optional but recommended)
    if (bundleId && bundleId !== EXPECTED_BUNDLE_ID) {
      return badRequest(`Invalid bundleId. Expected: ${EXPECTED_BUNDLE_ID}`);
    }

    const appleKey = Deno.env.get("APPLE_KEY");
    if (!appleKey) {
      console.error("APPLE_KEY environment variable not set");
      return badRequest("Server misconfigured: APPLE_KEY not set");
    }

    // Production first (standard flow)
    let apple;
    const useSandboxFirst = shouldUseSandboxFirst();
    
    if (useSandboxFirst) {
      // Optional sandbox-first for Apple review
      console.log("[verify-receipt] Starting with sandbox (review mode)");
      apple = await callApple(SANDBOX_URL, receiptBase64, appleKey);
      
      // If sandbox fails with 21008 (production receipt in sandbox), try production
      if (apple?.status === 21008) {
        console.log("[verify-receipt] 21008 production fallback from sandbox");
        apple = await callApple(PROD_URL, receiptBase64, appleKey);
      } else {
        console.log("[verify-receipt] Sandbox status:", apple?.status);
      }
    } else {
      // Standard: production first
      console.log("[verify-receipt] Starting with production");
      apple = await callApple(PROD_URL, receiptBase64, appleKey);
      
      // If production fails with 21007 (sandbox receipt), retry with sandbox
      if (apple?.status === 21007) {
        console.log("[verify-receipt] 21007 sandbox fallback");
        apple = await callApple(SANDBOX_URL, receiptBase64, appleKey);
      } else {
        console.log("[verify-receipt] Production status:", apple?.status);
      }
    }

    const parsed = parseEntitlement(apple, {
      bundleId: bundleId ?? EXPECTED_BUNDLE_ID,
      productIds: Array.isArray(productIds) ? productIds : [],
    });

    // Return compact result + raw for debugging (optional)
    return json({ ...parsed, raw: apple });
  } catch (e: any) {
    const message = typeof e?.message === "string" ? e.message : "Unknown error";
    console.error("[verify-receipt] error:", message);
    return json({ ok: false, valid: false, status: -1, message });
  }
});
