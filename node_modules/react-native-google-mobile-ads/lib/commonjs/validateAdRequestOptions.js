"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.validateAdRequestOptions = validateAdRequestOptions;
var _common = require("./common");
var _version = require("./version");
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

function validateAdRequestOptions(options) {
  const out = {
    requestAgent: `rn-invertase-${_version.version}`
  };
  if ((0, _common.isUndefined)(options)) {
    return out;
  }
  if (!(0, _common.isObject)(options)) {
    throw new Error("'options' expected an object value");
  }
  if ((0, _common.isPropertySet)(options, 'requestNonPersonalizedAdsOnly')) {
    if (!(0, _common.isBoolean)(options.requestNonPersonalizedAdsOnly)) {
      throw new Error("'options.requestNonPersonalizedAdsOnly' expected a boolean value");
    }
    out.requestNonPersonalizedAdsOnly = options.requestNonPersonalizedAdsOnly;
  }
  if (options.networkExtras) {
    if (!(0, _common.isObject)(options.networkExtras)) {
      throw new Error("'options.networkExtras' expected an object of key/value pairs");
    }
    Object.entries(options.networkExtras).forEach(([key, value]) => {
      if (!(0, _common.isString)(value)) {
        throw new Error(`'options.networkExtras' expected a string value for object key "${key}"`);
      }
    });
    out.networkExtras = options.networkExtras;
  }
  if (options.keywords) {
    if (!(0, _common.isArray)(options.keywords)) {
      throw new Error("'options.keywords' expected an array containing string values");
    }
    for (let i = 0; i < options.keywords.length; i++) {
      const keyword = options.keywords[i];
      if (!(0, _common.isString)(keyword)) {
        throw new Error("'options.keywords' expected an array containing string values");
      }
    }
    out.keywords = options.keywords;
  }
  if (options.contentUrl) {
    if (!(0, _common.isString)(options.contentUrl)) {
      throw new Error("'options.contentUrl' expected a string value");
    }
    if (!(0, _common.isValidUrl)(options.contentUrl)) {
      throw new Error("'options.contentUrl' expected a valid HTTP or HTTPS url.");
    }
    if (options.contentUrl.length > 512) {
      throw new Error("'options.contentUrl' maximum length of a content URL is 512 characters.");
    }
    out.contentUrl = options.contentUrl;
  }
  if (options.requestAgent) {
    if (!(0, _common.isString)(options.requestAgent)) {
      throw new Error("'options.requestAgent' expected a string value");
    }
    out.requestAgent = options.requestAgent;
  }
  if (options.serverSideVerificationOptions) {
    if (!(0, _common.isObject)(options.serverSideVerificationOptions)) {
      throw new Error("'options.serverSideVerificationOptions' expected an object of key/value pairs");
    }
    const ssvOptions = options.serverSideVerificationOptions;
    if (ssvOptions.userId && !(0, _common.isString)(ssvOptions.userId)) {
      throw new Error("'options.serverSideVerificationOptions.userId' expected a string value");
    }
    if (ssvOptions.customData && !(0, _common.isString)(ssvOptions.customData)) {
      throw new Error("'options.serverSideVerificationOptions.customData' expected a string value");
    }
    out.serverSideVerificationOptions = options.serverSideVerificationOptions;
  }
  if (options.customTargeting) {
    if (!(0, _common.isObject)(options.customTargeting)) {
      throw new Error("'options.customTargeting' expected an object of key/value pairs");
    }
    out.customTargeting = options.customTargeting;
  }
  if (options.publisherProvidedId) {
    if (!(0, _common.isString)(options.publisherProvidedId)) {
      throw new Error("'options.publisherProvidedId' expected a string value");
    }
    out.publisherProvidedId = options.publisherProvidedId;
  }
  return out;
}
//# sourceMappingURL=validateAdRequestOptions.js.map