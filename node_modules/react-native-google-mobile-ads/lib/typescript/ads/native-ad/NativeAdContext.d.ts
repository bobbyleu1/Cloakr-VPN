import { NativeAd } from './NativeAd';
import React, { RefObject } from 'react';
import type GoogleMobileAdsNativeView from '../../specs/components/GoogleMobileAdsNativeViewNativeComponent';
type NativeAdContextType = {
    nativeAd: NativeAd;
    viewRef: RefObject<React.ElementRef<typeof GoogleMobileAdsNativeView>>;
};
export declare const NativeAdContext: React.Context<NativeAdContextType>;
export {};
//# sourceMappingURL=NativeAdContext.d.ts.map