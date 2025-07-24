import { KeyMap } from './KeyMap.js';
import { Segment } from './Segment.js';
export declare class SegmentIDs {
    /**
     * 0 = default - reserved for core string (does not need to be present in the core string)
     * 1 = OOB vendors disclosed
     * 2 = OOB vendors allowed
     * 3 = PublisherTC
     */
    static readonly ID_TO_KEY: Segment[];
    static readonly KEY_TO_ID: KeyMap<number>;
}
