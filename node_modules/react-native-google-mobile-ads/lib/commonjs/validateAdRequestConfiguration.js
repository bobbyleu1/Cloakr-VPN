"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.validateAdRequestConfiguration = validateAdRequestConfiguration;
var _common = require("./common");
var _MaxAdContentRating = require("./MaxAdContentRating");
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

function validateAdRequestConfiguration(requestConfiguration) {
  const out = {};
  if (!(0, _common.isObject)(requestConfiguration)) {
    throw new Error("'requestConfiguration' expected an object value");
  }
  if (requestConfiguration.maxAdContentRating) {
    if (requestConfiguration.maxAdContentRating !== _MaxAdContentRating.MaxAdContentRating.G && requestConfiguration.maxAdContentRating !== _MaxAdContentRating.MaxAdContentRating.PG && requestConfiguration.maxAdContentRating !== _MaxAdContentRating.MaxAdContentRating.T && requestConfiguration.maxAdContentRating !== _MaxAdContentRating.MaxAdContentRating.MA) {
      throw new Error("'requestConfiguration.maxAdContentRating' expected on of MaxAdContentRating.G, MaxAdContentRating.PG, MaxAdContentRating.T or MaxAdContentRating.MA");
    }
    out.maxAdContentRating = requestConfiguration.maxAdContentRating;
  }
  if ((0, _common.isPropertySet)(requestConfiguration, 'tagForChildDirectedTreatment')) {
    if (!(0, _common.isBoolean)(requestConfiguration.tagForChildDirectedTreatment)) {
      throw new Error("'requestConfiguration.tagForChildDirectedTreatment' expected a boolean value");
    }
    out.tagForChildDirectedTreatment = requestConfiguration.tagForChildDirectedTreatment;
  }
  if ((0, _common.isPropertySet)(requestConfiguration, 'tagForUnderAgeOfConsent')) {
    if (!(0, _common.isBoolean)(requestConfiguration.tagForUnderAgeOfConsent)) {
      throw new Error("'requestConfiguration.tagForUnderAgeOfConsent' expected a boolean value");
    }
    out.tagForUnderAgeOfConsent = requestConfiguration.tagForUnderAgeOfConsent;
  }
  if ((0, _common.isPropertySet)(requestConfiguration, 'testDeviceIdentifiers')) {
    if (!(0, _common.isArray)(requestConfiguration.testDeviceIdentifiers)) {
      throw new Error("'requestConfiguration.testDeviceIdentifiers' expected an array value");
    }
    out.testDeviceIdentifiers = requestConfiguration.testDeviceIdentifiers;
  }
  return out;
}
//# sourceMappingURL=validateAdRequestConfiguration.js.map