import React, { useEffect, useState } from 'react';
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
import { usePremium } from '../context/PremiumContext';
import { usePremiumConfig } from '../context/PremiumConfigContext';

interface PaywallScreenProps {
  onClose: () => void;
  onPurchaseSuccess: () => void;
}

export const PaywallScreen: React.FC<PaywallScreenProps> = ({ onClose, onPurchaseSuccess }) => {
  const { config } = usePremiumConfig();
  const { products, purchasePremium, restoreEntitlement, loadingEntitlement } = usePremium();
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const product = products.length > 0 ? products[0] : null;

  const handlePurchase = async () => {
    setPurchasing(true);
    try {
      const result = await purchasePremium();
      if (result.success) {
        Alert.alert('Success!', 'You now have unlimited VPN access!', [
          { text: 'OK', onPress: onPurchaseSuccess }
        ]);
      } else if (result.cancelled) {
        Alert.alert('Purchase Cancelled', 'The purchase was cancelled. You can try again at any time.');
      } else {
        Alert.alert('Purchase Failed', result.error || 'Something went wrong. Please try again.');
      }
    } catch (error) {
      Alert.alert('Purchase Failed', 'Something went wrong. Please try again.');
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    try {
      const restored = await restoreEntitlement();
      if (restored) {
        Alert.alert('Success!', 'Your premium subscription has been restored!', [
          { text: 'OK', onPress: onPurchaseSuccess }
        ]);
      } else {
        Alert.alert('No Active Subscription Found', 'No active premium subscription was found. If you believe this is an error, please contact support.');
      }
    } catch (error) {
      Alert.alert('Restore Failed', 'Failed to check subscription status. Please check your internet connection and try again.');
    } finally {
      setRestoring(false);
    }
  };

  const handleManageSubscriptions = () => {
    const url = 'itms-apps://apps.apple.com/account/subscriptions';
    Linking.openURL(url);
  };

  const openPrivacyPolicy = () => {
    Linking.openURL('https://vroomautomotivegroup.com/cloakr-privacy-policy');
  };

  const openTermsOfUse = () => {
    Linking.openURL('https://www.apple.com/legal/internet-services/itunes/dev/stdeula/');
  };

  if (loadingEntitlement) {
    return (
      <SafeAreaView style={styles.container}>
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

        <View style={styles.pricingContainer}>
          <Text style={styles.productTitle}>
            {product?.title || 'Cloakr Premium Monthly'}
          </Text>
          <Text style={styles.productPrice}>
            {product?.localizedPrice || '$5.99'}/month
          </Text>
          <Text style={styles.productDescription}>
            {product?.description || 'Unlimited VPN access with no ads'}
          </Text>
          <Text style={styles.subscriptionDetails}>
            • Length of subscription: 1 month{'\n'}
            • Price: {product?.localizedPrice || '$5.99'} per month{'\n'}
            • Auto-renewable subscription
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.purchaseButton, purchasing && styles.disabledButton]}
          onPress={handlePurchase}
          disabled={purchasing}
        >
          {purchasing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <FontAwesome5 name="crown" size={16} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.purchaseButtonText}>
                Subscribe for {product?.localizedPrice || '$5.99'}/month
              </Text>
            </>
          )}
        </TouchableOpacity>

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

        {config.ui.showManageSubscriptionsLink && (
          <TouchableOpacity
            style={styles.manageButton}
            onPress={handleManageSubscriptions}
          >
            <Text style={styles.manageButtonText}>Manage Subscriptions</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.subscriptionNote}>
          Subscription automatically renews unless auto-renew is turned off at least 24 hours before the end of the current period.
        </Text>

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
    marginBottom: 24,
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