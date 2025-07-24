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

import React, { useContext, useEffect, useRef } from 'react';
import { findNodeHandle } from 'react-native';
import { NativeAdContext } from './NativeAdContext';
import { Commands } from '../../specs/components/GoogleMobileAdsNativeViewNativeComponent';
import { composeRefs, getElementRef } from '../../common/ref';
export let NativeAssetType = /*#__PURE__*/function (NativeAssetType) {
  NativeAssetType["ADVERTISER"] = "advertiser";
  NativeAssetType["BODY"] = "body";
  NativeAssetType["CALL_TO_ACTION"] = "callToAction";
  NativeAssetType["HEADLINE"] = "headline";
  NativeAssetType["PRICE"] = "price";
  NativeAssetType["STORE"] = "store";
  NativeAssetType["STAR_RATING"] = "starRating";
  NativeAssetType["ICON"] = "icon";
  NativeAssetType["IMAGE"] = "image";
  return NativeAssetType;
}({});
export const NativeAsset = props => {
  const {
    assetType,
    children
  } = props;
  const {
    viewRef
  } = useContext(NativeAdContext);
  const ref = useRef(null);
  useEffect(() => {
    if (!viewRef.current) {
      return;
    }
    const node = ref.current;
    const reactTag = findNodeHandle(node);
    if (reactTag) {
      Commands.registerAsset(viewRef.current, assetType, reactTag);
    }
  }, [viewRef]);
  if (! /*#__PURE__*/React.isValidElement(children)) {
    return null;
  }
  const childrenRef = getElementRef(children);
  return /*#__PURE__*/React.cloneElement(children, {
    // @ts-ignore
    ref: composeRefs(ref, childrenRef)
  });
};
//# sourceMappingURL=NativeAsset.js.map