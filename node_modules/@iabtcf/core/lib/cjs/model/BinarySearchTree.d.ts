import { Cloneable } from '../Cloneable.js';
interface TreeNode {
    value: number;
    right: TreeNode | null;
    left: TreeNode | null;
}
declare type TreeNodeMaybe = TreeNode | null;
export declare class BinarySearchTree extends Cloneable<BinarySearchTree> {
    private root;
    getRoot(): TreeNodeMaybe;
    isEmpty(): boolean;
    add(value: number): void;
    /**
     * performs Morris in-order traversal
     * @return {number[]} sorted array
     */
    get(): number[];
    contains(value: number): boolean;
    min(current?: TreeNodeMaybe): number;
    max(current?: TreeNodeMaybe): number;
    remove(value: number, current?: TreeNodeMaybe): void;
    /**
     * Build Binary Search Tree from the ordered number array.
     *  The depth of the tree will be the `log2` of the array length.
     * @param {number[]} values number array in ascending order
     * @return {BinarySearchTree} Binary Search Tree
     */
    static build(values?: number[]): BinarySearchTree | null;
}
export {};
