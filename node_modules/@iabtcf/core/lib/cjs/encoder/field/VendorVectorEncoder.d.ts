import { Vector } from '../../model/index.js';
export declare class VendorVectorEncoder {
    static encode(value: Vector): string;
    static decode(value: string, version?: number): Vector;
    private static buildRangeEncoding;
}
