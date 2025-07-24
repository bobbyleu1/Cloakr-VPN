export class BooleanEncoder {
    static encode(value) {
        return String(Number(value));
    }
    static decode(value) {
        // less operations than !!parseInt(value, 2)
        return value === '1';
    }
}
