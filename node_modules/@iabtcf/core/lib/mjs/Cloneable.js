/**
 * Abstract Class Cloneable<T> can be extended to give the child class the ability to clone its self.
 * The child class must pass its class to super. You can then pass any needed arguments to help build
 * the cloned class to the protected _clone() method.
 *
 * Example:
 *
 * class Example extends Cloneable<Example> {
 *
 * }
 * Todo: There must be more non primitive build in types to check. But for our current purposes, this works great.
 */
export class Cloneable {
    /**
     * clone - returns a copy of the classes with new values and not references
     *
     * @return {T}
     */
    clone() {
        const myClone = new this.constructor();
        const keys = Object.keys(this);
        keys.forEach((key) => {
            const value = this.deepClone(this[key]);
            if (value !== undefined) {
                myClone[key] = value;
            }
        });
        return myClone;
    }
    ;
    /**
     * deepClone - recursive function that makes copies of reference values
     *
     * @param {unknown} item
     * @return {unknown}
     */
    deepClone(item) {
        const itsType = typeof item;
        if (itsType === 'number' || itsType === 'string' || itsType === 'boolean') {
            return item;
        }
        else if (item !== null && itsType === 'object') {
            if (typeof item.clone === 'function') {
                return item.clone();
            }
            else if (item instanceof Date) {
                return new Date(item.getTime());
            }
            else if (item[Symbol.iterator] !== undefined) {
                const ar = [];
                for (const subItem of item) {
                    ar.push(this.deepClone(subItem));
                }
                if (item instanceof Array) {
                    return ar;
                }
                else {
                    return new item.constructor(ar);
                }
            }
            else {
                const retr = {};
                for (const prop in item) {
                    if (item.hasOwnProperty(prop)) {
                        retr[prop] = this.deepClone(item[prop]);
                    }
                }
                return retr;
            }
        }
        /**
         * ignore functions because those will be initialized with the cloning
         * process
         */
    }
}
