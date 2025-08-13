# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# react-native-reanimated
-keep class com.swmansion.reanimated.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }

# Add any project specific keep options here:

# Keep VPN related classes
-keep class com.cloakrvpn.vpn.** { *; }
-keep class com.cloakrvpn.billing.** { *; }
-keep class com.cloakrvpn.ads.** { *; }
-keep class com.cloakrvpn.storage.** { *; }

# Keep React Native VPN module
-keep class com.cloakrvpn.VpnModule { *; }
-keep class com.cloakrvpn.VpnPackage { *; }

# Google Play Services
-keep class com.google.android.gms.ads.** { *; }
-keep class com.google.android.gms.common.** { *; }

# Billing Client
-keep class com.android.billingclient.api.** { *; }

# React Native
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }

# Expo
-keep class expo.modules.** { *; }
