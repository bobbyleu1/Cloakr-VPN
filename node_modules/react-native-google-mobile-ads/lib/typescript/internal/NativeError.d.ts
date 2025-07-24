export declare class NativeError extends Error {
    namespace: string;
    code: string;
    message: string;
    jsStack: string;
    userInfo: {
        code: string;
        message: string;
    };
    static fromEvent(errorEvent: {
        code: string;
        message: string;
    }, namespace: string, stack?: string): NativeError;
    constructor(nativeError: {
        userInfo: {
            code: string;
            message: string;
        };
    }, jsStack: string, namespace: string);
    /**
     * Build a stack trace that includes JS stack prior to calling the native method.
     *
     * @returns {string}
     */
    static getStackWithMessage(message: string, jsStack: string): string;
}
//# sourceMappingURL=NativeError.d.ts.map