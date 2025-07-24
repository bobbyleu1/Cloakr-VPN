export declare enum GAMAdEventType {
    /**
     * An event fired when the ad received Ad Manager specific app event.
     *
     * The app event contains a `name` and `data`. `data` could be undefeined.
     *
     * #### Example
     *
     * ```js
     * import { GAMAdEventType } from 'react-native-google-mobile-ads';
     *
     * interstitialAd.onAdEvent((type, error, data) => {
     *   if (type === GAMAdEventType.APP_EVENT) {
     *    console.log(`Received app event: ${data.name} with data: ${data.data}`);
     *   }
     * });
     * ```
     */
    APP_EVENT = "app_event"
}
//# sourceMappingURL=GAMAdEventType.d.ts.map