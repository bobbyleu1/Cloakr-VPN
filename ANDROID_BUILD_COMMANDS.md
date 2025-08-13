# Android Build Commands for Cloakr VPN

## Pre-Build Fixes Applied ✅

- ✅ Removed invalid `BIND_VPN_SERVICE` permission declaration
- ✅ AdMob App ID properly configured in AndroidManifest.xml
- ✅ Package consistency: `com.vroomautomotivegroup.cloakr` everywhere
- ✅ Functional VPN tunnel (not mock) to pass Play Store review
- ✅ POST_NOTIFICATIONS runtime permission request on Android 13+
- ✅ In-app VPN disclosure available via `getVpnDisclosure()` method

## 1. Create Release Keystore

```bash
cd android/app

# Generate release keystore
keytool -genkey -v -keystore cloakr-release.jks -alias cloakr -keyalg RSA -keysize 2048 -validity 10000

# You'll be prompted for:
# - Keystore password (save this securely!)
# - Key password (save this securely!)
# - Your name/organization details

# Set environment variables for build
export KEYSTORE_PASSWORD="your_keystore_password_here"
export KEY_PASSWORD="your_key_password_here"
export KEY_ALIAS="cloakr"
```

## 2. Build Release AAB (Play Store)

```bash
cd android

# Clean previous builds
./gradlew clean

# Build release AAB bundle
./gradlew bundleRelease

# Output location:
# android/app/build/outputs/bundle/release/app-release.aab
```

## 3. Build Release APK (Alternative)

```bash
cd android

# Build release APK
./gradlew assembleRelease

# Output location:
# android/app/build/outputs/apk/release/app-release.apk
```

## 4. Test Debug Build

```bash
cd android
./gradlew assembleDebug

# Install on device
adb install app/build/outputs/apk/debug/app-debug.apk
```

## 5. Verify Build

```bash
# Check APK contents
aapt list -a app-release.aab

# Verify signing
jarsigner -verify -verbose -certs app-release.aab
```

## Important Notes

- **Keystore Security**: Back up your keystore file and passwords securely. If lost, you cannot update your Play Store app.
- **Build Environment**: Ensure you have Android SDK 34, Build Tools 34.0.0
- **Testing**: Test the debug build thoroughly before releasing
- **App Bundle**: Google Play prefers AAB over APK for better optimization

## Environment Requirements

- Java 11 or higher
- Android SDK 34
- Android Build Tools 34.0.0
- Gradle 8.1.1 (configured in project)