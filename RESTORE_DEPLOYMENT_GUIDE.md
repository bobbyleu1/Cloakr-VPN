# Restore Purchases - Production Deployment Guide

## ✅ Critical Fixes Implemented

### 1. Apple Environment Detection
- ✅ **Uses Apple's real `environment` field** instead of inferring from `is_trial_period`
- ✅ **Threads environment value through** from Apple response to client
- ✅ **Guaranteed accurate sandbox/production detection**

### 2. Explicit 21007 Fallback 
- ✅ **Production-first approach**: POST to production endpoint first
- ✅ **Explicit retry**: If status === 21007, POST to sandbox endpoint  
- ✅ **Guaranteed fallback**: No more missed sandbox receipts

### 3. Express Server Setup
- ✅ **JSON body parsing**: `app.use(express.json())`
- ✅ **CORS support**: Allows cross-origin requests
- ✅ **Health endpoints**: `/health` and `/api/health` for connectivity testing

### 4. HTTPS/ATS Compliance
- ✅ **HTTPS enforcement**: Backend URL must use HTTPS for TestFlight/production
- ✅ **ATS compatibility**: Meets iOS App Transport Security requirements
- ✅ **Environment validation**: Throws error if misconfigured

### 5. Payload Compatibility
- ✅ **Correct field names**: `receiptData` and `productIds` match backend expectations
- ✅ **Shared secret handling**: Backend uses env var, never from client
- ✅ **Error propagation**: Apple status codes logged for debugging

### 6. Null-Safety & Robustness
- ✅ **Grace period safety**: `pendingRenewal?.grace_period_expires_date_ms`
- ✅ **Billing retry safety**: `pendingRenewal?.is_in_billing_retry_period === '1' || false`
- ✅ **Comprehensive logging**: All validation steps logged with `[RECEIPT]` prefix

## 🚀 Production Deployment Steps

### Step 1: Backend Deployment

```bash
# 1. Install dependencies
npm install express cors node-fetch

# 2. Set environment variables
export APPLE_SHARED_SECRET="your-app-specific-shared-secret-from-app-store-connect"
export NODE_ENV="production"
export PORT=3000

# 3. Create server.js
const express = require('express');
const { setupReceiptValidationEndpoint } = require('./receiptValidation');

const app = express();
setupReceiptValidationEndpoint(app);

app.listen(process.env.PORT || 3000, () => {
  console.log(`Receipt validation server running on port ${process.env.PORT || 3000}`);
});

# 4. Deploy to your hosting provider (Heroku, Railway, etc.)
```

### Step 2: Client Configuration

```bash
# Set environment variable for your backend URL
export EXPO_PUBLIC_BACKEND_URL="https://your-backend-domain.com"
```

**In EAS Build (recommended):**
```json
// eas.json
{
  "build": {
    "production": {
      "env": {
        "EXPO_PUBLIC_BACKEND_URL": "https://your-backend-domain.com"
      }
    }
  }
}
```

### Step 3: Testing Endpoints

```bash
# Test health endpoint
curl https://your-backend-domain.com/health

# Expected response:
{
  "status": "ok",
  "service": "receipt-validation",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "environment": "production"
}
```

### Step 4: TestFlight Validation

1. **Deploy backend with HTTPS**
2. **Set EXPO_PUBLIC_BACKEND_URL** in build environment
3. **Test restore purchases** in TestFlight:
   - Active subscription → should restore immediately
   - Expired subscription → should show "No active subscription"
   - No purchases → should show "No subscription found"

## 🔍 Backend Response Format

```json
{
  "status": 0,
  "environment": "production",
  "latestProductId": "cloakr.monthly.unlimited6",
  "activeEntitlement": true,
  "expiresDateMs": 1735693200000,
  "cancellationDateMs": null,
  "isInBillingRetryPeriod": false,
  "isInGracePeriod": false,
  "validationEndpoint": "production",
  "appleStatus": 0
}
```

## 🧪 Testing Scenarios

### Active Subscription
```bash
# Should return activeEntitlement: true
curl -X POST https://your-backend.com/api/verifyReceipt \
  -H "Content-Type: application/json" \
  -d '{"receiptData":"base64-receipt","productIds":["cloakr.monthly.unlimited6"]}'
```

### Expired Subscription  
```bash
# Should return activeEntitlement: false
# expiresDateMs < Date.now()
```

### Sandbox Receipt
```bash
# Should automatically retry with sandbox endpoint
# environment: "sandbox"
# validationEndpoint: "sandbox"
```

## ⚠️ Production Checklist

- [ ] **Backend deployed with HTTPS**
- [ ] **APPLE_SHARED_SECRET configured**
- [ ] **EXPO_PUBLIC_BACKEND_URL set in build**
- [ ] **Health endpoint responds**
- [ ] **CORS enabled for your app domain**
- [ ] **TestFlight restore works for active subs**
- [ ] **TestFlight restore shows correct errors for expired/missing subs**
- [ ] **Logs show Apple environment detection**
- [ ] **Logs show production→sandbox fallback when needed**

## 🔧 Troubleshooting

### "Backend validation failed: HTTP 404"
- Check `EXPO_PUBLIC_BACKEND_URL` is set correctly
- Verify backend is deployed and running
- Test health endpoint first

### "Backend URL must use HTTPS"
- Ensure `EXPO_PUBLIC_BACKEND_URL` starts with `https://`
- iOS requires HTTPS for non-localhost URLs (ATS)

### "No response from purchase request"
- Check backend logs for errors
- Verify CORS is enabled
- Test health endpoint connectivity

### Apple status !== 0
- Status 21007: Sandbox receipt (should auto-retry)
- Status 21004: Wrong shared secret
- Status 21006: Receipt valid but subscription expired
- See Apple documentation for other status codes

## 📊 Success Metrics

After deployment, you should see:
- ✅ **100% restore button response rate** (success or specific error)
- ✅ **Accurate environment detection** in logs
- ✅ **Proper 21007 fallback** for sandbox receipts
- ✅ **No "no response" errors** in TestFlight
- ✅ **Clear error messages** for users

---

**The restore purchases system now uses Apple's real environment detection, guarantees 21007 fallback, and is production-ready with HTTPS/ATS compliance.**