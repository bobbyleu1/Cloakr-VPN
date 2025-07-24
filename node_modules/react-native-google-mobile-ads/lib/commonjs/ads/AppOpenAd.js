"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.AppOpenAd = void 0;
var _common = require("../common");
var _validateAdRequestOptions = require("../validateAdRequestOptions");
var _MobileAd = require("./MobileAd");
var _NativeAppOpenModule = _interopRequireDefault(require("../specs/modules/NativeAppOpenModule"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
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

class AppOpenAd extends _MobileAd.MobileAd {
  static _appOpenRequest = 0;
  static createForAdRequest(adUnitId, requestOptions) {
    if (!(0, _common.isString)(adUnitId)) {
      throw new Error("AppOpenAd.createForAdRequest(*) 'adUnitId' expected an string value.");
    }
    let options = {};
    try {
      options = (0, _validateAdRequestOptions.validateAdRequestOptions)(requestOptions);
    } catch (e) {
      if (e instanceof Error) {
        throw new Error(`AppOpenAd.createForAdRequest(_, *) ${e.message}.`);
      }
    }
    const requestId = AppOpenAd._appOpenRequest++;
    return new AppOpenAd('app_open', requestId, adUnitId, _NativeAppOpenModule.default.appOpenLoad, _NativeAppOpenModule.default.appOpenShow, options);
  }
  addAdEventsListener(listener) {
    return this._addAdEventsListener(listener);
  }
  addAdEventListener(type, listener) {
    return this._addAdEventListener(type, listener);
  }
}
exports.AppOpenAd = AppOpenAd;
//# sourceMappingURL=AppOpenAd.js.map