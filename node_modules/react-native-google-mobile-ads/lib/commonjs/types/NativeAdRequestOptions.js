"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.NativeMediaAspectRatio = exports.NativeAdChoicesPlacement = void 0;
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
let NativeMediaAspectRatio = exports.NativeMediaAspectRatio = /*#__PURE__*/function (NativeMediaAspectRatio) {
  NativeMediaAspectRatio[NativeMediaAspectRatio["ANY"] = 1] = "ANY";
  NativeMediaAspectRatio[NativeMediaAspectRatio["LANDSCAPE"] = 2] = "LANDSCAPE";
  NativeMediaAspectRatio[NativeMediaAspectRatio["PORTRAIT"] = 3] = "PORTRAIT";
  NativeMediaAspectRatio[NativeMediaAspectRatio["SQUARE"] = 4] = "SQUARE";
  return NativeMediaAspectRatio;
}({});
let NativeAdChoicesPlacement = exports.NativeAdChoicesPlacement = /*#__PURE__*/function (NativeAdChoicesPlacement) {
  NativeAdChoicesPlacement[NativeAdChoicesPlacement["TOP_LEFT"] = 0] = "TOP_LEFT";
  NativeAdChoicesPlacement[NativeAdChoicesPlacement["TOP_RIGHT"] = 1] = "TOP_RIGHT";
  NativeAdChoicesPlacement[NativeAdChoicesPlacement["BOTTOM_RIGHT"] = 2] = "BOTTOM_RIGHT";
  NativeAdChoicesPlacement[NativeAdChoicesPlacement["BOTTOM_LEFT"] = 3] = "BOTTOM_LEFT";
  return NativeAdChoicesPlacement;
}({});
//# sourceMappingURL=NativeAdRequestOptions.js.map