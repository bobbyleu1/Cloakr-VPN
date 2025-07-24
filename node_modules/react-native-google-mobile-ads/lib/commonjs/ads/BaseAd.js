"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.BaseAd = void 0;
var _react = _interopRequireWildcard(require("react"));
var _reactNative = require("react-native");
var _common = require("../common");
var _NativeError = require("../internal/NativeError");
var _GoogleMobileAdsBannerViewNativeComponent = _interopRequireDefault(require("../specs/components/GoogleMobileAdsBannerViewNativeComponent"));
var _BannerAdSize = require("../BannerAdSize");
var _validateAdRequestOptions = require("../validateAdRequestOptions");
var _debounce = require("../common/debounce");
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
function _getRequireWildcardCache(e) { if ("function" != typeof WeakMap) return null; var r = new WeakMap(), t = new WeakMap(); return (_getRequireWildcardCache = function (e) { return e ? t : r; })(e); }
function _interopRequireWildcard(e, r) { if (!r && e && e.__esModule) return e; if (null === e || "object" != typeof e && "function" != typeof e) return { default: e }; var t = _getRequireWildcardCache(r); if (t && t.has(e)) return t.get(e); var n = { __proto__: null }, a = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var u in e) if ("default" !== u && {}.hasOwnProperty.call(e, u)) { var i = a ? Object.getOwnPropertyDescriptor(e, u) : null; i && (i.get || i.set) ? Object.defineProperty(n, u, i) : n[u] = e[u]; } return n.default = e, t && t.set(e, n), n; }
/* eslint-disable react/prop-types */
/*
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

const sizeRegex = /([0-9]+)x([0-9]+)/;
const BaseAd = exports.BaseAd = /*#__PURE__*/_react.default.forwardRef(({
  unitId,
  sizes,
  maxHeight,
  width,
  requestOptions,
  manualImpressionsEnabled,
  ...props
}, ref) => {
  const [dimensions, setDimensions] = (0, _react.useState)([0, 0]);
  const debouncedSetDimensions = (0, _debounce.debounce)(setDimensions, 100);
  (0, _react.useEffect)(() => {
    if (!unitId) {
      throw new Error("BannerAd: 'unitId' expected a valid string unit ID.");
    }
  }, [unitId]);
  (0, _react.useEffect)(() => {
    if (sizes.length === 0 || !sizes.every(size => size in _BannerAdSize.BannerAdSize || size in _BannerAdSize.GAMBannerAdSize || sizeRegex.test(size))) {
      throw new Error("BannerAd: 'size(s)' expected a valid BannerAdSize or custom size string.");
    }
  }, [sizes]);
  const validatedRequestOptions = (0, _react.useMemo)(() => {
    if (requestOptions) {
      try {
        return (0, _validateAdRequestOptions.validateAdRequestOptions)(requestOptions);
      } catch (e) {
        if (e instanceof Error) {
          throw new Error(`BannerAd: ${e.message}`);
        }
      }
    }
    return {};
  }, [requestOptions]);
  function onNativeEvent(event) {
    const nativeEvent = event.nativeEvent;
    const {
      type
    } = nativeEvent;
    if ((0, _common.isFunction)(props[type])) {
      let eventHandler, eventPayload;
      switch (type) {
        case 'onAdLoaded':
        case 'onSizeChange':
          eventPayload = {
            width: nativeEvent.width,
            height: nativeEvent.height
          };
          if (eventHandler = props[type]) eventHandler(eventPayload);
          break;
        case 'onAdFailedToLoad':
          eventPayload = _NativeError.NativeError.fromEvent(nativeEvent, 'googleMobileAds');
          if (eventHandler = props[type]) eventHandler(eventPayload);
          break;
        case 'onAppEvent':
          eventPayload = {
            name: nativeEvent.name,
            data: nativeEvent.data
          };
          if (eventHandler = props[type]) eventHandler(eventPayload);
          break;
        case 'onPaid':
          const handler = props[type];
          if (handler) {
            handler({
              currency: nativeEvent.currency,
              precision: nativeEvent.precision,
              value: nativeEvent.value
            });
          }
          break;
        default:
          if (eventHandler = props[type]) eventHandler();
      }
    }
    if (type === 'onAdLoaded' || type === 'onSizeChange') {
      const width = Math.ceil(nativeEvent.width);
      const height = Math.ceil(nativeEvent.height);
      if (width && height && JSON.stringify([width, height]) !== JSON.stringify(dimensions)) {
        /**
         * On Android, it seems the ad size is not always the definitive on the first onAdLoaded event.
         * So if we change the size here with an incorrect value, then we relayout the ad on native side
         * and it might cause an incorrect size to be set.
         *
         * To reproduce this issue, go to the example app, on the "GAMBanner Fluid" example
         * and reload the ad several times
         *
         * on my low-end Samsung A10s, it always took less than 100ms in debug mode to get the correct size
         * hence the 100ms debounce
         */
        if (sizes.includes(_BannerAdSize.GAMBannerAdSize.FLUID) && _reactNative.Platform.OS === 'android') {
          debouncedSetDimensions([width, height]);
        } else {
          setDimensions([width, height]);
        }
      }
    }
  }
  const style = sizes.includes(_BannerAdSize.GAMBannerAdSize.FLUID) ? {
    width: '100%',
    height: dimensions[1]
  } : {
    width: dimensions[0],
    height: dimensions[1]
  };
  return /*#__PURE__*/_react.default.createElement(_GoogleMobileAdsBannerViewNativeComponent.default, {
    ref: ref,
    sizeConfig: {
      sizes,
      maxHeight,
      width
    },
    style: style,
    unitId: unitId,
    request: JSON.stringify(validatedRequestOptions),
    manualImpressionsEnabled: !!manualImpressionsEnabled,
    onNativeEvent: onNativeEvent
  });
});
BaseAd.displayName = 'BaseAd';
//# sourceMappingURL=BaseAd.js.map