# Migration to IAPv2 System

## Overview

This migration replaces the existing buggy IAP system with a fresh, production-grade subscription system that follows strict validation rules and never auto-grants premium access.

## Files to Remove/Stop Importing

**Delete or stop importing these legacy files:**

- `src/utils/iapManager.ts` 
- `src/context/PremiumContext_RNIap.tsx`
- `src/paywall/PaywallScreen_RNIap.tsx`
- Any files ending with `*_RNIap*`
- `backend/receiptValidation.js` (old version)

## New Files Structure

```
src/iap/
├── iapV2.ts                    # Core IAP singleton module
└── EntitlementsContext.tsx     # Premium state management

src/paywall/
└── PaywallV2.tsx              # New paywall UI

backend/
└── receiptValidation_v2.js     # Production-ready backend
```

## Code Changes Required

### 1. Replace Paywall Import

**Before:**
```typescript
import { PaywallScreenRNIap } from './src/paywall/PaywallScreen_RNIap';
```

**After:**
```typescript
import { PaywallV2 } from './src/paywall/PaywallV2';
```

### 2. Replace Context Provider

**Before:**
```typescript
import { PremiumProviderRNIap } from './src/context/PremiumContext_RNIap';

<PremiumProviderRNIap>
  <App />
</PremiumProviderRNIap>
```

**After:**
```typescript
import { EntitlementsProvider } from './src/iap/EntitlementsContext';

<EntitlementsProvider>
  <App />
</EntitlementsProvider>
```

### 3. Update Component Usage

**Before:**
```typescript
import { usePremium } from './src/context/PremiumContext_RNIap';

const { isPremium } = usePremium();
```

**After:**
```typescript
import { useEntitlements } from './src/iap/EntitlementsContext';

const { isPremium, status, buy, restore } = useEntitlements();
```

## Environment Variables

**Required for Production:**

```bash
# Client (Expo/EAS Build)
EXPO_PUBLIC_BACKEND_URL=https://your-backend-domain.com

# Backend (Node.js)
APPLE_SHARED_SECRET=your-app-specific-shared-secret-from-app-store-connect
NODE_ENV=production
```

**Important:** 
- Backend URL MUST use HTTPS in production (ATS requirement)
- Get shared secret from App Store Connect > App Information > App-Specific Shared Secret

## Database/Storage Migration

The new system automatically:

1. **Purges legacy keys** on first run:
   - `cloakr_premium_status`
   - `cloakr_premium` 
   - `premiumStatus`
   - Any other legacy premium flags

2. **Uses new storage keys:**
   - `cloakr_premium_v2` (boolean)
   - `cloakr_premium_expires_v2` (number, timestamp)

3. **Validates legacy cache:** If old premium=true without valid expiry > now, resets to FREE

## Backend Setup

### Express Server Example

```javascript
const express = require('express');
const { setupReceiptValidationEndpoint } = require('./receiptValidation_v2');

const app = express();

// Add JSON parsing and CORS
app.use(express.json({ limit: '10mb' }));
app.use(cors());

// Setup validation endpoints
setupReceiptValidationEndpoint(app);

app.listen(process.env.PORT || 3000, () => {
  console.log('Receipt validation server running');
});
```

### Required Dependencies

```bash
# No additional dependencies required for Node ≥18
# Uses built-in fetch + AbortController
```

## Testing Checklist

### ✅ Cold Launch Behavior
- [ ] App starts with `status: 'FREE'` 
- [ ] No automatic premium unlocking
- [ ] Premium only activated after successful backend validation

### ✅ Purchase Flow
- [ ] Shows localized price (never "undefined")
- [ ] Purchase sheet appears when Subscribe tapped
- [ ] Success → backend validates → premium unlocks
- [ ] Relaunching app preserves premium status

### ✅ Restore Flow  
- [ ] Without purchase → "No subscription found"
- [ ] With active subscription → premium unlocks
- [ ] With expired subscription → "No active subscription"
- [ ] Network error → "Connection error"
- [ ] Never calls finishTransaction during restore

### ✅ Error Handling
- [ ] User cancellation → no error dialog
- [ ] Network issues → appropriate error messages
- [ ] Server errors → "Server error, try again later"

### ✅ Backend Validation
- [ ] Logs show `endpoint: production|sandbox`
- [ ] Logs show `status: 0` for successful validations
- [ ] No raw receipts or secrets in logs
- [ ] Health endpoint returns 200 OK

### ✅ Legal Compliance
- [ ] Privacy Policy link works
- [ ] Terms of Use (Apple EULA) link works
- [ ] Manage Subscriptions deep link (if enabled in remote config)

## Production Deployment Steps

1. **Deploy Backend First**
   - Set `APPLE_SHARED_SECRET` environment variable
   - Deploy to HTTPS-enabled hosting (Heroku, Railway, Vercel, etc.)
   - Test health endpoint: `GET /health`

2. **Configure Client**
   - Set `EXPO_PUBLIC_BACKEND_URL` in EAS build environment
   - Ensure URL uses HTTPS

3. **Replace Imports**
   - Update all import statements to use new files
   - Remove legacy file imports

4. **Test in TestFlight**
   - Verify all acceptance tests pass
   - Check logs for `[IAPv2]` prefixed messages

## Key Differences from Legacy System

| Aspect | Legacy System | IAPv2 System |
|--------|---------------|--------------|
| **Premium Default** | Could auto-grant | Always starts FREE |
| **Validation** | Client-side only | Backend validation required |
| **Restore** | Local cache check | Server validation mandatory |
| **Error Handling** | Generic errors | Specific error reasons |
| **Timeout** | No timeout | 10s backend, 45s purchase |
| **Retry Logic** | None | Smart network retry |
| **Logging** | Minimal | Comprehensive with prefixes |
| **Storage** | Legacy keys | Versioned v2 keys |

## Rollback Plan

If issues arise, you can temporarily rollback by:

1. Reverting import statements to legacy files
2. Ensuring legacy files still exist in codebase
3. Backend can run both old and new endpoints simultaneously

However, **do not rollback** once users have been migrated to v2 storage keys, as this could cause premium status loss.

## Support

- All logs use `[IAPv2]` prefix for easy filtering
- Backend logs use `[RECEIPT_V2]` prefix
- Use `dumpDiagnostics()` for debugging IAP state
- Health endpoint provides service status