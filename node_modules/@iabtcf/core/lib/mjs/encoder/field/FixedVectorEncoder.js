import { BooleanEncoder } from './BooleanEncoder.js';
import { DecodingError } from '../../errors/index.js';
import { Vector } from '../../model/index.js';
export class FixedVectorEncoder {
    static encode(value, numBits) {
        let bitString = '';
        for (let i = 1; i <= numBits; i++) {
            bitString += BooleanEncoder.encode(value.has(i));
        }
        return bitString;
    }
    static decode(value, numBits) {
        if (value.length !== numBits) {
            throw new DecodingError('bitfield encoding length mismatch');
        }
        const vector = new Vector();
        for (let i = 1; i <= numBits; i++) {
            if (BooleanEncoder.decode(value[i - 1])) {
                vector.set(i);
            }
        }
        vector.bitLength = value.length;
        return vector;
    }
}
