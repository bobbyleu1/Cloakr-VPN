"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
var _exportNames = {
  hasOwnProperty: true,
  isPropertySet: true
};
exports.hasOwnProperty = hasOwnProperty;
exports.isPropertySet = isPropertySet;
var _validate = require("./validate");
Object.keys(_validate).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _validate[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _validate[key];
    }
  });
});
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

function hasOwnProperty(target, property) {
  return Object.hasOwnProperty.call(target, property);
}
function isPropertySet(target, property) {
  return hasOwnProperty(target, property) && !(0, _validate.isUndefined)(target[property]);
}
//# sourceMappingURL=index.js.map