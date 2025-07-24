import { PurposeRestriction } from './PurposeRestriction.js';
import { RestrictionType } from './RestrictionType.js';
import { GVL } from '../GVL.js';
import { Cloneable } from '../Cloneable.js';
export declare class PurposeRestrictionVector extends Cloneable<PurposeRestrictionVector> {
    /**
     * if this originatd from an encoded string we'll need a place to store the
     * bit length; it can be set and got from here
     */
    bitLength: number;
    /**
     * a map indexed by a string which will be a 'hash' of the purpose and
     * restriction type.
     *
     * Using a BST to keep vendors in a sorted order for encoding later
     */
    private map;
    private gvl_;
    private has;
    private isOkToHave;
    /**
     * add - adds a given Vendor ID under a given Purpose Restriction
     *
     * @param {number} vendorId
     * @param {PurposeRestriction} purposeRestriction
     * @return {void}
     */
    add(vendorId: number, purposeRestriction: PurposeRestriction): void;
    /**
     * restrictPurposeToLegalBasis - adds all Vendors under a given Purpose Restriction
     *
     * @param {PurposeRestriction} purposeRestriction
     * @return {void}
     */
    restrictPurposeToLegalBasis(purposeRestriction: PurposeRestriction): void;
    /**
     * getVendors - returns array of vendor ids optionally narrowed by a given
     * Purpose Restriction.  If no purpose restriction is passed then all vendor
     * ids will be returned.  One can expect this result to be a unique set of
     * ids no duplicates.
     *
     * @param {PurposeRestriction} [purposeRestriction] - optionally passed to
     * get only Vendor IDs restricted under the given Purpose Restriction
     * @return {number[]} - Unique ID set of vendors
     */
    getVendors(purposeRestriction?: PurposeRestriction): number[];
    getRestrictionType(vendorId: number, purposeId: number): RestrictionType | undefined;
    /**
     * vendorHasRestriction - determines whether a given Vendor ID is under a
     * given Purpose Restriction
     *
     * @param {number} vendorId
     * @param {PurposeRestriction} purposeRestriction
     * @return {boolean} - true if the give Vendor ID is under the given Purpose
     * Restriction
     */
    vendorHasRestriction(vendorId: number, purposeRestriction: PurposeRestriction): boolean;
    /**
     * getMaxVendorId - gets the Maximum Vendor ID regardless of Purpose
     * Restriction
     *
     * @return {number} - maximum Vendor ID
     */
    getMaxVendorId(): number;
    getRestrictions(vendorId?: number): PurposeRestriction[];
    getPurposes(): number[];
    /**
     * remove - removes Vendor ID from a Purpose Restriction
     *
     * @param {number} vendorId
     * @param {PurposeRestriction} purposeRestriction
     * @return {void}
     */
    remove(vendorId: number, purposeRestriction: PurposeRestriction): void;
    /**
     * Essential for being able to determine whether we can actually set a
     * purpose restriction since they have to have a flexible legal basis
     *
     * @param {GVL} value - the GVL instance
     */
    set gvl(value: GVL);
    /**
     * gvl returns local copy of the GVL these restrictions apply to
     *
     * @return {GVL}
     */
    get gvl(): GVL;
    /**
     * isEmpty - whether or not this vector has any restrictions in it
     *
     * @return {boolean}
     */
    isEmpty(): boolean;
    /**
     * numRestrictions - returns the number of Purpose Restrictions.
     *
     * @return {number}
     */
    get numRestrictions(): number;
}
