import { SequenceVersionMap } from './SequenceVersionMap.js';
import { TCModel } from '../../index.js';
import { EncodingOptions } from '../EncodingOptions.js';
import { Segment } from '../../model/index.js';
export declare class SegmentSequence implements SequenceVersionMap {
    '1': Segment[];
    '2': Segment[];
    constructor(tcModel: TCModel, options?: EncodingOptions);
}
