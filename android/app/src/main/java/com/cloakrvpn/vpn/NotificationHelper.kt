package com.cloakrvpn.vpn

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import com.cloakrvpn.MainActivity

object NotificationHelper {
    
    private const val LOW_TIME_CHANNEL_ID = "cloakr_low_time_channel"
    private const val LOW_TIME_CHANNEL_NAME = "Low VPN Time Alerts"
    private const val TIME_EXPIRED_NOTIFICATION_ID = 1002
    private const val LOW_TIME_NOTIFICATION_ID = 1003
    
    fun createNotificationChannels(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val notificationManager = context.getSystemService(NotificationManager::class.java)
            
            // Low time alert channel
            val lowTimeChannel = NotificationChannel(
                LOW_TIME_CHANNEL_ID,
                LOW_TIME_CHANNEL_NAME,
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Alerts when VPN time is running low"
                setShowBadge(true)
                enableVibration(true)
            }
            
            notificationManager.createNotificationChannel(lowTimeChannel)
        }
    }
    
    fun showTimeExpiredNotification(context: Context) {
        val intent = Intent(context, MainActivity::class.java)
        val pendingIntent = PendingIntent.getActivity(
            context, 0, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        
        val notification = NotificationCompat.Builder(context, LOW_TIME_CHANNEL_ID)
            .setContentTitle("VPN Session Expired")
            .setContentText("Your VPN session has expired and was automatically disconnected.")
            .setSmallIcon(android.R.drawable.ic_dialog_alert)
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .build()
        
        val notificationManager = context.getSystemService(NotificationManager::class.java)
        notificationManager.notify(TIME_EXPIRED_NOTIFICATION_ID, notification)
    }
    
    fun showLowTimeNotification(context: Context, message: String) {
        val intent = Intent(context, MainActivity::class.java)
        val pendingIntent = PendingIntent.getActivity(
            context, 0, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        
        val notification = NotificationCompat.Builder(context, LOW_TIME_CHANNEL_ID)
            .setContentTitle("VPN Time Running Low")
            .setContentText(message)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .build()
        
        val notificationManager = context.getSystemService(NotificationManager::class.java)
        notificationManager.notify(LOW_TIME_NOTIFICATION_ID, notification)
    }
}