var _RNGoogleMobileAdsMod;
import RNGoogleMobileAdsModule from '../specs/modules/NativeGoogleMobileAdsModule';
const {
  REVENUE_PRECISION_ESTIMATED,
  REVENUE_PRECISION_PRECISE,
  REVENUE_PRECISION_PUBLISHER_PROVIDED,
  REVENUE_PRECISION_UNKNOWN
} = ((_RNGoogleMobileAdsMod = RNGoogleMobileAdsModule.getConstants) === null || _RNGoogleMobileAdsMod === void 0 ? void 0 : _RNGoogleMobileAdsMod.call(RNGoogleMobileAdsModule)) ?? {};
export let RevenuePrecisions = /*#__PURE__*/function (RevenuePrecisions) {
  RevenuePrecisions[RevenuePrecisions["ESTIMATED"] = REVENUE_PRECISION_ESTIMATED] = "ESTIMATED";
  RevenuePrecisions[RevenuePrecisions["PRECISE"] = REVENUE_PRECISION_PRECISE] = "PRECISE";
  RevenuePrecisions[RevenuePrecisions["PUBLISHER_PROVIDED"] = REVENUE_PRECISION_PUBLISHER_PROVIDED] = "PUBLISHER_PROVIDED";
  RevenuePrecisions[RevenuePrecisions["UNKNOWN"] = REVENUE_PRECISION_UNKNOWN] = "UNKNOWN";
  return RevenuePrecisions;
}({});
//# sourceMappingURL=constants.js.map