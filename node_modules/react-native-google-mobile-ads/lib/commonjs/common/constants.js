"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RevenuePrecisions = void 0;
var _NativeGoogleMobileAdsModule = _interopRequireDefault(require("../specs/modules/NativeGoogleMobileAdsModule"));
var _RNGoogleMobileAdsMod;
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
const {
  REVENUE_PRECISION_ESTIMATED,
  REVENUE_PRECISION_PRECISE,
  REVENUE_PRECISION_PUBLISHER_PROVIDED,
  REVENUE_PRECISION_UNKNOWN
} = ((_RNGoogleMobileAdsMod = _NativeGoogleMobileAdsModule.default.getConstants) === null || _RNGoogleMobileAdsMod === void 0 ? void 0 : _RNGoogleMobileAdsMod.call(_NativeGoogleMobileAdsModule.default)) ?? {};
let RevenuePrecisions = exports.RevenuePrecisions = /*#__PURE__*/function (RevenuePrecisions) {
  RevenuePrecisions[RevenuePrecisions["ESTIMATED"] = REVENUE_PRECISION_ESTIMATED] = "ESTIMATED";
  RevenuePrecisions[RevenuePrecisions["PRECISE"] = REVENUE_PRECISION_PRECISE] = "PRECISE";
  RevenuePrecisions[RevenuePrecisions["PUBLISHER_PROVIDED"] = REVENUE_PRECISION_PUBLISHER_PROVIDED] = "PUBLISHER_PROVIDED";
  RevenuePrecisions[RevenuePrecisions["UNKNOWN"] = REVENUE_PRECISION_UNKNOWN] = "UNKNOWN";
  return RevenuePrecisions;
}({});
//# sourceMappingURL=constants.js.map