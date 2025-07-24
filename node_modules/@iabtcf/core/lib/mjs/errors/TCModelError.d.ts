/**
 * class for decoding errors
 *
 * @extends {Error}
 */
declare class TCModelError extends Error {
    /**
     * constructor - constructs an TCModelError
     *
     * @param {string} fieldName - the errored field
     * @param {string} passedValue - what was passed
     * @return {undefined}
     */
    constructor(fieldName: string, passedValue: any, msg?: string);
}
export { TCModelError };
