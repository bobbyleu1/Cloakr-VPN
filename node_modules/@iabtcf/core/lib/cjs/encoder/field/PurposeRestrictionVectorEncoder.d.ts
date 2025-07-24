import { PurposeRestrictionVector } from '../../model/index.js';
export declare class PurposeRestrictionVectorEncoder {
    static encode(prVector: PurposeRestrictionVector): string;
    static decode(encodedString: string): PurposeRestrictionVector;
}
