"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.NativeError = void 0;
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

class NativeError extends Error {
  static fromEvent(errorEvent, namespace, stack) {
    return new NativeError({
      userInfo: errorEvent
    }, stack || new Error().stack || '', namespace);
  }
  constructor(nativeError, jsStack, namespace) {
    super();
    const {
      userInfo
    } = nativeError;
    this.namespace = namespace;
    this.code = `${this.namespace}/${userInfo.code || 'unknown'}`;
    this.message = `[${this.code}] ${userInfo.message}`;
    this.jsStack = jsStack;
    this.userInfo = userInfo;
    this.stack = NativeError.getStackWithMessage(`NativeError: ${this.message}`, this.jsStack);
  }

  /**
   * Build a stack trace that includes JS stack prior to calling the native method.
   *
   * @returns {string}
   */
  static getStackWithMessage(message, jsStack) {
    return [message, ...jsStack.split('\n').slice(2, 13)].join('\n');
  }
}
exports.NativeError = NativeError;
//# sourceMappingURL=NativeError.js.map