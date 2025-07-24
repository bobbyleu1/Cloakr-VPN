// app/(tabs)/index.tsx
import React, { useEffect, useState, useCallback } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

import { showAdWhile } from '../../ads/interstitial';
import { connectVPN, disconnectVPN, observeVPN, NativeVpnState } from '../../services/vpn';

type Status = 'disconnected' | 'connecting' | 'connected' | 'disconnecting';

// ← Replace this with YOUR Outline access key (from your DO droplet)
const ACCESS_KEY = 'YOUR_OUTLINE_ACCESS_KEY_HERE';

export default function HomeScreen() {
  const [status, setStatus] = useState<Status>('disconnected');

  // Subscribe to native VPN state events
  useEffect(() => {
    const unsub = observeVPN((state: NativeVpnState) => {
      switch (state) {
        case 'CONNECTED':
          setStatus('connected');
          break;
        case 'DISCONNECTED':
          setStatus('disconnected');
          break;
        case 'CONNECTING':
          setStatus('connecting');
          break;
        case 'DISCONNECTING':
          setStatus('disconnecting');
          break;
        default:
          setStatus('disconnected');
      }
    });
    return unsub;
  }, []);

  const handleConnect = useCallback(async () => {
    setStatus('connecting');
    try {
      // shows interstitial while we call your VPN connect routine
      await showAdWhile(() => connectVPN(ACCESS_KEY));
      // final "connected" state will arrive via observeVPN
    } catch (err) {
      console.warn('VPN connect error:', err);
      setStatus('disconnected');
    }
  }, []);

  const handleDisconnect = useCallback(async () => {
    setStatus('disconnecting');
    try {
      await showAdWhile(disconnectVPN);
      // final "disconnected" state will arrive via observeVPN
    } catch (err) {
      console.warn('VPN disconnect error:', err);
      setStatus('connected');
    }
  }, []);

  const isBusy = status === 'connecting' || status === 'disconnecting';
  const isConnected = status === 'connected' || status === 'disconnecting';

  const dotColor =
    status === 'connected'
      ? '#22C55E'
      : isBusy
      ? '#F59E0B'
      : '#EF4444';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ThemedView style={styles.container}>
        {/* Title */}
        <ThemedText style={styles.title}>Cloakr VPN</ThemedText>

        {/* Status Indicator */}
        <View style={styles.statusRow}>
          <View style={[styles.dot, { backgroundColor: dotColor }]} />
          <ThemedText style={styles.statusText}>{status.toUpperCase()}</ThemedText>
        </View>

        {/* Connect / Disconnect Button */}
        <Pressable
          style={[
            styles.btn,
            isConnected && styles.disconnectBtn,
            isBusy && styles.busy,
          ]}
          onPress={isConnected ? handleDisconnect : handleConnect}
          disabled={isBusy}
        >
          {isBusy ? (
            <ActivityIndicator size="large" color="#fff" />
          ) : (
            <ThemedText style={styles.btnText}>
              {isConnected ? 'DISCONNECT' : 'CONNECT'}
            </ThemedText>
          )}
        </Pressable>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 90 : 70, // leave space for bottom banner
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    color: '#f8fafc',
    marginBottom: 36,
    textAlign: 'center',
    letterSpacing: 1.2,
    lineHeight: 40,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 28,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  statusText: {
    letterSpacing: 1,
    fontSize: 14,
    color: '#e2e8f0',
  },
  btn: {
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: '#4f46e5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  disconnectBtn: {
    backgroundColor: '#0284c7',
  },
  busy: {
    opacity: 0.7,
  },
  btnText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 1,
  },
});
