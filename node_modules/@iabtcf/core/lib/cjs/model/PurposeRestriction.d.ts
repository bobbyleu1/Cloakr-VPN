import { Cloneable } from '../Cloneable.js';
import { RestrictionType } from './RestrictionType.js';
export declare class PurposeRestriction extends Cloneable<PurposeRestriction> {
    static hashSeparator: string;
    private purposeId_;
    restrictionType: RestrictionType;
    /**
     * constructor
     *
     * @param {number} purposeId? - may optionally pass the purposeId into the
     * constructor
     * @param {RestrictionType} restrictionType? - may
     * optionally pass the restrictionType into the constructor
     * @return {undefined}
     */
    constructor(purposeId?: number, restrictionType?: RestrictionType);
    static unHash(hash: string): PurposeRestriction;
    get hash(): string;
    /**
     * @return {number} The purpose Id associated with a publisher
     * purpose-by-vendor restriction that resulted in a different consent or LI
     * status than the consent or LI purposes allowed lists.
     */
    get purposeId(): number;
    /**
     * @param {number} idNum - The purpose Id associated with a publisher
     * purpose-by-vendor restriction that resulted in a different consent or LI
     * status than the consent or LI purposes allowed lists.
     */
    set purposeId(idNum: number);
    isValid(): boolean;
    isSameAs(otherPR: PurposeRestriction): boolean;
}
