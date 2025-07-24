"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.NativeMediaView = void 0;
var _react = _interopRequireWildcard(require("react"));
var _GoogleMobileAdsMediaViewNativeComponent = _interopRequireDefault(require("../../specs/components/GoogleMobileAdsMediaViewNativeComponent"));
var _NativeAsset = require("./NativeAsset");
var _NativeAdContext = require("./NativeAdContext");
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
function _getRequireWildcardCache(e) { if ("function" != typeof WeakMap) return null; var r = new WeakMap(), t = new WeakMap(); return (_getRequireWildcardCache = function (e) { return e ? t : r; })(e); }
function _interopRequireWildcard(e, r) { if (!r && e && e.__esModule) return e; if (null === e || "object" != typeof e && "function" != typeof e) return { default: e }; var t = _getRequireWildcardCache(r); if (t && t.has(e)) return t.get(e); var n = { __proto__: null }, a = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var u in e) if ("default" !== u && {}.hasOwnProperty.call(e, u)) { var i = a ? Object.getOwnPropertyDescriptor(e, u) : null; i && (i.get || i.set) ? Object.defineProperty(n, u, i) : n[u] = e[u]; } return n.default = e, t && t.set(e, n), n; }
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); } /*
 * Copyright (c) 2016-present Invertase Limited & Contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this library except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */
const NativeMediaView = props => {
  const {
    resizeMode,
    style,
    ...viewProps
  } = props;
  const {
    nativeAd
  } = (0, _react.useContext)(_NativeAdContext.NativeAdContext);
  const {
    responseId,
    mediaContent
  } = nativeAd;
  return (
    /*#__PURE__*/
    // @ts-ignore
    _react.default.createElement(_NativeAsset.NativeAsset, {
      assetType: 'media'
    }, /*#__PURE__*/_react.default.createElement(_GoogleMobileAdsMediaViewNativeComponent.default, _extends({}, viewProps, {
      responseId: responseId,
      resizeMode: resizeMode,
      style: [{
        aspectRatio: mediaContent === null || mediaContent === void 0 ? void 0 : mediaContent.aspectRatio
      }, style]
    })))
  );
};
exports.NativeMediaView = NativeMediaView;
//# sourceMappingURL=NativeMediaView.js.map