package com.cloakrvpn.vpn

import android.content.Context
import android.content.Intent
import android.net.VpnService
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.WritableMap
import com.facebook.react.bridge.Arguments
import com.facebook.react.modules.core.DeviceEventManagerModule

object VpnConnectionManager {
    
    private var reactContext: ReactApplicationContext? = null
    
    fun initialize(context: ReactApplicationContext) {
        reactContext = context
    }
    
    fun startVpn(context: Context): Boolean {
        val intent = VpnService.prepare(context)
        if (intent != null) {
            // VPN permission not granted yet
            return false
        }
        
        val serviceIntent = Intent(context, CloakrVpnService::class.java)
        serviceIntent.action = "CONNECT"
        context.startForegroundService(serviceIntent)
        return true
    }
    
    fun stopVpn(context: Context) {
        val serviceIntent = Intent(context, CloakrVpnService::class.java)
        serviceIntent.action = "DISCONNECT"
        context.startService(serviceIntent)
    }
    
    fun isVpnRunning(): Boolean {
        return CloakrVpnService.isRunning.get()
    }
    
    fun getVpnStatus(): String {
        return if (isVpnRunning()) "connected" else "disconnected"
    }
    
    fun notifyStatusChange(status: String) {
        reactContext?.let { context ->
            try {
                val params: WritableMap = Arguments.createMap()
                params.putString("status", status)
                
                context
                    .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                    .emit("vpnStatus", params)
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }
    
    fun requestVpnPermission(context: Context): Intent? {
        return VpnService.prepare(context)
    }
}