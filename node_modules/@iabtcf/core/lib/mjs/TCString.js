import { Base64Url, BitLength, SegmentEncoder, SegmentSequence, SemanticPreEncoder, } from './encoder/index.js';
import { SegmentIDs } from './model/index.js';
import { IntEncoder } from './encoder/field/IntEncoder.js';
import { TCModel } from './TCModel.js';
/**
 * Main class for encoding and decoding a
 * TCF Transparency and Consent String
 */
export class TCString {
    /**
     * encodes a model into a TCString
     *
     * @param {TCModel} tcModel - model to convert into encoded string
     * @param {EncodingOptions} options - for encoding options other than default
     * @return {string} - base64url encoded Transparency and Consent String
     */
    static encode(tcModel, options) {
        let out = '';
        let sequence;
        tcModel = SemanticPreEncoder.process(tcModel, options);
        /**
           * If they pass in a special segment sequence.
           */
        if (Array.isArray(options?.segments)) {
            sequence = options.segments;
        }
        else {
            sequence = new SegmentSequence(tcModel, options)['' + tcModel.version];
        }
        sequence.forEach((segment, idx) => {
            let dotMaybe = '';
            if (idx < sequence.length - 1) {
                dotMaybe = '.';
            }
            out += SegmentEncoder.encode(tcModel, segment) + dotMaybe;
        });
        return out;
    }
    /**
     * Decodes a string into a TCModel
     *
     * @param {string} encodedTCString - base64url encoded Transparency and
     * Consent String to decode - can also be a single or group of segments of
     * the string
     * @param {string} [tcModel] - model to enhance with the information.  If
     * none is passed a new instance of TCModel will be created.
     * @return {TCModel} - Returns populated TCModel
     */
    static decode(encodedTCString, tcModel) {
        const segments = encodedTCString.split('.');
        const len = segments.length;
        if (!tcModel) {
            tcModel = new TCModel();
        }
        for (let i = 0; i < len; i++) {
            const segString = segments[i];
            /**
             * first char will contain 6 bits, we only need the first 3. In version 1
             * and 2 of the TC string there is no segment type for the CORE string.
             * Instead the first 6 bits are reserved for the encoding version, but
             * because we're only on a maximum of encoding version 2 the first 3 bits
             * in the core segment will evaluate to 0.
             */
            const firstChar = Base64Url.decode(segString.charAt(0));
            const segTypeBits = firstChar.substr(0, BitLength.segmentType);
            const segment = SegmentIDs.ID_TO_KEY[IntEncoder.decode(segTypeBits, BitLength.segmentType).toString()];
            SegmentEncoder.decode(segString, tcModel, segment);
        }
        return tcModel;
    }
}
