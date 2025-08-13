package com.cloakrvpn

import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.cloakrvpn.ads.AdManager
import com.cloakrvpn.billing.BillingManager
import com.cloakrvpn.storage.SessionStore
import com.cloakrvpn.vpn.NotificationHelper
import com.cloakrvpn.vpn.VpnConnectionManager

class VpnModule(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    
    companion object {
        private const val VPN_REQUEST_CODE = 100
        private const val NOTIFICATION_PERMISSION_CODE = 101
    }
    
    private var adManager: AdManager? = null
    private var billingManager: BillingManager? = null
    private var sessionStore: SessionStore? = null
    
    override fun getName(): String {
        return "VPNManager"
    }
    
    init {
        initializeManagers()
    }
    
    private fun initializeManagers() {
        try {
            sessionStore = SessionStore(reactContext)
            
            adManager = AdManager(reactContext)
            adManager?.initialize {
                // Ad manager initialized
            }
            
            billingManager = BillingManager(reactContext) { isPremium ->
                sendEvent("premiumStatusChanged", createMap().apply {
                    putBoolean("isPremium", isPremium)
                })
            }
            billingManager?.initialize()
            
            VpnConnectionManager.initialize(reactContext)
            NotificationHelper.createNotificationChannels(reactContext)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
    
    @ReactMethod
    fun installProfileIfNeeded(promise: Promise) {
        try {
            val intent = VpnConnectionManager.requestVpnPermission(reactContext)
            if (intent != null) {
                // Need to request VPN permission
                currentActivity?.startActivityForResult(intent, VPN_REQUEST_CODE)
                promise.resolve(false) // Permission needed
            } else {
                promise.resolve(true) // Permission already granted
            }
        } catch (e: Exception) {
            promise.reject("VPN_PERMISSION_ERROR", e.message, e)
        }
    }
    
    @ReactMethod
    fun connect(promise: Promise) {
        try {
            // Request notification permission on Android 13+ before connecting
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                requestNotificationPermission()
            }
            
            val success = VpnConnectionManager.startVpn(reactContext)
            if (success) {
                promise.resolve("connecting")
            } else {
                // Need VPN permission first
                installProfileIfNeeded(promise)
            }
        } catch (e: Exception) {
            promise.reject("VPN_CONNECT_ERROR", e.message, e)
        }
    }
    
    private fun requestNotificationPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            val activity = currentActivity
            if (activity != null) {
                val permission = android.Manifest.permission.POST_NOTIFICATIONS
                if (ContextCompat.checkSelfPermission(activity, permission) != PackageManager.PERMISSION_GRANTED) {
                    ActivityCompat.requestPermissions(activity, arrayOf(permission), NOTIFICATION_PERMISSION_CODE)
                }
            }
        }
    }
    
    @ReactMethod
    fun disconnect(promise: Promise) {
        try {
            VpnConnectionManager.stopVpn(reactContext)
            promise.resolve("disconnecting")
        } catch (e: Exception) {
            promise.reject("VPN_DISCONNECT_ERROR", e.message, e)
        }
    }
    
    @ReactMethod
    fun getCachedStatus(promise: Promise) {
        try {
            val status = VpnConnectionManager.getVpnStatus()
            promise.resolve(status)
        } catch (e: Exception) {
            promise.reject("VPN_STATUS_ERROR", e.message, e)
        }
    }
    
    @ReactMethod
    fun refreshStatus(promise: Promise) {
        try {
            val status = VpnConnectionManager.getVpnStatus()
            promise.resolve(status)
        } catch (e: Exception) {
            promise.reject("VPN_STATUS_ERROR", e.message, e)
        }
    }
    
    @ReactMethod
    fun getRemainingTime(promise: Promise) {
        try {
            val remainingTime = sessionStore?.getRemainingTime() ?: 0
            promise.resolve(remainingTime)
        } catch (e: Exception) {
            promise.reject("SESSION_ERROR", e.message, e)
        }
    }
    
    @ReactMethod
    fun getSessionData(promise: Promise) {
        try {
            val data = sessionStore?.getSessionData()
            val result = createMap().apply {
                putInt("remainingTime", data?.remainingTime ?: 0)
                putInt("adsWatchedToday", data?.adsWatchedToday ?: 0)
                putBoolean("canWatchAd", data?.canWatchAd ?: false)
                putBoolean("isPremium", data?.isPremium ?: false)
                putDouble("lastAdEarned", data?.lastAdEarned?.toDouble() ?: 0.0)
            }
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("SESSION_ERROR", e.message, e)
        }
    }
    
    @ReactMethod
    fun loadRewardedAd(promise: Promise) {
        adManager?.loadRewardedAd(
            onLoaded = { promise.resolve(true) },
            onFailed = { error -> promise.reject("AD_LOAD_ERROR", error) }
        )
    }
    
    @ReactMethod
    fun showRewardedAd(promise: Promise) {
        val activity = currentActivity
        if (activity == null) {
            promise.reject("NO_ACTIVITY", "No current activity")
            return
        }
        
        adManager?.showRewardedAd(
            activity,
            onRewarded = {
                sendEvent("adRewarded", createMap().apply {
                    putString("type", "rewarded")
                })
                promise.resolve(true)
            },
            onFailed = { error -> promise.reject("AD_SHOW_ERROR", error) },
            onClosed = { /* Ad closed */ }
        )
    }
    
    @ReactMethod
    fun isRewardedAdLoaded(promise: Promise) {
        try {
            val loaded = adManager?.isRewardedAdLoaded() ?: false
            promise.resolve(loaded)
        } catch (e: Exception) {
            promise.reject("AD_STATUS_ERROR", e.message, e)
        }
    }
    
    @ReactMethod
    fun launchBilling(promise: Promise) {
        val activity = currentActivity
        if (activity == null) {
            promise.reject("NO_ACTIVITY", "No current activity")
            return
        }
        
        billingManager?.launchBillingFlow(activity) { error ->
            promise.reject("BILLING_ERROR", error)
        }
        
        // Don't resolve here - will be resolved when purchase completes
    }
    
    @ReactMethod
    fun restorePurchases(promise: Promise) {
        try {
            billingManager?.queryExistingPurchases()
            val isPremium = billingManager?.isPremium() ?: false
            promise.resolve(isPremium)
        } catch (e: Exception) {
            promise.reject("RESTORE_ERROR", e.message, e)
        }
    }
    
    @ReactMethod
    fun isPremium(promise: Promise) {
        try {
            val premium = billingManager?.isPremium() ?: false
            promise.resolve(premium)
        } catch (e: Exception) {
            promise.reject("PREMIUM_STATUS_ERROR", e.message, e)
        }
    }
    
    @ReactMethod
    fun getVpnDisclosure(promise: Promise) {
        val disclosure = "Cloakr routes your traffic through our VPN server to provide a secure connection. We do not inspect the contents of your traffic."
        promise.resolve(disclosure)
    }
    
    private fun sendEvent(eventName: String, params: WritableMap?) {
        try {
            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit(eventName, params)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
    
    private fun createMap(): WritableMap {
        return Arguments.createMap()
    }
    
    override fun onCatalystInstanceDestroy() {
        super.onCatalystInstanceDestroy()
        billingManager?.destroy()
    }
}