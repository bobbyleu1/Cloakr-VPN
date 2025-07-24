import { Cloneable } from '../Cloneable.js';
import { TCModelError } from '../errors/index.js';
/**
 * Vector class is like a Set except it keeps track of a max id
 */
export class Vector extends Cloneable {
    /**
     * if this originatd from an encoded string we'll need a place to store the
     * bit length; it can be set and got from here
     */
    bitLength = 0;
    maxId_ = 0;
    set_ = new Set();
    *[Symbol.iterator]() {
        for (let i = 1; i <= this.maxId; i++) {
            yield [i, this.has(i)];
        }
    }
    /**
     * values()
     *
     * @return {IterableIterator<number>} - returns an iterator of the positive
     * values in the set
     */
    values() {
        return this.set_.values();
    }
    /**
     * maxId
     *
     * @return {number} - the highest id in this Vector
     */
    get maxId() {
        return this.maxId_;
    }
    /**
     * get
     *
     * @param {number} id - key for value to check
     * @return {boolean} - value of that key, if never set it will be false
     */
    has(id) {
        /**
         * if it exists in the set we'll return true
         */
        return this.set_.has(id);
    }
    /**
     * unset
     *
     * @param {SingleIDOrCollection} id - id or ids to unset
     * @return {void}
     */
    unset(id) {
        if (Array.isArray(id)) {
            id.forEach((id) => this.unset(id));
        }
        else if (typeof id === 'object') {
            this.unset(Object.keys(id).map((strId) => Number(strId)));
        }
        else {
            this.set_.delete(Number(id));
            /**
             * if bitLength was set before, it must now be unset
             */
            this.bitLength = 0;
            if (id === this.maxId) {
                /**
                 * aww bummer we lost our maxId... now we've got to search through
                 * all the ids and find the biggest one.
                 */
                this.maxId_ = 0;
                this.set_.forEach((id) => {
                    this.maxId_ = Math.max(this.maxId, id);
                });
            }
        }
    }
    isIntMap(item) {
        let result = (typeof item === 'object');
        result = (result && Object.keys(item).every((key) => {
            let itemResult = Number.isInteger(parseInt(key, 10));
            itemResult = (itemResult && this.isValidNumber(item[key].id));
            itemResult = (itemResult && item[key].name !== undefined);
            return itemResult;
        }));
        return result;
    }
    isValidNumber(item) {
        return (parseInt(item, 10) > 0);
    }
    isSet(item) {
        let result = false;
        if (item instanceof Set) {
            result = Array.from(item).every(this.isValidNumber);
        }
        return result;
    }
    /**
     * set - sets an item assumed to be a truthy value by its presence
     *
     * @param {SingleIDOrCollection} item - May be a single id (positive integer)
     * or collection of ids in a set, GVL Int Map, or Array.
     *
     * @return {void}
     */
    set(item) {
        /**
         * strategy here is to just recursively call set if it's a collection until
         * we get to the final integer ID
         */
        if (Array.isArray(item)) {
            item.forEach((item) => this.set(item));
        }
        else if (this.isSet(item)) {
            this.set(Array.from(item));
        }
        else if (this.isIntMap(item)) {
            this.set(Object.keys(item).map((strId) => Number(strId)));
        }
        else if (this.isValidNumber(item)) {
            this.set_.add(item);
            this.maxId_ = Math.max(this.maxId, item);
            /**
             * if bitLength was set before, it must now be unset
             */
            this.bitLength = 0;
        }
        else {
            /**
             * Super not cool to try and set something that's not valid
             */
            throw new TCModelError('set()', item, 'must be positive integer array, positive integer, Set<number>, or IntMap');
        }
    }
    empty() {
        this.set_ = new Set();
    }
    /**
     * forEach - to traverse from id=1 to id=maxId in a sequential non-sparse manner
     *
     *
     * @param {forEachCallback} callback - callback to execute
     * @return {void}
     *
     * @callback forEachCallback
     * @param {boolean} value - whether or not this id exists in the vector
     * @param {number} id - the id number of the current iteration
     */
    forEach(callback) {
        for (let i = 1; i <= this.maxId; i++) {
            callback(this.has(i), i);
        }
    }
    get size() {
        return this.set_.size;
    }
    setAll(intMap) {
        this.set(intMap);
    }
}
