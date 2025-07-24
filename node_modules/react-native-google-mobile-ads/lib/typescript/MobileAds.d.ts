import { MobileAdsModuleInterface } from './types/MobileAdsModule.interface';
import { RequestConfiguration } from './types/RequestConfiguration';
declare class MobileAdsModule implements MobileAdsModuleInterface {
    constructor();
    subscribeToNativeModuleEvent(eventName: string): void;
    initialize(): Promise<import("./types").AdapterStatus[]>;
    setRequestConfiguration(requestConfiguration: RequestConfiguration): Promise<void>;
    openAdInspector(): Promise<void>;
    openDebugMenu(adUnit: string): void;
    setAppVolume(volume: number): void;
    setAppMuted(muted: boolean): void;
}
export declare const MobileAds: () => MobileAdsModule;
export default MobileAds;
//# sourceMappingURL=MobileAds.d.ts.map