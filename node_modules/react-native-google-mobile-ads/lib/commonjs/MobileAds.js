"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = exports.MobileAds = void 0;
var _NativeGoogleMobileAdsModule = _interopRequireDefault(require("./specs/modules/NativeGoogleMobileAdsModule"));
var _validateAdRequestConfiguration = require("./validateAdRequestConfiguration");
var _SharedEventEmitter = require("./internal/SharedEventEmitter");
var _GoogleMobileAdsNativeEventEmitter = require("./internal/GoogleMobileAdsNativeEventEmitter");
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
const NATIVE_MODULE_EVENT_SUBSCRIPTIONS = {};
const nativeEvents = ['google_mobile_ads_app_open_event', 'google_mobile_ads_interstitial_event', 'google_mobile_ads_rewarded_event', 'google_mobile_ads_rewarded_interstitial_event'];
class MobileAdsModule {
  constructor() {
    if (nativeEvents && nativeEvents.length) {
      for (let i = 0, len = nativeEvents.length; i < len; i++) {
        this.subscribeToNativeModuleEvent(nativeEvents[i]);
      }
    }
  }
  subscribeToNativeModuleEvent(eventName) {
    if (!NATIVE_MODULE_EVENT_SUBSCRIPTIONS[eventName]) {
      _GoogleMobileAdsNativeEventEmitter.GoogleMobileAdsNativeEventEmitter.addListener(eventName, event => {
        _SharedEventEmitter.SharedEventEmitter.emit(`${eventName}:${event.adUnitId}:${event.requestId}`, event);
      });
      NATIVE_MODULE_EVENT_SUBSCRIPTIONS[eventName] = true;
    }
  }
  initialize() {
    return _NativeGoogleMobileAdsModule.default.initialize();
  }
  setRequestConfiguration(requestConfiguration) {
    let config;
    try {
      config = (0, _validateAdRequestConfiguration.validateAdRequestConfiguration)(requestConfiguration);
    } catch (e) {
      if (e instanceof Error) {
        throw new Error(`googleMobileAds.setRequestConfiguration(*) ${e.message}`);
      }
    }
    return _NativeGoogleMobileAdsModule.default.setRequestConfiguration(config);
  }
  openAdInspector() {
    return _NativeGoogleMobileAdsModule.default.openAdInspector();
  }
  openDebugMenu(adUnit) {
    if (!adUnit) throw new Error('googleMobileAds.openDebugMenu expected a non-empty string value');
    _NativeGoogleMobileAdsModule.default.openDebugMenu(adUnit);
  }
  setAppVolume(volume) {
    if (volume < 0 || volume > 1) throw new Error('The app volume must be a value between 0 and 1 inclusive.');
    _NativeGoogleMobileAdsModule.default.setAppVolume(volume);
  }
  setAppMuted(muted) {
    _NativeGoogleMobileAdsModule.default.setAppMuted(muted);
  }
}
const MobileAdsInstance = new MobileAdsModule();
const MobileAds = () => {
  return MobileAdsInstance;
};
exports.MobileAds = MobileAds;
var _default = exports.default = MobileAds;
//# sourceMappingURL=MobileAds.js.map