package com.cloakrvpn.ads

import android.app.Activity
import android.content.Context
import com.google.android.gms.ads.AdRequest
import com.google.android.gms.ads.FullScreenContentCallback
import com.google.android.gms.ads.LoadAdError
import com.google.android.gms.ads.MobileAds
import com.google.android.gms.ads.interstitial.InterstitialAd
import com.google.android.gms.ads.interstitial.InterstitialAdLoadCallback
import com.google.android.gms.ads.rewarded.RewardedAd
import com.google.android.gms.ads.rewarded.RewardedAdLoadCallback
import com.cloakrvpn.BuildConfig
import com.cloakrvpn.storage.SessionStore

class AdManager(private val context: Context) {
    
    companion object {
        // Production Ad Unit IDs
        private const val REWARDED_AD_ID = "ca-app-pub-6842873031676463/9889682820"
        private const val INTERSTITIAL_AD_ID = "ca-app-pub-6842873031676463/8103191969"
        private const val BANNER_AD_ID = "ca-app-pub-6842873031676463/5740080053"
        
        // Test Ad Unit IDs (for debug builds)
        private const val TEST_REWARDED_AD_ID = "ca-app-pub-3940256099942544/5224354917"
        private const val TEST_INTERSTITIAL_AD_ID = "ca-app-pub-3940256099942544/1033173712"
        private const val TEST_BANNER_AD_ID = "ca-app-pub-3940256099942544/6300978111"
    }
    
    private var rewardedAd: RewardedAd? = null
    private var interstitialAd: InterstitialAd? = null
    private var isInitialized = false
    
    fun initialize(callback: () -> Unit) {
        if (isInitialized) {
            callback()
            return
        }
        
        MobileAds.initialize(context) { initializationStatus ->
            isInitialized = true
            callback()
        }
    }
    
    fun loadRewardedAd(onLoaded: () -> Unit, onFailed: (String) -> Unit) {
        val adUnitId = if (BuildConfig.DEBUG) TEST_REWARDED_AD_ID else REWARDED_AD_ID
        val adRequest = AdRequest.Builder().build()
        
        RewardedAd.load(context, adUnitId, adRequest, object : RewardedAdLoadCallback() {
            override fun onAdFailedToLoad(adError: LoadAdError) {
                rewardedAd = null
                onFailed("Failed to load rewarded ad: ${adError.message}")
            }
            
            override fun onAdLoaded(ad: RewardedAd) {
                rewardedAd = ad
                onLoaded()
            }
        })
    }
    
    fun showRewardedAd(
        activity: Activity,
        onRewarded: () -> Unit,
        onFailed: (String) -> Unit,
        onClosed: () -> Unit
    ) {
        val ad = rewardedAd
        if (ad == null) {
            onFailed("Rewarded ad not loaded")
            return
        }
        
        // Check if user can watch more ads
        val sessionStore = SessionStore(context)
        if (!sessionStore.canWatchAd()) {
            onFailed("Daily ad limit reached")
            return
        }
        
        ad.fullScreenContentCallback = object : FullScreenContentCallback() {
            override fun onAdDismissedFullScreenContent() {
                rewardedAd = null
                onClosed()
                // Preload next ad
                loadRewardedAd({}, {})
            }
            
            override fun onAdFailedToShowFullScreenContent(adError: com.google.android.gms.ads.AdError) {
                rewardedAd = null
                onFailed("Failed to show rewarded ad: ${adError.message}")
            }
        }
        
        ad.show(activity) { rewardItem ->
            // User earned the reward
            val success = sessionStore.recordAdWatched()
            if (success) {
                onRewarded()
            } else {
                onFailed("Failed to process reward")
            }
        }
    }
    
    fun loadInterstitialAd(onLoaded: () -> Unit, onFailed: (String) -> Unit) {
        val adUnitId = if (BuildConfig.DEBUG) TEST_INTERSTITIAL_AD_ID else INTERSTITIAL_AD_ID
        val adRequest = AdRequest.Builder().build()
        
        InterstitialAd.load(context, adUnitId, adRequest, object : InterstitialAdLoadCallback() {
            override fun onAdFailedToLoad(adError: LoadAdError) {
                interstitialAd = null
                onFailed("Failed to load interstitial ad: ${adError.message}")
            }
            
            override fun onAdLoaded(ad: InterstitialAd) {
                interstitialAd = ad
                onLoaded()
            }
        })
    }
    
    fun showInterstitialAd(activity: Activity, onClosed: () -> Unit) {
        val ad = interstitialAd
        if (ad == null) {
            onClosed()
            return
        }
        
        ad.fullScreenContentCallback = object : FullScreenContentCallback() {
            override fun onAdDismissedFullScreenContent() {
                interstitialAd = null
                onClosed()
                // Preload next ad
                loadInterstitialAd({}, {})
            }
            
            override fun onAdFailedToShowFullScreenContent(adError: com.google.android.gms.ads.AdError) {
                interstitialAd = null
                onClosed()
            }
        }
        
        ad.show(activity)
    }
    
    fun getBannerAdUnitId(): String {
        return if (BuildConfig.DEBUG) TEST_BANNER_AD_ID else BANNER_AD_ID
    }
    
    fun isRewardedAdLoaded(): Boolean = rewardedAd != null
    
    fun isInterstitialAdLoaded(): Boolean = interstitialAd != null
}