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
export declare abstract class Cloneable<T> {
    /**
     * clone - returns a copy of the classes with new values and not references
     *
     * @return {T}
     */
    clone(): T;
    /**
     * deepClone - recursive function that makes copies of reference values
     *
     * @param {unknown} item
     * @return {unknown}
     */
    private deepClone;
}
