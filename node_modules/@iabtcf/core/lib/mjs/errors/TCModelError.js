/**
 * class for decoding errors
 *
 * @extends {Error}
 */
class TCModelError extends Error {
    /**
     * constructor - constructs an TCModelError
     *
     * @param {string} fieldName - the errored field
     * @param {string} passedValue - what was passed
     * @return {undefined}
     */
    constructor(fieldName, passedValue, msg = '') {
        super(`invalid value ${passedValue} passed for ${fieldName} ${msg}`);
        this.name = 'TCModelError';
    }
}
export { TCModelError };
