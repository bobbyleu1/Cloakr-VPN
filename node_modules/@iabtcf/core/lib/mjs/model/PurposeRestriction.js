import { Cloneable } from '../Cloneable.js';
import { TCModelError } from '../errors/index.js';
import { RestrictionType } from './RestrictionType.js';
export class PurposeRestriction extends Cloneable {
    static hashSeparator = '-';
    purposeId_;
    restrictionType;
    /**
     * constructor
     *
     * @param {number} purposeId? - may optionally pass the purposeId into the
     * constructor
     * @param {RestrictionType} restrictionType? - may
     * optionally pass the restrictionType into the constructor
     * @return {undefined}
     */
    constructor(purposeId, restrictionType) {
        super();
        if (purposeId !== undefined) {
            this.purposeId = purposeId;
        }
        if (restrictionType !== undefined) {
            this.restrictionType = restrictionType;
        }
    }
    static unHash(hash) {
        const splitUp = hash.split(this.hashSeparator);
        const purpRestriction = new PurposeRestriction();
        if (splitUp.length !== 2) {
            throw new TCModelError('hash', hash);
        }
        purpRestriction.purposeId = parseInt(splitUp[0], 10);
        purpRestriction.restrictionType = parseInt(splitUp[1], 10);
        return purpRestriction;
    }
    get hash() {
        if (!this.isValid()) {
            throw new Error('cannot hash invalid PurposeRestriction');
        }
        return `${this.purposeId}${PurposeRestriction.hashSeparator}${this.restrictionType}`;
    }
    /**
     * @return {number} The purpose Id associated with a publisher
     * purpose-by-vendor restriction that resulted in a different consent or LI
     * status than the consent or LI purposes allowed lists.
     */
    get purposeId() {
        return this.purposeId_;
    }
    /**
     * @param {number} idNum - The purpose Id associated with a publisher
     * purpose-by-vendor restriction that resulted in a different consent or LI
     * status than the consent or LI purposes allowed lists.
     */
    set purposeId(idNum) {
        this.purposeId_ = idNum;
    }
    isValid() {
        return (Number.isInteger(this.purposeId) &&
            this.purposeId > 0 &&
            (this.restrictionType === RestrictionType.NOT_ALLOWED ||
                this.restrictionType === RestrictionType.REQUIRE_CONSENT ||
                this.restrictionType === RestrictionType.REQUIRE_LI));
    }
    isSameAs(otherPR) {
        return (this.purposeId === otherPR.purposeId &&
            this.restrictionType === otherPR.restrictionType);
    }
}
