import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { iapManager, PremiumProduct, PurchaseResult, DiagnosticsInfo, RestoreResult } from '../utils/iapManager';

interface PaywallScreenProps {
  onClose: () => void;
  onPurchaseSuccess: () => void;
}

export const PaywallScreenRNIap: React.FC<PaywallScreenProps> = ({ 
  onClose, 
  onPurchaseSuccess 
}) => {
  // State management
  const [products, setProducts] = useState<PremiumProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [iapReady, setIapReady] = useState(false);

  // Get the main product (first one from the list)
  const primaryProduct = products.length > 0 ? products[0] : null;

  /**
   * Initialize IAP and ensure readiness on component mount
   * Uses new comprehensive IAP readiness checks
   */
  useEffect(() => {
    let isMounted = true;

    const initializeIAP = async () => {
      try {
        setLoadingProducts(true);
        console.log('[IAP][UI] Initializing IAP on paywall mount...');
        
        // Ensure IAP is fully ready with all prerequisites
        await iapManager.ensureIapReady();
        
        if (isMounted) {
          const resolvedProducts = iapManager.getResolvedProducts();
          const isReady = iapManager.isIapReady();
          
          setProducts(resolvedProducts);
          setIapReady(isReady);
          
          console.log('[IAP][UI] Products loaded:', resolvedProducts.length);
          console.log('[IAP][UI] IAP ready status:', isReady);
          
          // Dump diagnostics for debugging
          const diagnostics = iapManager.dumpDiagnostics();
          console.log('[IAP][UI] Paywall opened with diagnostics:', diagnostics);
        }
      } catch (error) {
        console.error('[IAP][UI] Failed to initialize IAP:', error);
        if (isMounted) {
          // Show error to user but don't block the UI
          Alert.alert(
            'Connection Error',
            'Unable to load subscription options. Please check your connection and try again.',
            [{ text: 'OK' }]
          );
        }
      } finally {
        if (isMounted) {
          setLoadingProducts(false);
        }
      }
    };

    initializeIAP();

    // Cleanup function - Note: Don't disconnect here as other components may be using IAP
    return () => {
      isMounted = false;
    };
  }, []);

  /**
   * Handle subscription purchase with comprehensive safeguards
   * Maps specific errors to user-friendly messages
   */
  const handlePurchase = useCallback(async () => {
    console.log('[IAP][UI] Purchase button tapped');
    
    // Pre-flight checks
    if (!iapReady) {
      console.error('[IAP][UI] Purchase attempted when IAP not ready');
      Alert.alert('Error', 'Payments not ready. Please try again.');
      return;
    }

    if (products.length === 0) {
      console.error('[IAP][UI] Purchase attempted with no products');
      Alert.alert('Error', 'Price unavailable right now.');
      return;
    }

    if (purchasing) {
      console.log('[IAP][UI] Purchase already in progress');
      return;
    }

    setPurchasing(true);
    console.log('[IAP][UI] Starting purchase request...');
    
    try {
      const result: PurchaseResult = await iapManager.requestCloakrSubscription();
      
      if (result.success) {
        console.log('[IAP][UI] Purchase successful');
        Alert.alert(
          'Success!', 
          'You now have unlimited VPN access!', 
          [{ text: 'OK', onPress: onPurchaseSuccess }]
        );
      } else if (result.cancelled) {
        console.log('[IAP][UI] Purchase cancelled by user');
        // User cancelled - no alert needed
      } else {
        console.error('[IAP][UI] Purchase failed:', result.error);
        Alert.alert(
          'Purchase Failed', 
          result.error || 'Something went wrong. Please try again.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('[IAP][UI] Purchase error:', error);
      
      // Map specific errors to user-friendly messages
      let userMessage = 'Purchase failed. Please try again.';
      const errorMessage = (error as Error).message;
      
      if (errorMessage.includes('E_IAP_NOT_READY')) {
        userMessage = 'Payments not ready. Please try again.';
      } else if (errorMessage.includes('E_NO_PRODUCTS')) {
        userMessage = 'Price unavailable right now.';
      } else if (errorMessage.includes('E_CANNOT_PAY')) {
        userMessage = 'Purchases are disabled on this device.';
      } else if (errorMessage.includes('E_IAP_TIMEOUT')) {
        userMessage = 'Store response timed out. Please try again.';
      } else if (errorMessage.includes('E_MULTIPLE_REQUESTS')) {
        userMessage = 'Please wait for the current purchase to complete.';
      }
      
      console.log('[IAP][UI] Showing error to user:', userMessage);
      Alert.alert('Purchase Failed', userMessage, [{ text: 'OK' }]);
    } finally {
      setPurchasing(false);
    }
  }, [iapReady, products.length, purchasing, onPurchaseSuccess]);

  /**
   * Handle restore purchases with proper backend validation
   * Shows specific error messages based on restore result
   */
  const handleRestore = useCallback(async () => {
    console.log('[IAP][UI] Restore button tapped');
    setRestoring(true);
    
    try {
      const restoreResult: RestoreResult = await iapManager.restorePurchases();
      
      console.log('[IAP][UI] Restore result:', restoreResult);
      
      if (restoreResult.restored) {
        // Success case
        Alert.alert(
          'Success!', 
          'Your premium subscription has been restored!', 
          [{ text: 'OK', onPress: onPurchaseSuccess }]
        );
      } else {
        // Handle specific failure reasons
        let title = 'Restore Failed';
        let message = 'Unable to restore purchases. Please try again.';
        
        switch (restoreResult.reason) {
          case 'NO_PURCHASES':
            title = 'No Subscription Found';
            message = 'No subscription found for this Apple ID. If you purchased on a different Apple ID, please sign in with that account and try again.';
            break;
            
          case 'NOT_ACTIVE':
            title = 'No Active Subscription';
            message = 'No active subscription to restore. Your subscription may have expired or been cancelled.';
            break;
            
          case 'NETWORK_ERROR':
            title = 'Connection Error';
            message = 'Unable to connect to the server. Please check your internet connection and try again.';
            break;
            
          case 'SERVER_ERROR':
            title = 'Server Error';
            message = 'Server error occurred while validating your purchase. Please try again in a few moments.';
            break;
        }
        
        console.log(`[IAP][UI] Showing restore error: ${title} - ${message}`);
        Alert.alert(title, message, [{ text: 'OK' }]);
      }
    } catch (error) {
      console.error('[IAP][UI] Restore error:', error);
      Alert.alert(
        'Restore Failed', 
        'An unexpected error occurred. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setRestoring(false);
    }
  }, [onPurchaseSuccess]);

  /**
   * Open device subscription management
   */
  const handleManageSubscriptions = useCallback(() => {
    const url = 'itms-apps://apps.apple.com/account/subscriptions';
    Linking.openURL(url);
  }, []);

  /**
   * Open privacy policy
   */
  const openPrivacyPolicy = useCallback(() => {
    Linking.openURL('https://vroomautomotivegroup.com/cloakr-privacy-policy');
  }, []);

  /**
   * Open terms of use
   */
  const openTermsOfUse = useCallback(() => {
    Linking.openURL('https://www.apple.com/legal/internet-services/itunes/dev/stdeula/');
  }, []);

  // Show loading state while fetching products
  if (loadingProducts) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <FontAwesome5 name="times" size={24} color="#9ca3af" />
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#60a5fa" />
          <Text style={styles.loadingText}>Loading subscription options...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <FontAwesome5 name="times" size={24} color="#9ca3af" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.heroSection}>
          <FontAwesome5 name="crown" size={60} color="#fbbf24" />
          <Text style={styles.title}>Cloakr Premium</Text>
          <Text style={styles.subtitle}>Unlimited VPN Access</Text>
        </View>

        <View style={styles.featuresContainer}>
          <View style={styles.featureItem}>
            <FontAwesome5 name="infinity" size={20} color="#10b981" />
            <Text style={styles.featureText}>Unlimited VPN Time</Text>
          </View>
          <View style={styles.featureItem}>
            <FontAwesome5 name="ban" size={20} color="#10b981" />
            <Text style={styles.featureText}>No Ads</Text>
          </View>
          <View style={styles.featureItem}>
            <FontAwesome5 name="shield-alt" size={20} color="#10b981" />
            <Text style={styles.featureText}>Priority Support</Text>
          </View>
        </View>

        {/* Subscription Information - Required by Apple */}
        <View style={styles.pricingContainer}>
          <Text style={styles.productTitle}>
            {primaryProduct?.title || 'Cloakr Premium Monthly'}
          </Text>
          <Text style={styles.productPrice}>
            {/* Show loading price if products aren't loaded yet, otherwise show actual or fallback price */}
            {loadingProducts ? 'Loading price...' : (primaryProduct?.localizedPrice || '$5.99')}/month
          </Text>
          <Text style={styles.productDescription}>
            {primaryProduct?.description || 'Unlimited VPN access with no ads'}
          </Text>
          
          {/* Required subscription details for Apple compliance */}
          <Text style={styles.subscriptionDetails}>
            • Title: {primaryProduct?.title || 'Cloakr Premium Monthly'}{'\n'}
            • Length of subscription: 1 month{'\n'}
            • Price: {primaryProduct?.localizedPrice || '$5.99'} per month{'\n'}
            • Auto-renewable subscription
          </Text>
        </View>

        {/* Purchase Button - Only enabled when IAP is ready */}
        <TouchableOpacity
          style={[
            styles.purchaseButton, 
            (purchasing || !iapReady || products.length === 0) && styles.disabledButton
          ]}
          onPress={handlePurchase}
          disabled={purchasing || !iapReady || products.length === 0}
        >
          {purchasing ? (
            <ActivityIndicator color="#fff" />
          ) : !iapReady ? (
            <Text style={styles.purchaseButtonText}>Loading...</Text>
          ) : products.length === 0 ? (
            <Text style={styles.purchaseButtonText}>Price unavailable</Text>
          ) : (
            <>
              <FontAwesome5 name="crown" size={16} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.purchaseButtonText}>
                Subscribe for {primaryProduct?.localizedPrice || '$5.99'}/month
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Restore Purchases Button */}
        <TouchableOpacity
          style={styles.restoreButton}
          onPress={handleRestore}
          disabled={restoring}
        >
          {restoring ? (
            <ActivityIndicator size="small" color="#60a5fa" />
          ) : (
            <Text style={styles.restoreButtonText}>Restore Purchases</Text>
          )}
        </TouchableOpacity>

        {/* Manage Subscriptions Button */}
        <TouchableOpacity
          style={styles.manageButton}
          onPress={handleManageSubscriptions}
        >
          <Text style={styles.manageButtonText}>Manage Subscriptions</Text>
        </TouchableOpacity>

        {/* Required subscription auto-renewal notice */}
        <Text style={styles.subscriptionNote}>
          Subscription automatically renews unless auto-renew is turned off at least 24 hours before the end of the current period.
        </Text>

        {/* Required legal links */}
        <View style={styles.legalLinks}>
          <TouchableOpacity onPress={openPrivacyPolicy}>
            <Text style={styles.legalLinkText}>Privacy Policy</Text>
          </TouchableOpacity>
          <Text style={styles.legalSeparator}>•</Text>
          <TouchableOpacity onPress={openTermsOfUse}>
            <Text style={styles.legalLinkText}>Terms of Use</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  closeButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#9ca3af',
    fontSize: 16,
    marginTop: 16,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#F8FAFC',
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#9ca3af',
    fontWeight: '500',
  },
  featuresContainer: {
    marginBottom: 40,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  featureText: {
    fontSize: 16,
    color: '#F8FAFC',
    marginLeft: 16,
    fontWeight: '500',
  },
  pricingContainer: {
    backgroundColor: '#374151',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    alignItems: 'center',
  },
  productTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F8FAFC',
    marginBottom: 8,
  },
  productPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fbbf24',
    marginBottom: 8,
  },
  productDescription: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    marginBottom: 12,
  },
  subscriptionDetails: {
    fontSize: 13,
    color: '#d1d5db',
    textAlign: 'center',
    lineHeight: 18,
  },
  purchaseButton: {
    backgroundColor: '#3182CE',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  disabledButton: {
    backgroundColor: '#4b5563',
  },
  purchaseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  restoreButton: {
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  restoreButtonText: {
    color: '#60a5fa',
    fontSize: 16,
    fontWeight: '500',
  },
  manageButton: {
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 24,
  },
  manageButtonText: {
    color: '#60a5fa',
    fontSize: 16,
    fontWeight: '500',
  },
  subscriptionNote: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 16,
  },
  legalLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  legalLinkText: {
    color: '#60a5fa',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  legalSeparator: {
    color: '#6b7280',
    fontSize: 14,
    marginHorizontal: 12,
  },
});