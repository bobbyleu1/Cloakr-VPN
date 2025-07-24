import { NativeEventEmitter, EmitterSubscription } from 'react-native';
declare class GANativeEventEmitter extends NativeEventEmitter {
    ready: boolean;
    constructor();
    addListener(eventType: string, listener: (event: {
        adUnitId: string;
        requestId: number;
    }) => void, context?: Record<string, unknown>): EmitterSubscription;
    removeAllListeners(eventType: string): void;
    removeSubscription(subscription: EmitterSubscription): void;
}
export declare const GoogleMobileAdsNativeEventEmitter: GANativeEventEmitter;
export {};
//# sourceMappingURL=GoogleMobileAdsNativeEventEmitter.d.ts.map