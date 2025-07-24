import type { HostComponent, ViewProps } from 'react-native';
export interface NativeProps extends ViewProps {
    responseId: string;
    resizeMode?: string;
}
type NativeViewComponentType = HostComponent<NativeProps>;
declare const _default: NativeViewComponentType;
export default _default;
//# sourceMappingURL=GoogleMobileAdsMediaViewNativeComponent.d.ts.map