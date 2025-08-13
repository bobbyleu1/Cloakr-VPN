# 🔍 Debug: No Apple Purchase Sheet Appearing

## The Problem
The Apple native purchase dialog isn't showing up when you tap "Subscribe". This means `requestSubscription()` isn't triggering the iOS StoreKit purchase flow.

## 🚨 Most Common Causes & Fixes

### 1. **iOS Simulator Issue** 
**Problem:** iOS Simulator cannot make real purchases
**Fix:** Test on a **real iOS device** or TestFlight

```typescript
// Check if you're on simulator:
console.log('Platform:', Platform.OS);
console.log('Is Device:', !__DEV__ || Platform.OS !== 'ios');
```

### 2. **App Store Connect Setup**
**Problem:** Product not configured in App Store Connect
**Fix:** Ensure in App Store Connect:
- ✅ Subscription exists with ID `cloakr.monthly.unlimited6`
- ✅ Subscription is "Ready for Sale" 
- ✅ Pricing is set
- ✅ App bundle ID matches

### 3. **Test Account Issue**
**Problem:** Not signed in with Sandbox test account
**Fix:** In iOS Settings:
- Settings → App Store → Sandbox Account
- Sign out of production Apple ID
- Sign in with test account from App Store Connect

### 4. **react-native-iap Not Installed Properly**

Check if react-native-iap is properly linked:

```bash
# Check if installed:
npm list react-native-iap

# If missing, install:
npm install react-native-iap

# For iOS, run:
cd ios && pod install
```

## 🔧 Quick Debug Steps

### Step 1: Add Test Button
Add this temporary test button to your paywall to isolate the issue:

```typescript
// Add to PaywallV2.tsx temporarily:
const testIAP = async () => {
  console.log('=== IAP TEST START ===');
  
  try {
    // Test 1: Check IAP imports
    const { initIAP, fetchProducts, dumpDiagnostics } = await import('../iap/iapV2');
    console.log('✅ IAP imports work');
    
    // Test 2: Initialize
    await initIAP();
    console.log('✅ IAP initialized');
    
    // Test 3: Fetch products
    const products = await fetchProducts();
    console.log('✅ Products:', products);
    
    // Test 4: Diagnostics
    dumpDiagnostics();
    
    // Test 5: Direct requestSubscription test
    const { requestSubscription } = await import('react-native-iap');
    console.log('✅ About to call requestSubscription...');
    
    await requestSubscription({
      sku: 'cloakr.monthly.unlimited6',
      andDangerouslyFinishTransactionAutomaticallyIOS: false,
    });
    
    console.log('✅ requestSubscription called - sheet should appear now');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
};

// Add this button in your JSX:
<TouchableOpacity onPress={testIAP} style={{backgroundColor: 'red', padding: 20}}>
  <Text style={{color: 'white'}}>TEST IAP</Text>
</TouchableOpacity>
```

### Step 2: Check Console Output

When you tap the test button, you should see:

```
=== IAP TEST START ===
✅ IAP imports work
✅ IAP initialized
✅ Products: [{"productId": "cloakr.monthly.unlimited6", "price": "$5.99"}]
[IAPv2] === DIAGNOSTICS ===
[IAPv2] Connected: true
[IAPv2] IAP Ready: true
[IAPv2] Products: 1 - cloakr.monthly.unlimited6:$5.99
✅ About to call requestSubscription...
✅ requestSubscription called - sheet should appear now
```

**If Apple sheet appears:** The issue is in your purchase flow logic
**If no sheet appears:** The issue is with IAP setup or device/simulator

### Step 3: Common Error Messages

| Error Message | Cause | Fix |
|--------------|-------|-----|
| `"No products available"` | App Store Connect setup | Check product configuration |
| `"Cannot connect to iTunes Store"` | Simulator or network | Use real device with internet |
| `"Product ID invalid"` | Wrong product ID or not approved | Check App Store Connect |
| `"User not allowed to make payments"` | Restrictions enabled | Check Screen Time restrictions |
| `"E_IAP_NOT_AVAILABLE"` | StoreKit not available | Use real iOS device |

## 🎯 Most Likely Solution

**90% chance it's one of these:**

1. **Testing on iOS Simulator** → Switch to real device or TestFlight
2. **Not signed in with test account** → Use sandbox test account
3. **Product not "Ready for Sale"** → Check App Store Connect status

Try the test button above first - the console output will tell us exactly what's wrong!

## ⚡ Quick Environment Check

Run this in your app console:

```javascript
// Check platform and environment:
console.log('Platform:', Platform.OS);
console.log('Debug mode:', __DEV__);
console.log('Backend URL:', process.env.EXPO_PUBLIC_BACKEND_URL);

// Check react-native-iap:
import { initConnection } from 'react-native-iap';
initConnection().then(() => console.log('✅ RN-IAP works')).catch(e => console.log('❌ RN-IAP:', e));
```

This will tell us if it's a device, configuration, or code issue.