// app/(tabs)/_layout.tsx
import React, { useEffect, useState } from 'react';
import { Platform, View, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';
import { initInterstitial } from '../../ads/interstitial';

import { HapticTab } from '@/components/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

const BANNER_ID = __DEV__
  ? TestIds.BANNER
  : 'ca-app-pub-xxxxxxxxxxxxxxxx/xxxxxxxxxx';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const [bannerH, setBannerH] = useState(0);

  useEffect(() => {
    initInterstitial();
  }, []);

  return (
    <>
      {/* Wrap the Tabs navigator in a view that pads its bottom */}
      <View style={[styles.navigatorWrapper, { paddingBottom: bannerH }]}>
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarButton: HapticTab,
            tabBarBackground: TabBarBackground,
            tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
            tabBarStyle: Platform.select({
              ios: {
                position: 'absolute',
                backgroundColor: 'transparent',
                paddingBottom: bannerH,
              },
              default: { paddingBottom: bannerH },
            }),
          }}
        >
          <Tabs.Screen
            name="index"
            options={{
              title: 'Home',
              tabBarIcon: ({ color }) => (
                <IconSymbol size={28} name="house.fill" color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="explore"
            options={{
              title: 'Explore',
              tabBarIcon: ({ color }) => (
                <IconSymbol size={28} name="paperplane.fill" color={color} />
              ),
            }}
          />
        </Tabs>
      </View>

      {/* Banner Ad fixed at bottom */}
      {Platform.OS !== 'web' && (
        <View
          style={styles.adWrapper}
          onLayout={e => {
            const h = e.nativeEvent.layout.height;
            if (h !== bannerH) setBannerH(h);
          }}
        >
          <BannerAd
            unitId={BANNER_ID}
            size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
            requestOptions={{
              requestNonPersonalizedAdsOnly: true,
              networkExtras: { collapsible: 'bottom' },
            }}
          />
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  navigatorWrapper: {
    flex: 1,
  },
  adWrapper: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
  },
});
