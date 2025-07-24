import React, { ReactElement } from 'react';
export declare enum NativeAssetType {
    ADVERTISER = "advertiser",
    BODY = "body",
    CALL_TO_ACTION = "callToAction",
    HEADLINE = "headline",
    PRICE = "price",
    STORE = "store",
    STAR_RATING = "starRating",
    ICON = "icon",
    IMAGE = "image"
}
export type NativeAssetProps = {
    assetType: NativeAssetType;
    children: ReactElement;
};
export declare const NativeAsset: (props: NativeAssetProps) => React.ReactElement<any, string | React.JSXElementConstructor<any>> | null;
//# sourceMappingURL=NativeAsset.d.ts.map