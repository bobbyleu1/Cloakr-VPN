// ads/interstitial.ts

import {
  InterstitialAd,
  AdEventType,
  TestIds,
} from 'react-native-google-mobile-ads';

const UNIT_ID = __DEV__
  ? TestIds.INTERSTITIAL
  : 'ca-app-pub-xxxxxxxxxxxxxxxx/xxxxxxxxxx';

//
// Create exactly one InterstitialAd instance and keep it around
//
const interstitial = InterstitialAd.createForAdRequest(UNIT_ID, {
  requestNonPersonalizedAdsOnly: true,
});

let isLoaded = false;

//
// Hook up our one-time listeners
//
interstitial.addAdEventListener(AdEventType.LOADED, () => {
  isLoaded = true;
});

interstitial.addAdEventListener(AdEventType.ERROR, () => {
  // mark not loaded; we'll reload below
  isLoaded = false;
});

interstitial.addAdEventListener(AdEventType.CLOSED, () => {
  // every time the user closes it, reset flag + reload
  isLoaded = false;
  interstitial.load();
});

//
// Kick off the first load
//
export function initInterstitial() {
  interstitial.load();
}

//
// showAdWhile: if we have a loaded ad, show it, run `task()` while it’s onscreen,
// then resolve with the task’s return (or reject if it throws).
// If no ad is ready, we just run the task immediately.
//
export async function showAdWhile<T>(task: () => Promise<T>): Promise<T> {
  // no ad? skip straight to your task
  if (!isLoaded) {
    return task();
  }

  return new Promise<T>((resolve, reject) => {
    let result!: T;
    let error: unknown;

    // 1) When the ad opens, run your task
    const unsubOpen = interstitial.addAdEventListener(
      AdEventType.OPENED,
      async () => {
        try {
          result = await task();
        } catch (e) {
          error = e;
        }
      }
    );

    // 2) When the ad closes, clean up + resolve or reject
    const unsubClose = interstitial.addAdEventListener(
      AdEventType.CLOSED,
      () => {
        unsubOpen();
        unsubClose();

        if (error !== undefined) {
          reject(error);
        } else {
          resolve(result);
        }
      }
    );

    // 3) Show it!
    interstitial.show().catch((showErr) => {
      // if .show() itself errors, remove listeners and fallback
      unsubOpen();
      unsubClose();
      task().then(resolve).catch(reject);
    });
  });
}
