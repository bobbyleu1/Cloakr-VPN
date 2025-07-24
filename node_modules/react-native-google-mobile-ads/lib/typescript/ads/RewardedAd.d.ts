import { MobileAd } from './MobileAd';
import { AdEventType } from '../AdEventType';
import { RewardedAdEventType } from '../RewardedAdEventType';
import { AdEventListener } from '../types/AdEventListener';
import { AdEventsListener } from '../types/AdEventsListener';
import { RequestOptions } from '../types/RequestOptions';
/**
 * A class for interacting and showing Rewarded Ads.
 *
 * An Rewarded advert can be pre-loaded and shown at a suitable point in your apps flow, such as at the end of a level
 * in a game. The content of a rewarded advert can be controlled via your Google Mobile Ads dashboard. Typically users are rewarded
 * after completing a specific advert action (e.g. watching a video or submitting an option via an interactive form).
 * Events (such as the user earning a reward or closing a rewarded advert early) are sent back for you to handle accordingly
 * within your application.
 *
 * #### Example
 *
 * First create a new Rewarded instance, passing in your Ad Unit ID from the Google Mobile Ads configuration console, and any additional
 * request options. The example below will present a test advert, and only request a non-personalized ad.
 *
 * ```js
 * import { RewardedAd, TestIds } from 'react-native-google-mobile-ads';
 *
 * const rewarded = RewardedAd.createForAdRequest(TestIds.REWARDED, {
 *     requestNonPersonalizedAdsOnly: true,
 * });
 *  ```
 *
 * Each advert needs to be loaded from Google Mobile Ads before being shown. It is recommended this is performed before the user
 * reaches the checkpoint to show the advert, so it's ready to go. Before loading the advert, we need to setup
 * event listeners to listen for updates from Google Mobile Ads, such as advert loaded or failed to load.
 *
 * Event types match the `AdEventType` or `RewardedAdEventType` interface. The potential user reward for rewarded
 * adverts are passed back to the event handler on advert load and when the user earns the reward.
 *
 * ```js
 * import { RewardedAdEventType } from 'react-native-google-mobile-ads';
 *
 * rewarded.addAdEventListener(RewardedAdEventType.LOADED. () => {
 *   rewarded.show();
 * });
 * rewarded.addAdEventListener(RewardedAdEventType.EARNED_REWARD. (reward) => {
 *   console.log('User earned reward of ', reward);
 * });
 *
 * rewarded.load();
 *  ```
 *
 * The rewarded advert will be presented to the user, and several more events can be triggered such as the user clicking the
 * advert, closing it or completing the action.
 */
export declare class RewardedAd extends MobileAd {
    protected static _rewardedRequest: number;
    /**
     * Creates a new RewardedAd instance.
     *
     * #### Example
     *
     * ```js
     * import { RewardedAd, RewardedAdEventType, TestIds } from 'react-native-google-mobile-ads';
     *
     * const rewardedAd = await RewardedAd.createForAdRequest(TestIds.REWARDED, {
     *   requestAgent: 'CoolAds',
     * });
     *
     * rewarded.addAdEventListener(RewardedAdEventType.LOADED. () => {
     *   rewarded.show();
     * });
     * rewarded.addAdEventListener(RewardedAdEventType.EARNED_REWARD. (reward) => {
     *   console.log('User earned reward of ', reward);
     * });
     *
     * rewardedAd.load();
     * ```
     *
     * @param adUnitId The Ad Unit ID for the Rewarded Ad. You can find this on your Google Mobile Ads dashboard.
     * @param requestOptions Optional RequestOptions used to load the ad.
     */
    static createForAdRequest(adUnitId: string, requestOptions?: RequestOptions): RewardedAd;
    addAdEventsListener<T extends AdEventType | RewardedAdEventType>(listener: AdEventsListener<T>): () => void;
    addAdEventListener<T extends AdEventType | RewardedAdEventType>(type: T, listener: AdEventListener<T>): () => void;
}
//# sourceMappingURL=RewardedAd.d.ts.map