import { Segment } from '../model/index.js';
import { TCModel } from '../index.js';
export declare class SegmentEncoder {
    private static fieldSequence;
    static encode(tcModel: TCModel, segment: Segment): string;
    static decode(encodedString: string, tcModel: TCModel, segment: string): TCModel;
    private static isPublisherCustom;
}
