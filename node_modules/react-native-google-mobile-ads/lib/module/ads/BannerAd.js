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

import React, { createRef } from 'react';
import { BaseAd } from './BaseAd';
import { Commands } from '../specs/components/GoogleMobileAdsBannerViewNativeComponent';
export class BannerAd extends React.Component {
  ref = /*#__PURE__*/createRef();
  load() {
    if (this.ref.current) {
      Commands.load(this.ref.current);
    }
  }
  render() {
    return /*#__PURE__*/React.createElement(BaseAd, _extends({
      ref: this.ref,
      sizes: [this.props.size]
    }, this.props));
  }
}
//# sourceMappingURL=BannerAd.js.map