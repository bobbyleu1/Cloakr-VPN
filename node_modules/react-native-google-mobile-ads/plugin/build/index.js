"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_plugins_1 = require("@expo/config-plugins");
function addReplacingMainApplicationMetaDataItem(manifest, itemName, itemValue) {
    config_plugins_1.AndroidConfig.Manifest.ensureToolsAvailable(manifest);
    const newItem = {
        $: {
            'android:name': itemName,
            'android:value': itemValue,
            'tools:replace': 'android:value',
        },
    };
    const mainApplication = config_plugins_1.AndroidConfig.Manifest.getMainApplicationOrThrow(manifest);
    mainApplication['meta-data'] = mainApplication['meta-data'] ?? [];
    const existingItem = mainApplication['meta-data'].find(item => item.$['android:name'] === itemName);
    if (existingItem) {
        existingItem.$['android:value'] = itemValue;
        existingItem.$['tools:replace'] =
            'android:value';
    }
    else {
        mainApplication['meta-data'].push(newItem);
    }
    return manifest;
}
const withAndroidAppId = (config, androidAppId) => {
    if (androidAppId === undefined)
        return config;
    return (0, config_plugins_1.withAndroidManifest)(config, config => {
        addReplacingMainApplicationMetaDataItem(config.modResults, 'com.google.android.gms.ads.APPLICATION_ID', androidAppId);
        return config;
    });
};
const withAndroidAppMeasurementInitDelayed = (config, delayAppMeasurementInit) => {
    if (delayAppMeasurementInit === undefined)
        return config;
    return (0, config_plugins_1.withAndroidManifest)(config, config => {
        addReplacingMainApplicationMetaDataItem(config.modResults, 'com.google.android.gms.ads.DELAY_APP_MEASUREMENT_INIT', delayAppMeasurementInit.toString());
        return config;
    });
};
const withAndroidInitializationOptimized = (config, optimizeInitialization = true) => {
    return (0, config_plugins_1.withAndroidManifest)(config, config => {
        addReplacingMainApplicationMetaDataItem(config.modResults, 'com.google.android.gms.ads.flag.OPTIMIZE_INITIALIZATION', optimizeInitialization.toString());
        return config;
    });
};
const withAndroidAdLoadingOptimized = (config, optimizeAdLoading = true) => {
    return (0, config_plugins_1.withAndroidManifest)(config, config => {
        addReplacingMainApplicationMetaDataItem(config.modResults, 'com.google.android.gms.ads.flag.OPTIMIZE_AD_LOADING', optimizeAdLoading.toString());
        return config;
    });
};
const withIosAppId = (config, iosAppId) => {
    if (iosAppId === undefined)
        return config;
    return (0, config_plugins_1.withInfoPlist)(config, config => {
        config.modResults.GADApplicationIdentifier = iosAppId;
        return config;
    });
};
const withIosAppMeasurementInitDelayed = (config, delayAppMeasurementInit = false) => {
    return (0, config_plugins_1.withInfoPlist)(config, config => {
        config.modResults.GADDelayAppMeasurementInit = delayAppMeasurementInit;
        return config;
    });
};
const withIosSkAdNetworkItems = (config, skAdNetworkItems) => {
    if (skAdNetworkItems === undefined)
        return config;
    return (0, config_plugins_1.withInfoPlist)(config, config => {
        config.modResults.SKAdNetworkItems = config.modResults.SKAdNetworkItems ?? [];
        const existingIdentifiers = config.modResults.SKAdNetworkItems.map((item) => item.SKAdNetworkIdentifier);
        const missingIdentifiers = skAdNetworkItems.filter(skAdNetworkItem => !existingIdentifiers.includes(skAdNetworkItem));
        config.modResults.SKAdNetworkItems.push(...missingIdentifiers.map(identifier => ({
            SKAdNetworkIdentifier: identifier,
        })));
        return config;
    });
};
const withIosUserTrackingUsageDescription = (config, userTrackingUsageDescription) => {
    if (userTrackingUsageDescription === undefined)
        return config;
    return (0, config_plugins_1.withInfoPlist)(config, config => {
        config.modResults.NSUserTrackingUsageDescription = userTrackingUsageDescription;
        return config;
    });
};
const withReactNativeGoogleMobileAds = (config, { androidAppId, delayAppMeasurementInit, optimizeInitialization, optimizeAdLoading, iosAppId, skAdNetworkItems, userTrackingUsageDescription, } = {}) => {
    if (androidAppId === undefined) {
        console.warn("No 'androidAppId' was provided. The native Google Mobile Ads SDK will crash on Android without it.");
    }
    if (iosAppId === undefined) {
        console.warn("No 'iosAppId' was provided. The native Google Mobile Ads SDK will crash on iOS without it.");
    }
    return (0, config_plugins_1.withPlugins)(config, [
        // Android
        [withAndroidAppId, androidAppId],
        [withAndroidAppMeasurementInitDelayed, delayAppMeasurementInit],
        [withAndroidInitializationOptimized, optimizeInitialization],
        [withAndroidAdLoadingOptimized, optimizeAdLoading],
        // iOS
        [withIosAppId, iosAppId],
        [withIosAppMeasurementInitDelayed, delayAppMeasurementInit],
        [withIosSkAdNetworkItems, skAdNetworkItems],
        [withIosUserTrackingUsageDescription, userTrackingUsageDescription],
    ]);
};
exports.default = withReactNativeGoogleMobileAds;
