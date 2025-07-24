import React from 'react';
type PossibleRef<T> = React.Ref<T> | undefined;
/**
 * Access the ref using the method that doesn't yield a warning.
 *
 * Before React 19 accessing `element.props.ref` will throw a warning and suggest using `element.ref`
 * After React 19 accessing `element.ref` does the opposite.
 * https://github.com/facebook/react/pull/28348
 */
export declare function getElementRef(element: React.ReactElement): PossibleRef<unknown>;
export declare function composeRefs<T>(...refs: PossibleRef<T>[]): (value: T) => void;
export {};
//# sourceMappingURL=ref.d.ts.map