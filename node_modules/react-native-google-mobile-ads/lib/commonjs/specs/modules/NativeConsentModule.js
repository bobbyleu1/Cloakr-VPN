"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = exports.AdsConsentStatus = exports.AdsConsentPrivacyOptionsRequirementStatus = exports.AdsConsentDebugGeography = void 0;
var _reactNative = require("react-native");
/**
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
/**
 * AdsConsentDebugGeography enum.
 *
 * Used to set a mock location when testing the `AdsConsent` helper.
 */
let AdsConsentDebugGeography = exports.AdsConsentDebugGeography = /*#__PURE__*/function (AdsConsentDebugGeography) {
  AdsConsentDebugGeography[AdsConsentDebugGeography["DISABLED"] = 0] = "DISABLED";
  AdsConsentDebugGeography[AdsConsentDebugGeography["EEA"] = 1] = "EEA";
  AdsConsentDebugGeography[AdsConsentDebugGeography["NOT_EEA"] = 2] = "NOT_EEA";
  AdsConsentDebugGeography[AdsConsentDebugGeography["REGULATED_US_STATE"] = 3] = "REGULATED_US_STATE";
  AdsConsentDebugGeography[AdsConsentDebugGeography["OTHER"] = 4] = "OTHER";
  return AdsConsentDebugGeography;
}({});
/**
 * AdsConsentStatus enum.
 */
let AdsConsentStatus = exports.AdsConsentStatus = /*#__PURE__*/function (AdsConsentStatus) {
  AdsConsentStatus["UNKNOWN"] = "UNKNOWN";
  AdsConsentStatus["REQUIRED"] = "REQUIRED";
  AdsConsentStatus["NOT_REQUIRED"] = "NOT_REQUIRED";
  AdsConsentStatus["OBTAINED"] = "OBTAINED";
  return AdsConsentStatus;
}({});
/**
 * AdsConsentPrivacyOptionsRequirementStatus enum.
 */
let AdsConsentPrivacyOptionsRequirementStatus = exports.AdsConsentPrivacyOptionsRequirementStatus = /*#__PURE__*/function (AdsConsentPrivacyOptionsRequirementStatus) {
  AdsConsentPrivacyOptionsRequirementStatus["UNKNOWN"] = "UNKNOWN";
  AdsConsentPrivacyOptionsRequirementStatus["REQUIRED"] = "REQUIRED";
  AdsConsentPrivacyOptionsRequirementStatus["NOT_REQUIRED"] = "NOT_REQUIRED";
  return AdsConsentPrivacyOptionsRequirementStatus;
}({});
/**
 * The options used when requesting consent information.
 */
/**
 * The result of requesting info about a users consent status.
 */
/**
 * The options used when requesting consent information.
 *
 * https://vendor-list.consensu.org/v2/vendor-list.json
 * https://github.com/InteractiveAdvertisingBureau/GDPR-Transparency-and-Consent-Framework
 */
var _default = exports.default = _reactNative.TurboModuleRegistry.getEnforcing('RNGoogleMobileAdsConsentModule');
//# sourceMappingURL=NativeConsentModule.js.map