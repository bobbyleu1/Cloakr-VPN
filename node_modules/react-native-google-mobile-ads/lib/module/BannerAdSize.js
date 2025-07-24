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
 *
 */

export let BannerAdSize = /*#__PURE__*/function (BannerAdSize) {
  BannerAdSize["BANNER"] = "BANNER";
  BannerAdSize["FULL_BANNER"] = "FULL_BANNER";
  BannerAdSize["LARGE_BANNER"] = "LARGE_BANNER";
  BannerAdSize["LEADERBOARD"] = "LEADERBOARD";
  BannerAdSize["MEDIUM_RECTANGLE"] = "MEDIUM_RECTANGLE";
  BannerAdSize["ADAPTIVE_BANNER"] = "ADAPTIVE_BANNER";
  BannerAdSize["ANCHORED_ADAPTIVE_BANNER"] = "ANCHORED_ADAPTIVE_BANNER";
  BannerAdSize["INLINE_ADAPTIVE_BANNER"] = "INLINE_ADAPTIVE_BANNER";
  BannerAdSize["WIDE_SKYSCRAPER"] = "WIDE_SKYSCRAPER";
  return BannerAdSize;
}({});
export const GAMBannerAdSize = {
  ...BannerAdSize,
  /**
   * A dynamically sized banner that matches its parent's width and expands/contracts its height to match the ad's content after loading completes.
   */
  FLUID: 'FLUID'
};
//# sourceMappingURL=BannerAdSize.js.map