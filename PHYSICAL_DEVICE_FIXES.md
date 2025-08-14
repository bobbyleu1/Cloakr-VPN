# Physical Device IAP Issues - IMMEDIATE FIXES NEEDED

Based on the errors you're seeing on your physical device, here are the **immediate fixes** required:

## ✅ **Backend Server is Running Successfully**
Your backend server is already running on `http://localhost:3000` and the app is configured to use it.

## ❌ **Issue 1: Missing Apple Shared Secret**

### **Problem**
The error `EXPO_PUBLIC_BACKEND_URL not configured` is actually resolved, but the **Apple Shared Secret** is missing.

### **Fix Steps**
1. **Go to App Store Connect** → https://appstoreconnect.apple.com
2. **Navigate to**: Your App → App Information → App-Specific Shared Secret
3. **Copy the secret** (it looks like: `1a2b3c4d5e6f7g8h9i0j`)
4. **Update the `.env` file**:

```bash
# Replace this line in .env file:
APPLE_SHARED_SECRET=your-app-specific-shared-secret-here

# With your actual secret:
APPLE_SHARED_SECRET=1a2b3c4d5e6f7g8h9i0j
```

5. **Restart the backend server**:
```bash
cd backend
npm start
```

## ❌ **Issue 2: "No Active Subscription" Error**

### **Problem**
The restore function is correctly finding the subscription but failing during server validation.

### **Root Cause**
From the logs, I can see:
```
[IAPv2] Purchase updated: {"productId": "cloakr.monthly.unlimited6", "transactionId": "2000000983395524"}
[IAPv2] Receipt validation error: [Error: EXPO_PUBLIC_BACKEND_URL not configured]
```

The purchase is **successful** but validation is failing due to missing backend configuration.

### **Fix**
Once you add the Apple Shared Secret (Issue 1), this will be resolved automatically.

## 🔧 **Complete Fix Process**

### **Step 1: Get Apple Shared Secret**
1. Open **App Store Connect**
2. Go to **Apps** → **Cloakr** → **App Information**  
3. Scroll to **App-Specific Shared Secret**
4. Copy the secret value

### **Step 2: Update Environment**
Edit `/Users/bobbyleuellen/Desktop/Cloakr-VPN-IOS-FInished/.env`:
```bash
EXPO_PUBLIC_BACKEND_URL=http://localhost:3000
APPLE_SHARED_SECRET=YOUR_ACTUAL_SECRET_HERE
```

### **Step 3: Restart Services**
```bash
# Terminal 1: Restart backend
cd backend
npm start

# Terminal 2: Restart Expo (if needed)
npx expo start --clear
```

### **Step 4: Test on Physical Device**
1. **Fresh app install** on your iPhone
2. **Try restore purchases** - should now work
3. **Try new purchase** - should validate properly

## 📱 **Expected Behavior After Fix**

### ✅ **Successful Purchase Flow**
1. User taps subscription button
2. StoreKit payment sheet appears
3. User completes purchase with Face ID/Touch ID
4. App shows "Purchase successful—verifying..."
5. Backend validates receipt successfully
6. App shows "Premium activated!"

### ✅ **Successful Restore Flow**
1. User taps "Restore Purchases"
2. App checks existing transactions
3. Backend validates receipts
4. App shows "Premium restored!"

## 🚨 **Quick Test to Verify Fix**

After setting the Apple Shared Secret, test this URL in your browser:
```
http://localhost:3000/health
```

You should see a JSON response showing the server is healthy.

## 📝 **For Production Deployment**

When you deploy to production:

1. **Use HTTPS URL** in `.env`:
```bash
EXPO_PUBLIC_BACKEND_URL=https://your-domain.com
```

2. **Set environment variables** on your production server:
```bash
APPLE_SHARED_SECRET=your-secret-here
```

3. **Update backend URL** in App Store Connect if needed

## 🎯 **Current Status**

- ✅ **IAP Code**: Working correctly
- ✅ **Backend Server**: Running and ready
- ✅ **Purchase Detection**: Working on physical device
- ❌ **Apple Shared Secret**: **MISSING - THIS IS THE BLOCKER**
- ❌ **Receipt Validation**: Failing due to missing secret

**Once you add the Apple Shared Secret, all issues will be resolved!**