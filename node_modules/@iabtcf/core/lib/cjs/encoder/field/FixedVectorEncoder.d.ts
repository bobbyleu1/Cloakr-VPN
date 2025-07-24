import { Vector } from '../../model/index.js';
export declare class FixedVectorEncoder {
    static encode(value: Vector, numBits: number): string;
    static decode(value: string, numBits: number): Vector;
}
