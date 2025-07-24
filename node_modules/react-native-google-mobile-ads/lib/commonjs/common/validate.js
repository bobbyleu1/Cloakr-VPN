"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.isArray = isArray;
exports.isBoolean = isBoolean;
exports.isFunction = isFunction;
exports.isNull = isNull;
exports.isObject = isObject;
exports.isOneOf = isOneOf;
exports.isString = isString;
exports.isUndefined = isUndefined;
exports.isValidUrl = isValidUrl;
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

/**
 * Simple is null check.
 *
 * @param value
 * @returns {boolean}
 */
function isNull(value) {
  return value === null;
}

/**
 * Simple is object check.
 *
 * @param value
 * @returns {boolean}
 */
function isObject(value) {
  return value ? typeof value === 'object' && !Array.isArray(value) && !isNull(value) : false;
}

/**
 * Simple is function check
 *
 * @param value
 * @returns {*|boolean}
 */
function isFunction(value) {
  return value ? typeof value === 'function' : false;
}

/**
 * Simple is string check
 * @param value
 * @return {boolean}
 */
function isString(value) {
  return typeof value === 'string';
}

/**
 * Simple is boolean check
 *
 * @param value
 * @return {boolean}
 */
function isBoolean(value) {
  return typeof value === 'boolean';
}

/**
 *
 * @param value
 * @returns {arg is Array<unknown>}
 */
function isArray(value) {
  return Array.isArray(value);
}

/**
 *
 * @param value
 * @returns {boolean}
 */
function isUndefined(value) {
  return typeof value === 'undefined';
}

/**
 * URL test
 * @param url
 * @returns {boolean}
 */
const IS_VALID_URL_REGEX = /^(http|https):\/\/[^ "]+$/;
function isValidUrl(url) {
  return IS_VALID_URL_REGEX.test(url);
}

/**
 * Array includes
 *
 * @param value
 * @param oneOf
 * @returns {boolean}
 */
function isOneOf(value, oneOf = []) {
  if (!isArray(oneOf)) {
    return false;
  }
  return oneOf.includes(value);
}
//# sourceMappingURL=validate.js.map