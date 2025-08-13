import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  SafeAreaView,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import {
  BannerAd,
  BannerAdSize,
  InterstitialAd,
  AdEventType,
} from 'react-native-google-mobile-ads';
import mobileAds from 'react-native-google-mobile-ads';

// 🎯 AdMob IDs
const BANNER_ID = __DEV__
  ? 'ca-app-pub-3940256099942544/6300978111' // Test Ad
  : Platform.select({
      ios: 'ca-app-pub-6842873031676463/2117401957', // Your iOS Banner ID
      android: 'ca-app-pub-6842873031676463/5740080053', // Your Android Banner ID
    });

const INTERSTITIAL_ID = __DEV__
  ? 'ca-app-pub-3940256099942544/1033173712' // Test Ad
  : Platform.select({
      ios: 'ca-app-pub-6842873031676463/2607322702', // Your iOS Interstitial ID
      android: 'ca-app-pub-6842873031676463/8103191969', // Your Android Interstitial ID
    });

export default function App() {
  const [modalVisible, setModalVisible] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  // Store the ad instance and its loaded state in component state
  const [interstitial, setInterstitial] = useState(null);
  const [adLoaded, setAdLoaded] = useState(false);

  useEffect(() => {
    let unsubscribeAdEvents;

    mobileAds
      .initialize()
      .then(() => {
        console.log('AdMob initialized');
        // Create the ad instance only after initialization is complete
        const newInterstitial = new InterstitialAd(INTERSTITIAL_ID, {
          requestNonPersonalizedAdsOnly: true,
        });

        // Set up event listeners for the new ad instance
        unsubscribeAdEvents = newInterstitial.addAdEventListener(
          AdEventType.LOADED,
          () => {
            console.log('Interstitial ad loaded');
            setAdLoaded(true);
          }
        );

        // Load the ad
        newInterstitial.load();
        setInterstitial(newInterstitial);
      })
      .catch((error) => {
        console.error('AdMob initialization failed:', error);
      });

    return () => {
      // Clean up the event listener
      if (unsubscribeAdEvents) {
        unsubscribeAdEvents();
      }
    };
  }, []);

  // Shows the ad, then runs the callback
  const showAdThen = (callback) => {
    if (adLoaded) {
      const unsubscribe = interstitial.addAdEventListener(
        AdEventType.CLOSED,
        () => {
          unsubscribe();
          interstitial.load(); // Load the next ad
          setAdLoaded(false); // Reset loaded state
          callback();
        }
      );
      interstitial.show();
    } else {
      callback(); // Fallback if the ad isn't loaded
    }
  };

  const handleConnect = () => {
    showAdThen(() => {
      setIsConnected(true);
      setModalVisible(true);
    });
  };

  const handleDisconnect = () => {
    showAdThen(() => {
      setIsConnected(false);
      setModalVisible(false);
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      <Text style={styles.title}>CLOAKR VPN</Text>

      <TouchableOpacity
        style={styles.button}
        onPress={isConnected ? handleDisconnect : handleConnect}
      >
        <Text style={styles.buttonText}>
          {isConnected ? 'Disconnect' : 'Connect to VPN'}
        </Text>
      </TouchableOpacity>

      {/* Banner Ad */}
      <View style={styles.adContainer}>
        <BannerAd
          unitId={BANNER_ID}
          size={BannerAdSize.FULL_BANNER}
          requestOptions={{ requestNonPersonalizedAdsOnly: true }}
        />
      </View>

      {/* Modal Instructions */}
      <Modal animationType="slide" transparent={true} visible={modalVisible}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Manual VPN Setup (iPhone)</Text>
            <View style={styles.infoContainer}>
              <Text style={styles.info}>Type: L2TP over IPSec</Text>
              <Text style={styles.info}>Server: 68.183.9.224</Text>
              <Text style={styles.info}>Username: vpnuser</Text>
              <Text style={styles.info}>Password: cloakr123</Text>
              <Text style={styles.info}>Secret (PSK): cloakrkey123</Text>
            </View>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleDisconnect}
            >
              <Text style={styles.buttonText}>Disconnect</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 80 : 50,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#f8fafc',
    marginBottom: 40,
    textAlign: 'center',
    letterSpacing: 1.2,
  },
  button: {
    backgroundColor: '#1e40af',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginBottom: 20,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 1,
  },
  adContainer: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: '#000000cc',
    justifyContent: 'center',
    padding: 20,
  },
  modalBox: {
    backgroundColor: '#1f2937',
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 20,
  },
  infoContainer: {
    width: '100%',
    marginBottom: 20,
  },
  info: {
    fontSize: 16,
    color: '#d1d5db',
    marginVertical: 4,
  },
  closeButton: {
    backgroundColor: '#334155',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
});