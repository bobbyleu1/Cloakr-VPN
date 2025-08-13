package com.cloakrvpn.billing

import android.app.Activity
import android.content.Context
import com.android.billingclient.api.*
import com.cloakrvpn.storage.SessionStore
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class BillingManager(
    private val context: Context,
    private val onPurchaseUpdate: (isPremium: Boolean) -> Unit
) : PurchasesUpdatedListener {
    
    companion object {
        private const val PREMIUM_SKU = "premium_monthly_599"
    }
    
    private var billingClient: BillingClient? = null
    private var isServiceConnected = false
    private val sessionStore = SessionStore(context)
    
    fun initialize() {
        billingClient = BillingClient.newBuilder(context)
            .setListener(this)
            .enablePendingPurchases()
            .build()
        
        startConnection()
    }
    
    private fun startConnection() {
        billingClient?.startConnection(object : BillingClientStateListener {
            override fun onBillingSetupFinished(billingResult: BillingResult) {
                if (billingResult.responseCode == BillingClient.BillingResponseCode.OK) {
                    isServiceConnected = true
                    queryExistingPurchases()
                }
            }
            
            override fun onBillingServiceDisconnected() {
                isServiceConnected = false
            }
        })
    }
    
    fun queryExistingPurchases() {
        if (!isServiceConnected) {
            startConnection()
            return
        }
        
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val purchasesResult = billingClient?.queryPurchasesAsync(
                    QueryPurchasesParams.newBuilder()
                        .setProductType(BillingClient.ProductType.SUBS)
                        .build()
                )
                
                purchasesResult?.let { result ->
                    if (result.billingResult.responseCode == BillingClient.BillingResponseCode.OK) {
                        handlePurchases(result.purchasesList)
                    }
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }
    
    fun launchBillingFlow(activity: Activity, onError: (String) -> Unit) {
        if (!isServiceConnected) {
            onError("Billing service not connected")
            return
        }
        
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val productDetailsParams = QueryProductDetailsParams.Product.newBuilder()
                    .setProductId(PREMIUM_SKU)
                    .setProductType(BillingClient.ProductType.SUBS)
                    .build()
                
                val params = QueryProductDetailsParams.newBuilder()
                    .setProductList(listOf(productDetailsParams))
                    .build()
                
                val productDetailsResult = billingClient?.queryProductDetails(params)
                
                productDetailsResult?.let { result ->
                    if (result.billingResult.responseCode == BillingClient.BillingResponseCode.OK) {
                        val productDetails = result.productDetailsList?.firstOrNull()
                        
                        if (productDetails != null) {
                            val subscriptionOfferDetails = productDetails.subscriptionOfferDetails?.firstOrNull()
                            
                            if (subscriptionOfferDetails != null) {
                                withContext(Dispatchers.Main) {
                                    val productDetailsParamsList = listOf(
                                        BillingFlowParams.ProductDetailsParams.newBuilder()
                                            .setProductDetails(productDetails)
                                            .setOfferToken(subscriptionOfferDetails.offerToken)
                                            .build()
                                    )
                                    
                                    val billingFlowParams = BillingFlowParams.newBuilder()
                                        .setProductDetailsParamsList(productDetailsParamsList)
                                        .build()
                                    
                                    billingClient?.launchBillingFlow(activity, billingFlowParams)
                                }
                            } else {
                                withContext(Dispatchers.Main) {
                                    onError("No subscription offers available")
                                }
                            }
                        } else {
                            withContext(Dispatchers.Main) {
                                onError("Product not found")
                            }
                        }
                    } else {
                        withContext(Dispatchers.Main) {
                            onError("Failed to query product details")
                        }
                    }
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    onError("Error launching billing flow: ${e.message}")
                }
            }
        }
    }
    
    override fun onPurchasesUpdated(billingResult: BillingResult, purchases: MutableList<Purchase>?) {
        if (billingResult.responseCode == BillingClient.BillingResponseCode.OK) {
            purchases?.let { handlePurchases(it) }
        } else if (billingResult.responseCode == BillingClient.BillingResponseCode.USER_CANCELED) {
            // User canceled the purchase
        } else {
            // Handle other error codes
        }
    }
    
    private fun handlePurchases(purchases: List<Purchase>) {
        var hasPremium = false
        
        for (purchase in purchases) {
            if (purchase.products.contains(PREMIUM_SKU) && 
                purchase.purchaseState == Purchase.PurchaseState.PURCHASED) {
                
                // Verify and acknowledge the purchase
                if (!purchase.isAcknowledged) {
                    acknowledgePurchase(purchase)
                }
                
                hasPremium = true
            }
        }
        
        // Update premium status
        sessionStore.setPremium(hasPremium)
        onPurchaseUpdate(hasPremium)
    }
    
    private fun acknowledgePurchase(purchase: Purchase) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val acknowledgePurchaseParams = AcknowledgePurchaseParams.newBuilder()
                    .setPurchaseToken(purchase.purchaseToken)
                    .build()
                
                billingClient?.acknowledgePurchase(acknowledgePurchaseParams) { billingResult ->
                    // Handle acknowledgment result
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }
    
    fun isPremium(): Boolean {
        return sessionStore.isPremium()
    }
    
    fun destroy() {
        billingClient?.endConnection()
    }
}