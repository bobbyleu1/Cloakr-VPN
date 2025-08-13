package com.cloakrvpn.storage

import android.content.Context
import android.content.SharedPreferences
import java.util.*

class SessionStore(private val context: Context) {
    
    companion object {
        private const val PREFS_NAME = "cloakr_session"
        private const val KEY_REMAINING_TIME = "remaining_seconds"
        private const val KEY_ADS_WATCHED_TODAY = "ads_watched_today"
        private const val KEY_LAST_AD_EARNED = "last_ad_earned_at"
        private const val KEY_LAST_RESET_DATE = "last_reset_date"
        private const val KEY_IS_PREMIUM = "is_premium"
        
        private const val MAX_DAILY_ADS = 6
        private const val MAX_TOTAL_TIME = 43200 // 12 hours in seconds
        private const val AD_REWARD_TIME = 7200 // 2 hours in seconds
    }
    
    private val prefs: SharedPreferences = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    
    init {
        checkDailyReset()
    }
    
    private fun checkDailyReset() {
        val today = getTodayDateString()
        val lastResetDate = prefs.getString(KEY_LAST_RESET_DATE, "")
        
        if (lastResetDate != today) {
            // Reset daily counters
            prefs.edit()
                .putInt(KEY_ADS_WATCHED_TODAY, 0)
                .putString(KEY_LAST_RESET_DATE, today)
                .apply()
        }
    }
    
    private fun getTodayDateString(): String {
        val calendar = Calendar.getInstance()
        return "${calendar.get(Calendar.YEAR)}-${calendar.get(Calendar.MONTH)}-${calendar.get(Calendar.DAY_OF_MONTH)}"
    }
    
    fun getRemainingTime(): Int {
        return prefs.getInt(KEY_REMAINING_TIME, 0)
    }
    
    fun setRemainingTime(seconds: Int) {
        prefs.edit()
            .putInt(KEY_REMAINING_TIME, maxOf(0, minOf(seconds, MAX_TOTAL_TIME)))
            .apply()
    }
    
    fun addTime(seconds: Int) {
        val current = getRemainingTime()
        setRemainingTime(current + seconds)
    }
    
    fun decrementTime(seconds: Int) {
        val current = getRemainingTime()
        setRemainingTime(current - seconds)
    }
    
    fun getAdsWatchedToday(): Int {
        return prefs.getInt(KEY_ADS_WATCHED_TODAY, 0)
    }
    
    fun canWatchAd(): Boolean {
        return getAdsWatchedToday() < MAX_DAILY_ADS
    }
    
    fun recordAdWatched(): Boolean {
        val currentAds = getAdsWatchedToday()
        if (currentAds >= MAX_DAILY_ADS) {
            return false
        }
        
        // Add reward time
        addTime(AD_REWARD_TIME)
        
        // Increment ads watched
        prefs.edit()
            .putInt(KEY_ADS_WATCHED_TODAY, currentAds + 1)
            .putLong(KEY_LAST_AD_EARNED, System.currentTimeMillis())
            .apply()
        
        return true
    }
    
    fun isPremium(): Boolean {
        return prefs.getBoolean(KEY_IS_PREMIUM, false)
    }
    
    fun setPremium(premium: Boolean) {
        prefs.edit()
            .putBoolean(KEY_IS_PREMIUM, premium)
            .apply()
    }
    
    fun getLastAdEarnedTime(): Long {
        return prefs.getLong(KEY_LAST_AD_EARNED, 0)
    }
    
    fun getSessionData(): SessionData {
        return SessionData(
            remainingTime = getRemainingTime(),
            adsWatchedToday = getAdsWatchedToday(),
            canWatchAd = canWatchAd(),
            isPremium = isPremium(),
            lastAdEarned = getLastAdEarnedTime()
        )
    }
}

data class SessionData(
    val remainingTime: Int,
    val adsWatchedToday: Int,
    val canWatchAd: Boolean,
    val isPremium: Boolean,
    val lastAdEarned: Long
)