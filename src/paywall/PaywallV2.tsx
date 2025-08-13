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
  ScrollView,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { 
  purchaseSubscription, 
  restoreSubscription, 
  loadProductAndPrice, 
  getCachedPrice, 
  openManageSubscriptions,
  initIAP 
} from '../iap/iap';

interface PaywallV2Props {
  onClose: () => void;
  onPurchaseSuccess?: () => void;
}

interface RemoteConfig {
  ui?: {
    showManageSubscriptionsLink?: boolean;
  };
}

export const PaywallV2: React.FC<PaywallV2Props> = ({ 
  onClose, 
  onPurchaseSuccess 
}) => {
  const { 
    status, 
    isPremium, 
    price, 
    loading, 
    buy, 
    restore, 
    openManageSubscriptions 
  } = useEntitlements();

  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [showManageLink, setShowManageLink] = useState(false);
  const [priceLoaded, setPriceLoaded] = useState(false);

  // Fetch remote config for UI flags
  useEffect(() => {
    const fetchRemoteConfig = async () => {
      try {
        const response = await fetch('https://bobbyleu1.github.io/cloakr-remote-config/');
        const config: RemoteConfig = await response.json();
        
        if (config.ui?.showManageSubscriptionsLink) {
          setShowManageLink(true);
        }
      } catch (error) {
        console.warn(`${IAP_LOG_PREFIX} Failed to fetch remote config for paywall:`, error);
      }
    };

    fetchRemoteConfig();
  }, []);

  // Track when price loads
  useEffect(() => {
    if (price && price !== '$5.99') {
      setPriceLoaded(true);
    }
  }, [price]);

  /**
   * Handle purchase button tap
   */
  const handlePurchase = useCallback(async () => {
    if (purchasing || loading) {
      console.log(`${IAP_LOG_PREFIX} Purchase blocked - already in progress`);
      return;
    }

    console.log(`${IAP_LOG_PREFIX} Purchase button tapped - starting flow`);
    setPurchasing(true);

    try {
      // Import and run diagnostics before purchase
      const { dumpDiagnostics } = await import('../iap/iapV2');
      console.log(`${IAP_LOG_PREFIX} Running pre-purchase diagnostics:`);
      dumpDiagnostics();

      console.log(`${IAP_LOG_PREFIX} Calling buy() function...`);
      const result = await buy();
      console.log(`${IAP_LOG_PREFIX} Buy result: ${result}`);
      
      // Success - buy() should handle the purchase flow validation
      Alert.alert(
        'Premium Unlocked!',
        'You now have unlimited VPN access with no ads.',
        [
          { 
            text: 'OK', 
            onPress: () => {
              onPurchaseSuccess?.();
            }
          }
        ]
      );

    } catch (error) {
      console.error(`${IAP_LOG_PREFIX} Purchase failed:`, error);
      
      // Don't show error for user cancellation
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (!errorMessage.includes('cancelled') && !errorMessage.includes('CANCELLED')) {
        Alert.alert(
          'Purchase Failed',
          'Unable to complete purchase. Please try again.',
          [{ text: 'OK' }]
        );
      }
    } finally {
      console.log(`${IAP_LOG_PREFIX} Purchase flow completed, clearing loading state`);
      setPurchasing(false);
    }
  }, [purchasing, loading, buy, onPurchaseSuccess]);

  /**
   * Handle restore button tap
   */
  const handleRestore = useCallback(async () => {
    if (restoring || loading) return;

    console.log(`${IAP_LOG_PREFIX} Restore button tapped`);
    setRestoring(true);

    try {
      await restore();
      
      // Success
      Alert.alert(
        'Premium Restored!',
        'Your subscription has been restored successfully.',
        [
          { 
            text: 'OK', 
            onPress: () => {
              onPurchaseSuccess?.();
            }
          }
        ]
      );

    } catch (error) {
      console.error(`${IAP_LOG_PREFIX} Restore failed:`, error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      let title = 'Restore Failed';
      let message = 'Unable to restore purchases. Please try again.';

      switch (errorMessage) {
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
          message = 'Server error occurred while validating your purchase. Please try again later.';
          break;
      }

      Alert.alert(title, message, [{ text: 'OK' }]);
    } finally {
      setRestoring(false);
    }
  }, [restoring, loading, restore, onPurchaseSuccess]);

  /**
   * Open privacy policy
   */
  const openPrivacyPolicy = useCallback(() => {
    Linking.openURL('https://vroomautomotivegroup.com/cloakr-privacy-policy');
  }, []);

  /**
   * Open terms of use (Apple EULA)
   */
  const openTermsOfUse = useCallback(() => {
    Linking.openURL('https://www.apple.com/legal/internet-services/itunes/dev/stdeula/');
  }, []);

  /**
   * Handle manage subscriptions
   */
  const handleManageSubscriptions = useCallback((): void => {
    console.log('[IAP] Opening manage subscriptions');
    openManageSubscriptions();
  }, []);

  const displayPrice = price || 'Loading price...';
  const canPurchase = !purchasing && !loading && !!price;

  // TEMPORARY DEBUG FUNCTION - Remove after fixing
  const debugIAP = async () => {
    console.log('🔍 === DEBUG IAP START ===');
    
    try {
      console.log('🔍 Testing direct purchase call...');
      const result = await purchaseSubscription();
      console.log('🔍 Direct purchase result:', result);
      
    } catch (error) {
      console.error('🔍 Debug test failed:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <FontAwesome5 name="times" size={24} color="#9ca3af" />
          </TouchableOpacity>
        </View>

        {/* Hero Section */}
        <View style={styles.heroSection}>
          <FontAwesome5 name="crown" size={60} color="#fbbf24" />
          <Text style={styles.title}>Cloakr Unlimited</Text>
          <Text style={styles.subtitle}>Auto-renewing monthly subscription</Text>
        </View>

        {/* Features */}
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

        {/* Pricing */}
        <View style={styles.pricingContainer}>
          <Text style={styles.productTitle}>Cloakr Unlimited</Text>
          <Text style={styles.productPrice}>{displayPrice}/month</Text>
          <Text style={styles.productDescription}>
            Unlimited VPN access with no ads
          </Text>
        </View>

        {/* TEMPORARY DEBUG BUTTON - Remove after fixing */}
        <TouchableOpacity
          style={[styles.purchaseButton, { backgroundColor: '#dc2626', marginBottom: 16 }]}
          onPress={debugIAP}
        >
          <Text style={styles.purchaseButtonText}>🔍 DEBUG IAP</Text>
        </TouchableOpacity>

        {/* Purchase Button */}
        <TouchableOpacity
          style={[
            styles.purchaseButton, 
            !canPurchase && styles.disabledButton
          ]}
          onPress={handlePurchase}
          disabled={!canPurchase}
        >
          {purchasing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <FontAwesome5 name="crown" size={16} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.purchaseButtonText}>
                {price ? `Subscribe for ${price}/month` : 'Loading...'}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Restore Button */}
        <TouchableOpacity
          style={styles.restoreButton}
          onPress={handleRestore}
          disabled={restoring || loading}
        >
          {restoring ? (
            <ActivityIndicator size="small" color="#60a5fa" />
          ) : (
            <Text style={styles.restoreButtonText}>Restore Purchases</Text>
          )}
        </TouchableOpacity>

        {/* Manage Subscriptions (conditional) */}
        {showManageLink && (
          <TouchableOpacity
            style={styles.manageButton}
            onPress={handleManageSubscriptions}
          >
            <Text style={styles.manageButtonText}>Manage Subscriptions</Text>
          </TouchableOpacity>
        )}

        {/* Auto-renewal notice */}
        <Text style={styles.subscriptionNote}>
          Subscription automatically renews unless auto-renew is turned off at least 24 hours before the end of the current period.
        </Text>

        {/* Legal Links */}
        <View style={styles.legalLinks}>
          <TouchableOpacity onPress={openPrivacyPolicy}>
            <Text style={styles.legalLinkText}>Privacy Policy</Text>
          </TouchableOpacity>
          <Text style={styles.legalSeparator}>•</Text>
          <TouchableOpacity onPress={openTermsOfUse}>
            <Text style={styles.legalLinkText}>Terms of Use</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingTop: 10,
    paddingBottom: 20,
  },
  closeButton: {
    padding: 8,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 40,
    paddingTop: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#F8FAFC',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#9ca3af',
    fontWeight: '500',
    textAlign: 'center',
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
    textAlign: 'center',
  },
  productPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fbbf24',
    marginBottom: 8,
    textAlign: 'center',
  },
  productDescription: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
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
    marginBottom: 16,
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
    marginTop: 8,
  },
  legalLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 20,
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