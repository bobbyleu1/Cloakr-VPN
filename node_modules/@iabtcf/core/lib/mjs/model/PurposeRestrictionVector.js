import { PurposeRestriction } from './PurposeRestriction.js';
import { BinarySearchTree } from './BinarySearchTree.js';
import { RestrictionType } from './RestrictionType.js';
import { Cloneable } from '../Cloneable.js';
export class PurposeRestrictionVector extends Cloneable {
    /**
     * if this originatd from an encoded string we'll need a place to store the
     * bit length; it can be set and got from here
     */
    bitLength = 0;
    /**
     * a map indexed by a string which will be a 'hash' of the purpose and
     * restriction type.
     *
     * Using a BST to keep vendors in a sorted order for encoding later
     */
    map = new Map();
    gvl_;
    has(hash) {
        return this.map.has(hash);
    }
    isOkToHave(restrictionType, purposeId, vendorId) {
        let result = true;
        /**
         * without a gvl set, there's no way to know... in that case we'll return
         * true but once the GVL is set later we'll go through these and clean up
         * the mess.
         */
        if (this.gvl?.vendors) {
            const vendor = this.gvl.vendors[vendorId];
            if (vendor) {
                if (restrictionType === RestrictionType.NOT_ALLOWED) {
                    /**
                     * if it's "not allowed" then flexible declaration is ignored but if
                     * if it isn't even listed as one of the purposes the vendor uses,
                     * then there is no reason to encode the value so check both arrays
                     * to see if it exists.  If it does then we can restrict it.
                     */
                    result = (vendor.legIntPurposes.includes(purposeId) || vendor.purposes.includes(purposeId));
                }
                else if (vendor.flexiblePurposes.length) {
                    switch (restrictionType) {
                        /**
                         * If the vendor has the purposeId in flexiblePurposes and it is
                         * listed as a legitimate interest purpose we can set the
                         * override to require consent.
                         */
                        case RestrictionType.REQUIRE_CONSENT:
                            result = (vendor.flexiblePurposes.includes(purposeId) && vendor.legIntPurposes.includes(purposeId));
                            break;
                        /**
                         * If the vendor has the purposeId in flexiblePurposes and it is
                         * listed as a consent purpose we can set the
                         * override to require legitimate interest.
                         */
                        case RestrictionType.REQUIRE_LI:
                            result = (vendor.flexiblePurposes.includes(purposeId) && vendor.purposes.includes(purposeId));
                            break;
                    }
                }
                else {
                    result = false;
                }
            }
            else {
                // this vendor doesn't exist
                result = false;
            }
        }
        // if the gvl isn't defined, we can't do anything until later
        return result;
    }
    /**
     * add - adds a given Vendor ID under a given Purpose Restriction
     *
     * @param {number} vendorId
     * @param {PurposeRestriction} purposeRestriction
     * @return {void}
     */
    add(vendorId, purposeRestriction) {
        if (this.isOkToHave(purposeRestriction.restrictionType, purposeRestriction.purposeId, vendorId)) {
            const hash = purposeRestriction.hash;
            if (!this.has(hash)) {
                this.map.set(hash, new BinarySearchTree());
                this.bitLength = 0;
            }
            /**
             * Previously I had a check here to remove a duplicate value, but because
             * we're using a tree the value is guaranteed to be unique so there is no
             * need to add an additional de-duplication here.
             */
            this.map.get(hash).add(vendorId);
        }
    }
    /**
     * restrictPurposeToLegalBasis - adds all Vendors under a given Purpose Restriction
     *
     * @param {PurposeRestriction} purposeRestriction
     * @return {void}
     */
    restrictPurposeToLegalBasis(purposeRestriction) {
        const vendors = this.gvl.vendorIds;
        const hash = purposeRestriction.hash;
        const lastEntry = (function () {
            let value;
            for (value of vendors)
                ;
            return value;
        })();
        /**
         * Create an ordered array of vendor IDs from `1` (the minimum value for Vendor ID) to `lastEntry`
         */
        const values = [...Array(lastEntry).keys()].map((i) => i + 1);
        for (let i = 1; i <= lastEntry; i++) {
            if (!this.has(hash)) {
                this.map.set(hash, BinarySearchTree.build(values)); // use static method `build` to create a `BST` from the ordered array of IDs
                this.bitLength = 0;
            }
            /**
             * Previously I had a check here to remove a duplicate value, but because
             * we're using a tree the value is guaranteed to be unique so there is no
             * need to add an additional de-duplication here.
             */
            this.map.get(hash).add(i);
        }
    }
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
    getVendors(purposeRestriction) {
        let vendorIds = [];
        if (purposeRestriction) {
            const hash = purposeRestriction.hash;
            if (this.has(hash)) {
                vendorIds = this.map.get(hash).get();
            }
        }
        else {
            const vendorSet = new Set();
            this.map.forEach((bst) => {
                bst.get().forEach((vendorId) => {
                    vendorSet.add(vendorId);
                });
            });
            vendorIds = Array.from(vendorSet);
        }
        return vendorIds;
    }
    getRestrictionType(vendorId, purposeId) {
        let rType;
        this.getRestrictions(vendorId).forEach((purposeRestriction) => {
            if (purposeRestriction.purposeId === purposeId) {
                if (rType === undefined || rType > purposeRestriction.restrictionType) {
                    rType = purposeRestriction.restrictionType;
                }
            }
        });
        return rType;
    }
    /**
     * vendorHasRestriction - determines whether a given Vendor ID is under a
     * given Purpose Restriction
     *
     * @param {number} vendorId
     * @param {PurposeRestriction} purposeRestriction
     * @return {boolean} - true if the give Vendor ID is under the given Purpose
     * Restriction
     */
    vendorHasRestriction(vendorId, purposeRestriction) {
        let has = false;
        const restrictions = this.getRestrictions(vendorId);
        for (let i = 0; i < restrictions.length && !has; i++) {
            has = purposeRestriction.isSameAs(restrictions[i]);
        }
        return has;
    }
    /**
     * getMaxVendorId - gets the Maximum Vendor ID regardless of Purpose
     * Restriction
     *
     * @return {number} - maximum Vendor ID
     */
    getMaxVendorId() {
        let retr = 0;
        this.map.forEach((bst) => {
            retr = Math.max(bst.max(), retr);
        });
        return retr;
    }
    getRestrictions(vendorId) {
        const retr = [];
        this.map.forEach((bst, hash) => {
            if (vendorId) {
                if (bst.contains(vendorId)) {
                    retr.push(PurposeRestriction.unHash(hash));
                }
            }
            else {
                retr.push(PurposeRestriction.unHash(hash));
            }
        });
        return retr;
    }
    getPurposes() {
        const purposeIds = new Set();
        this.map.forEach((bst, hash) => {
            purposeIds.add(PurposeRestriction.unHash(hash).purposeId);
        });
        return Array.from(purposeIds);
    }
    /**
     * remove - removes Vendor ID from a Purpose Restriction
     *
     * @param {number} vendorId
     * @param {PurposeRestriction} purposeRestriction
     * @return {void}
     */
    remove(vendorId, purposeRestriction) {
        const hash = purposeRestriction.hash;
        const bst = this.map.get(hash);
        if (bst) {
            bst.remove(vendorId);
            // if it's empty let's delete the key so it doesn't show up empty
            if (bst.isEmpty()) {
                this.map.delete(hash);
                this.bitLength = 0;
            }
        }
    }
    /**
     * Essential for being able to determine whether we can actually set a
     * purpose restriction since they have to have a flexible legal basis
     *
     * @param {GVL} value - the GVL instance
     */
    set gvl(value) {
        if (!this.gvl_) {
            this.gvl_ = value;
            /**
             * if we have restrictions set before the gvl is set then we'll have to
             * go through and remove some if they're not valid
             */
            this.map.forEach((bst, hash) => {
                const purposeRestriction = PurposeRestriction.unHash(hash);
                const vendors = bst.get();
                vendors.forEach((vendorId) => {
                    if (!this.isOkToHave(purposeRestriction.restrictionType, purposeRestriction.purposeId, vendorId)) {
                        bst.remove(vendorId);
                    }
                });
            });
        }
    }
    /**
     * gvl returns local copy of the GVL these restrictions apply to
     *
     * @return {GVL}
     */
    get gvl() {
        return this.gvl_;
    }
    /**
     * isEmpty - whether or not this vector has any restrictions in it
     *
     * @return {boolean}
     */
    isEmpty() {
        return this.map.size === 0;
    }
    ;
    /**
     * numRestrictions - returns the number of Purpose Restrictions.
     *
     * @return {number}
     */
    get numRestrictions() {
        return this.map.size;
    }
}
