import React from 'react';
import { AdEventType, BannerAd, InterstitialAd, RewardedAd, RewardedAdEventType } from 'react-native-google-mobile-ads';

export const BANNER_ID = 'ca-app-pub-6842873031676463/2117401957';
// Use test ad for now to ensure ads load
export const REWARDED_AD_ID = 'ca-app-pub-3940256099942544/5224354917';

let isPremiumUser = false;
let adsEnabled = true;

export const setIsPremium = (premium: boolean) => {
  isPremiumUser = premium;
};

export const setAdsEnabled = (enabled: boolean) => {
  adsEnabled = enabled;
};

export const getIsPremium = (): boolean => {
  return isPremiumUser;
};

const shouldBlockAds = (): boolean => {
  return isPremiumUser || !adsEnabled;
};

// Banner Ad Component Wrapper
export const PremiumBannerAd = (props: any) => {
  const blocked = shouldBlockAds();
  console.log('PremiumBannerAd:', { blocked, isPremiumUser, adsEnabled });
  
  if (blocked) {
    console.log('Banner ad blocked - isPremium:', isPremiumUser, 'adsEnabled:', adsEnabled);
    return null;
  }
  
  console.log('Showing banner ad');
  return <BannerAd {...props} />;
};

// Rewarded Ad Wrapper
export class PremiumRewardedAd {
  private rewardedAd: RewardedAd | null = null;

  constructor(adUnitId: string, requestOptions?: any) {
    console.log('PremiumRewardedAd constructor:', { adUnitId, shouldBlock: shouldBlockAds(), isPremiumUser, adsEnabled });
    if (!shouldBlockAds()) {
      this.rewardedAd = RewardedAd.createForAdRequest(adUnitId, requestOptions);
      console.log('PremiumRewardedAd created successfully');
    } else {
      console.log('PremiumRewardedAd blocked due to premium status or ads disabled');
    }
  }

  addAdEventListener(eventType: string, listener: (...args: any[]) => void) {
    if (shouldBlockAds() || !this.rewardedAd) {
      return () => {};
    }
    
    // Map string event types to proper enum values
    let adEventType;
    switch (eventType) {
      case 'loaded':
        adEventType = RewardedAdEventType.LOADED;
        break;
      case 'earned_reward':
        adEventType = RewardedAdEventType.EARNED_REWARD;
        break;
      case 'failed_to_load':
        adEventType = AdEventType.ERROR;
        break;
      default:
        adEventType = eventType as any;
    }
    
    return this.rewardedAd.addAdEventListener(adEventType, listener);
  }

  load() {
    if (shouldBlockAds() || !this.rewardedAd) {
      console.log('PremiumRewardedAd.load() blocked or no ad instance', { 
        shouldBlock: shouldBlockAds(), 
        hasAd: !!this.rewardedAd,
        isPremiumUser,
        adsEnabled 
      });
      return Promise.resolve();
    }
    
    console.log('PremiumRewardedAd.load() attempting to load ad');
    try {
      return this.rewardedAd.load();
    } catch (error) {
      console.error('PremiumRewardedAd.load() failed:', error);
      return Promise.reject(error);
    }
  }

  show() {
    if (shouldBlockAds() || !this.rewardedAd) {
      return Promise.resolve();
    }
    
    return this.rewardedAd.show();
  }
}

// Interstitial Ad Wrapper
export class PremiumInterstitialAd {
  private interstitialAd: InterstitialAd | null = null;

  constructor(adUnitId: string, requestOptions?: any) {
    if (!shouldBlockAds()) {
      this.interstitialAd = InterstitialAd.createForAdRequest(adUnitId, requestOptions);
    }
  }

  addAdEventListener(eventType: string, listener: (...args: any[]) => void) {
    if (shouldBlockAds() || !this.interstitialAd) {
      return () => {};
    }
    
    // Map string event types to proper enum values
    let adEventType;
    switch (eventType) {
      case 'loaded':
        adEventType = AdEventType.LOADED;
        break;
      default:
        adEventType = eventType as any;
    }
    
    return this.interstitialAd.addAdEventListener(adEventType, listener);
  }

  load() {
    if (shouldBlockAds() || !this.interstitialAd) {
      return Promise.resolve();
    }
    
    return this.interstitialAd.load();
  }

  show() {
    if (shouldBlockAds() || !this.interstitialAd) {
      return Promise.resolve();
    }
    
    return this.interstitialAd.show();
  }
}

// Helper functions
export const shouldShowAds = (): boolean => {
  return !shouldBlockAds();
};

export const canShowRewardedAd = (): boolean => {
  return !shouldBlockAds();
};

export const canShowInterstitialAd = (): boolean => {
  return !shouldBlockAds();
};