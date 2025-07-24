"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.GAMInterstitialAd = void 0;
var _InterstitialAd = require("./InterstitialAd");
class GAMInterstitialAd extends _InterstitialAd.InterstitialAd {
  /**
   * Creates a new GAMInterstitialAd instance.
   *
   * #### Example
   *
   * ```js
   * import { GAMInterstitialAd, AdEventType, TestIds } from 'react-native-google-mobile-ads';
   *
   * const interstitialAd = await GAMInterstitialAd.createForAdRequest(TestIds.GAM_INTERSTITIAL, {
   *   requestAgent: 'CoolAds',
   * });
   *
   * interstitialAd.addAdEventListener(AdEventType.Loaded, () => {
   *   interstitialAd.show();
   * });
   *
   * interstitialAd.load();
   * ```
   *
   * @param adUnitId The Ad Unit ID for the Interstitial. You can find this on your Google Mobile Ads dashboard.
   * @param requestOptions Optional RequestOptions used to load the ad.
   */
  static createForAdRequest(adUnitId, requestOptions) {
    return super.createForAdRequest(adUnitId, requestOptions);
  }
  addAdEventsListener(listener) {
    return this._addAdEventsListener(listener);
  }
  addAdEventListener(type, listener) {
    return this._addAdEventListener(type, listener);
  }
}
exports.GAMInterstitialAd = GAMInterstitialAd;
//# sourceMappingURL=GAMInterstitialAd.js.map