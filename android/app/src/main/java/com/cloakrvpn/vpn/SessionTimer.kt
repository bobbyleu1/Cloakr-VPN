package com.cloakrvpn.vpn

import android.content.Context
import com.cloakrvpn.storage.SessionStore
import kotlinx.coroutines.*
import kotlin.coroutines.CoroutineContext

class SessionTimer(
    private val context: Context,
    private val onTimeUpdate: (remaining: Int) -> Unit
) : CoroutineScope {
    
    private val job = SupervisorJob()
    override val coroutineContext: CoroutineContext = Dispatchers.Main + job
    
    private var timerJob: Job? = null
    private var isRunning = false
    
    fun start() {
        if (isRunning) return
        
        isRunning = true
        timerJob = launch {
            while (isRunning && isActive) {
                try {
                    val sessionStore = SessionStore(context)
                    val remaining = sessionStore.getRemainingTime()
                    
                    if (remaining <= 0) {
                        // Time expired, disconnect VPN
                        VpnConnectionManager.stopVpn(context)
                        NotificationHelper.showTimeExpiredNotification(context)
                        break
                    }
                    
                    // Update notification with remaining time
                    onTimeUpdate(remaining)
                    
                    // Send notifications at 1 hour and 5 minutes remaining
                    when (remaining) {
                        3600 -> NotificationHelper.showLowTimeNotification(context, "1 hour remaining")
                        300 -> NotificationHelper.showLowTimeNotification(context, "5 minutes remaining")
                    }
                    
                    // Decrement time and save
                    sessionStore.decrementTime(1)
                    
                    delay(1000) // Update every second
                } catch (e: Exception) {
                    e.printStackTrace()
                    break
                }
            }
        }
    }
    
    fun stop() {
        isRunning = false
        timerJob?.cancel()
        timerJob = null
        job.cancel()
    }
    
    fun addTime(seconds: Int) {
        launch {
            try {
                val sessionStore = SessionStore(context)
                sessionStore.addTime(seconds)
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }
}