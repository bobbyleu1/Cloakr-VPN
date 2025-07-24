/**
 * if a Vendor has declared flexible purposes (see: [[Vendor]] under
 * `flexiblePurposeIds`) on the Global Vendor List ([[Declarations]]) a CMP may
 * change their legal basis for processing in the encoding.
 */
export var RestrictionType;
(function (RestrictionType) {
    /**
     * under no circumstances is this purpose allowed.
     */
    RestrictionType[RestrictionType["NOT_ALLOWED"] = 0] = "NOT_ALLOWED";
    /**
     * if the default declaration is legitimate interest then this flips the purpose to consent in the encoding.
     */
    RestrictionType[RestrictionType["REQUIRE_CONSENT"] = 1] = "REQUIRE_CONSENT";
    /**
     * if the default declaration is consent then this flips the purpose to Legitimate Interest in the encoding.
     */
    RestrictionType[RestrictionType["REQUIRE_LI"] = 2] = "REQUIRE_LI";
})(RestrictionType || (RestrictionType = {}));
