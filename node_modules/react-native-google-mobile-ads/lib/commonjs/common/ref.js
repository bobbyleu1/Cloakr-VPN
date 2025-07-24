"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.composeRefs = composeRefs;
exports.getElementRef = getElementRef;
/**
 * Access the ref using the method that doesn't yield a warning.
 *
 * Before React 19 accessing `element.props.ref` will throw a warning and suggest using `element.ref`
 * After React 19 accessing `element.ref` does the opposite.
 * https://github.com/facebook/react/pull/28348
 */
function getElementRef(element) {
  var _Object$getOwnPropert, _Object$getOwnPropert2;
  // React <=18 in DEV
  let getter = (_Object$getOwnPropert = Object.getOwnPropertyDescriptor(element.props, 'ref')) === null || _Object$getOwnPropert === void 0 ? void 0 : _Object$getOwnPropert.get;
  let mayWarn = getter && 'isReactWarning' in getter && getter.isReactWarning;
  if (mayWarn) {
    return element.ref;
  }

  // React 19 in DEV
  getter = (_Object$getOwnPropert2 = Object.getOwnPropertyDescriptor(element, 'ref')) === null || _Object$getOwnPropert2 === void 0 ? void 0 : _Object$getOwnPropert2.get;
  mayWarn = getter && 'isReactWarning' in getter && getter.isReactWarning;
  if (mayWarn) {
    return element.props.ref;
  }

  // Not DEV
  return element.props.ref || element.ref;
}
function composeRefs(...refs) {
  return value => {
    refs.forEach(ref => {
      if (typeof ref === 'function') {
        ref(value);
      } else if (ref !== null && ref !== undefined) {
        ref.current = value;
      }
    });
  };
}
//# sourceMappingURL=ref.js.map