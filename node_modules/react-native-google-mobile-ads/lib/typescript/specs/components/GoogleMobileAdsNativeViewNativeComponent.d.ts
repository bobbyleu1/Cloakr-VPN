import type * as React from 'react';
import type { HostComponent, ViewProps } from 'react-native';
import type { Int32 } from 'react-native/Libraries/Types/CodegenTypes';
export interface NativeProps extends ViewProps {
    responseId: string;
}
type NativeViewComponentType = HostComponent<NativeProps>;
interface NativeCommands {
    registerAsset: (viewRef: React.ElementRef<NativeViewComponentType>, assetType: string, reactTag: Int32) => void;
}
export declare const Commands: NativeCommands;
declare const _default: NativeViewComponentType;
export default _default;
//# sourceMappingURL=GoogleMobileAdsNativeViewNativeComponent.d.ts.map