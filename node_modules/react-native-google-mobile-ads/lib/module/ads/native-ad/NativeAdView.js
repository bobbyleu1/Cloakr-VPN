function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
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

import React, { useRef } from 'react';
import { NativeAdContext } from './NativeAdContext';
import GoogleMobileAdsNativeView from '../../specs/components/GoogleMobileAdsNativeViewNativeComponent';
export const NativeAdView = props => {
  const {
    nativeAd,
    children,
    ...viewProps
  } = props;
  const ref = useRef(null);
  return /*#__PURE__*/React.createElement(GoogleMobileAdsNativeView, _extends({}, viewProps, {
    ref: ref,
    responseId: nativeAd.responseId,
    removeClippedSubviews: false
  }), /*#__PURE__*/React.createElement(NativeAdContext.Provider, {
    value: {
      nativeAd,
      viewRef: ref
    }
  }, children));
};
//# sourceMappingURL=NativeAdView.js.map