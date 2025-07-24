import { Segment } from './Segment.js';
export class SegmentIDs {
    /**
     * 0 = default - reserved for core string (does not need to be present in the core string)
     * 1 = OOB vendors disclosed
     * 2 = OOB vendors allowed
     * 3 = PublisherTC
     */
    static ID_TO_KEY = [
        Segment.CORE,
        Segment.VENDORS_DISCLOSED,
        Segment.VENDORS_ALLOWED,
        Segment.PUBLISHER_TC,
    ];
    static KEY_TO_ID = {
        [Segment.CORE]: 0,
        [Segment.VENDORS_DISCLOSED]: 1,
        [Segment.VENDORS_ALLOWED]: 2,
        [Segment.PUBLISHER_TC]: 3,
    };
}
