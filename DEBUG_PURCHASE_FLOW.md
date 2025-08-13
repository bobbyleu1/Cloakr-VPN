# 🔍 Purchase Flow Debug Guide

Since you **did see the Apple purchase sheet**, the core IAP is working. The issue is likely in the purchase completion flow.

## 🚨 Quick Fixes to Try

### 1. **Check Your Backend URL**
The purchase might be failing at backend validation. In your console, run:

```javascript
// In React Native debugger console:
console.log('Backend URL:', process.env.EXPO_PUBLIC_BACKEND_URL);
```

**It must be:**
- ✅ Set to your actual backend URL
- ✅ Using HTTPS (not HTTP) for TestFlight/production
- ✅ Accessible (try the /health endpoint in a browser)

### 2. **Enable Verbose Logging**
Add this to your app temporarily to see exactly what's happening:

```typescript
// In your purchase handler, add this before calling buy():
import { dumpDiagnostics } from '../iap/iapV2';

const handlePurchase = async () => {
  // Add this debug line:
  dumpDiagnostics();
  
  // Then your existing purchase code:
  await buy();
};
```

### 3. **Check Console for These Logs**

When you tap purchase, you should see:

```
[IAPv2] === DIAGNOSTICS ===
[IAPv2] Connected: true
[IAPv2] IAP Ready: true  
[IAPv2] Listeners: true
[IAPv2] Products: 1 - cloakr.monthly.unlimited6:$5.99
[IAPv2] Platform: ios
[IAPv2] Purchase in progress: false
[IAPv2] Watchdog active: false
[IAPv2] === END DIAGNOSTICS ===

[IAPv2] Starting purchase...
[IAPv2] Requesting subscription for: cloakr.monthly.unlimited6
[IAPv2] requestSubscription call completed, waiting for listeners...

// After you complete purchase in Apple sheet:
[IAPv2] Purchase updated: { transactionId: "...", productId: "cloakr.monthly.unlimited6" }
[IAPv2] Validating receipt with backend...
[IAPv2] Backend response: { activeEntitlement: true, environment: "sandbox" }
[IAPv2] Purchase validated successfully!
```

## 📋 Troubleshooting Scenarios

### **Scenario A: No "Purchase updated" log**
```
// You see this:
[IAPv2] Starting purchase...
[IAPv2] Requesting subscription for: cloakr.monthly.unlimited6
[IAPv2] requestSubscription call completed, waiting for listeners...

// But never see "Purchase updated" - 45s timeout occurs
[IAPv2] Purchase timed out after 45s
```

**Fix:** Listeners aren't working. Try force-restarting the app.

### **Scenario B: "Backend validation error"**
```
[IAPv2] Purchase updated: { ... }
[IAPv2] Validating receipt with backend...
[IAPv2] Receipt validation error: Network error / Server error
```

**Fix:** Backend issue. Check:
- Is `EXPO_PUBLIC_BACKEND_URL` set correctly?
- Is your backend running and accessible?
- Try hitting `https://your-backend.com/health` in browser

### **Scenario C: "Backend validation failed"**
```
[IAPv2] Purchase updated: { ... }
[IAPv2] Backend validation result: { activeEntitlement: false, latestProductId: null }
```

**Fix:** Backend isn't finding the subscription. Check:
- Is `APPLE_SHARED_SECRET` set in backend?
- Backend logs should show Apple validation status

## 🔧 Emergency Bypass for Testing

If you need to test the UI flow while debugging backend, temporarily modify the purchase listener:

```typescript
// TEMPORARY - for debugging only!
// In purchaseUpdatedListener, replace the backend validation with:

console.log(`${IAP_LOG_PREFIX} BYPASSING backend validation for testing`);
shouldResolveAs = 'PURCHASED'; // Force success
```

**⚠️ REMOVE THIS BEFORE PRODUCTION!**

## 🎯 Most Likely Issue

Based on "no response", it's probably:

1. **Backend URL not set** - Check `process.env.EXPO_PUBLIC_BACKEND_URL`
2. **Backend not running** - Try `https://your-backend.com/health`
3. **HTTPS issue** - Backend must use HTTPS for TestFlight
4. **Apple shared secret** - Backend needs `APPLE_SHARED_SECRET` env var

## 💡 Quick Test Commands

```bash
# Test backend health:
curl https://your-backend-url.com/health

# Should return:
# {"status":"ok","service":"cloakr-receipt-validation-v2"}

# Test if backend URL is set in app:
# In React Native debugger console:
console.log(process.env.EXPO_PUBLIC_BACKEND_URL);
```

Run `dumpDiagnostics()` first and share the output - that will tell us exactly what's wrong!