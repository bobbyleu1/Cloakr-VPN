/**
 * Simple is null check.
 *
 * @param value
 * @returns {boolean}
 */
export declare function isNull(value: unknown): value is null;
/**
 * Simple is object check.
 *
 * @param value
 * @returns {boolean}
 */
export declare function isObject(value: unknown): boolean;
/**
 * Simple is function check
 *
 * @param value
 * @returns {*|boolean}
 */
export declare function isFunction(value: unknown): boolean;
/**
 * Simple is string check
 * @param value
 * @return {boolean}
 */
export declare function isString(value: unknown): value is string;
/**
 * Simple is boolean check
 *
 * @param value
 * @return {boolean}
 */
export declare function isBoolean(value: unknown): value is boolean;
/**
 *
 * @param value
 * @returns {arg is Array<unknown>}
 */
export declare function isArray(value: unknown): value is any[];
/**
 *
 * @param value
 * @returns {boolean}
 */
export declare function isUndefined(value: unknown): value is undefined;
export declare function isValidUrl(url: string): boolean;
/**
 * Array includes
 *
 * @param value
 * @param oneOf
 * @returns {boolean}
 */
export declare function isOneOf(value: unknown, oneOf?: unknown[]): boolean;
//# sourceMappingURL=validate.d.ts.map