import { AppOpenAd } from '../ads/AppOpenAd';
import { InterstitialAd } from '../ads/InterstitialAd';
import { RewardedAd } from '../ads/RewardedAd';
import { RewardedInterstitialAd } from '../ads/RewardedInterstitialAd';
import { AdHookReturns } from '../types/AdStates';
export declare function useFullScreenAd<T extends AppOpenAd | InterstitialAd | RewardedAd | RewardedInterstitialAd | null>(ad: T): AdHookReturns;
//# sourceMappingURL=useFullScreenAd.d.ts.map