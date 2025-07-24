export declare class Base64Url {
    /**
     * Base 64 URL character set.  Different from standard Base64 char set
     * in that '+' and '/' are replaced with '-' and '_'.
     */
    private static DICT;
    private static REVERSE_DICT;
    /**
     * log2(64) = 6
     */
    private static BASIS;
    private static LCM;
    /**
     * encodes an arbitrary-length bitfield string into base64url
     *
     * @static
     * @param {string} str - arbitrary-length bitfield string to be encoded to base64url
     * @return {string} - base64url encoded result
     */
    static encode(str: string): string;
    /**
     * decodes a base64url encoded bitfield string
     *
     * @static
     * @param {string} str - base64url encoded bitfield string to be decoded
     * @return {string} - bitfield string
     */
    static decode(str: string): string;
}
