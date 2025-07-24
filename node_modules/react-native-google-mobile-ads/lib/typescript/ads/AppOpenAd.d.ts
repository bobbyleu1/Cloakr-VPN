import { MobileAd } from './MobileAd';
import { AdEventType } from '../AdEventType';
import { AdEventListener } from '../types/AdEventListener';
import { AdEventsListener } from '../types/AdEventsListener';
import { RequestOptions } from '../types/RequestOptions';
export declare class AppOpenAd extends MobileAd {
    protected static _appOpenRequest: number;
    static createForAdRequest(adUnitId: string, requestOptions?: RequestOptions): AppOpenAd;
    addAdEventsListener<T extends AdEventType>(listener: AdEventsListener<T>): () => void;
    addAdEventListener<T extends AdEventType>(type: T, listener: AdEventListener<T>): () => void;
}
//# sourceMappingURL=AppOpenAd.d.ts.map