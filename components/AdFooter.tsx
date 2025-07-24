// components/AdFooter.tsx
import React, { useState } from 'react';
import { View, Platform } from 'react-native';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';

const BANNER_ID = __DEV__ ? TestIds.BANNER : 'ca-app-pub-xxxxxxxxxxxxxxxx/xxxxxxxxxx';

export default function AdFooter({ onHeight }: { onHeight?: (h: number) => void }) {
  const [measured, setMeasured] = useState(false);

  return (
    <View
      style={{ position: 'absolute', bottom: 0, width: '100%' }}
      onLayout={e => {
        if (measured) return;
        setMeasured(true);
        onHeight?.(e.nativeEvent.layout.height || (Platform.OS === 'ios' ? 66 : 50));
      }}
    >
      <BannerAd unitId={BANNER_ID} size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER} />
    </View>
  );
}
