import type { TurboModule } from 'react-native';
import type { UnsafeObject } from 'react-native/Libraries/Types/CodegenTypes';
import { AdapterStatus } from '../../types';
export interface Spec extends TurboModule {
    readonly getConstants: () => {
        REVENUE_PRECISION_ESTIMATED: number;
        REVENUE_PRECISION_PRECISE: number;
        REVENUE_PRECISION_PUBLISHER_PROVIDED: number;
        REVENUE_PRECISION_UNKNOWN: number;
    };
    initialize(): Promise<AdapterStatus[]>;
    setRequestConfiguration(requestConfiguration?: UnsafeObject): Promise<void>;
    openAdInspector(): Promise<void>;
    openDebugMenu(adUnit: string): void;
    setAppVolume(volume: number): void;
    setAppMuted(muted: boolean): void;
}
declare const _default: Spec;
export default _default;
//# sourceMappingURL=NativeGoogleMobileAdsModule.d.ts.map