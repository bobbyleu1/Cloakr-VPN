import { TCModel } from '../TCModel.js';
import { EncodingOptions } from './EncodingOptions.js';
export declare class SemanticPreEncoder {
    private static processor;
    static process(tcModel: TCModel, options?: EncodingOptions): TCModel;
}
