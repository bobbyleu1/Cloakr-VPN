import { ConfigPlugin } from '@expo/config-plugins';
type PluginParameters = {
    androidAppId?: string;
    iosAppId?: string;
    delayAppMeasurementInit?: boolean;
    optimizeInitialization?: boolean;
    optimizeAdLoading?: boolean;
    skAdNetworkItems?: string[];
    userTrackingUsageDescription?: string;
};
declare const withReactNativeGoogleMobileAds: ConfigPlugin<PluginParameters>;
export default withReactNativeGoogleMobileAds;
