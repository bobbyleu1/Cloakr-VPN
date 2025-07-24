"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.debounce = void 0;
const debounce = (func, waitFor) => {
  let timeout = null;
  const debounced = (...args) => {
    if (timeout !== null) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => func(...args), waitFor);
  };
  return debounced;
};
exports.debounce = debounce;
//# sourceMappingURL=debounce.js.map