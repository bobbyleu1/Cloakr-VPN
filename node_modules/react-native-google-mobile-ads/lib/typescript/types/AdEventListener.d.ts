import { AdEventType } from '../AdEventType';
import { GAMAdEventType } from '../GAMAdEventType';
import { RewardedAdEventType } from '../RewardedAdEventType';
import { AppEvent } from './AppEvent';
import { RewardedAdReward } from './RewardedAdReward';
export type AdEventPayload<T extends AdEventType | RewardedAdEventType | GAMAdEventType = never> = T extends AdEventType.ERROR ? Error : T extends RewardedAdEventType ? RewardedAdReward : T extends GAMAdEventType ? AppEvent : undefined;
export type AdEventListener<T extends AdEventType | RewardedAdEventType | GAMAdEventType = never> = (payload: AdEventPayload<T>) => void;
//# sourceMappingURL=AdEventListener.d.ts.map