import { MobileAd } from './MobileAd';
import { AdEventType } from '../AdEventType';
import { AdEventListener } from '../types/AdEventListener';
import { AdEventsListener } from '../types/AdEventsListener';
import { RequestOptions } from '../types/RequestOptions';
/**
 * A class for interacting and showing Interstitial Ads.
 *
 * An Interstitial advert can be pre-loaded and shown at a suitable point in your apps flow, such as at the end of a level
 * in a game. An Interstitial is a full screen advert, laid on-top of your entire application which the user can interact with.
 * Interactions are passed back via events which should be handled accordingly inside of your app.
 *
 * #### Example
 *
 * First create a new Interstitial instance, passing in your Ad Unit ID from the Google Mobile Ads configuration console, and any additional
 * request options. The example below will present a test advert, and only request a non-personalized ad.
 *
 * ```js
 * import { InterstitialAd, TestIds } from 'react-native-google-mobile-ads';
 *
 * const interstitial = InterstitialAd.createForAdRequest(TestIds.INTERSTITIAL, {
 *     requestNonPersonalizedAdsOnly: true,
 * });
 *  ```
 *
 * Each advert needs to be loaded from Google Mobile Ads before being shown. It is recommended this is performed before the user
 * reaches the checkpoint to show the advert, so it's ready to go. Before loading the advert, we need to setup
 * event listeners to listen for updates from Google Mobile Ads, such as advert loaded or failed to load.
 *
 * Event types match the `AdEventType` interface. Once the advert has loaded, we can trigger it to show:
 *
 * ```js
 * import { AdEventType } from 'react-native-google-mobile-ads';
 *
 * interstitialAd.addAdEventListener(AdEventType.Loaded, () => {
 *   interstitialAd.show();
 * });
 *
 * interstitial.load();
 *  ```
 *
 * The advert will be presented to the user, and several more events can be triggered such as the user clicking the
 * advert or closing it.
 */
export declare class InterstitialAd extends MobileAd {
    protected static _interstitialRequest: number;
    /**
     * Creates a new InterstitialAd instance.
     *
     * #### Example
     *
     * ```js
     * import { InterstitialAd, AdEventType, TestIds } from 'react-native-google-mobile-ads';
     *
     * const interstitialAd = await InterstitialAd.createForAdRequest(TestIds.INTERSTITIAL, {
     *   requestAgent: 'CoolAds',
     * });
     *
     * interstitialAd.addAdEventListener(AdEventType.Loaded, () => {
     *   interstitialAd.show();
     * });
     *
     * interstitialAd.load();
     * ```
     *
     * @param adUnitId The Ad Unit ID for the Interstitial. You can find this on your Google Mobile Ads dashboard.
     * @param requestOptions Optional RequestOptions used to load the ad.
     */
    static createForAdRequest(adUnitId: string, requestOptions?: RequestOptions): InterstitialAd;
    addAdEventsListener<T extends AdEventType>(listener: AdEventsListener<T>): () => void;
    addAdEventListener<T extends AdEventType>(type: T, listener: AdEventListener<T>): () => void;
}
//# sourceMappingURL=InterstitialAd.d.ts.map