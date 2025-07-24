import { Cloneable } from './Cloneable.js';
import { GVLError } from './errors/index.js';
import { ConsentLanguages, IntMap } from './model/index.js';
import { Feature, Purpose, Stack, Vendor, VendorList } from './model/gvl/index.js';
export declare type VersionOrVendorList = string | number | VendorList;
/**
 * class with utilities for managing the global vendor list.  Will use JSON to
 * fetch the vendor list from specified url and will serialize it into this
 * object and provide accessors.  Provides ways to group vendors on the list by
 * purpose and feature.
 */
export declare class GVL extends Cloneable<GVL> implements VendorList {
    private static LANGUAGE_CACHE;
    private static CACHE;
    private static LATEST_CACHE_KEY;
    static readonly DEFAULT_LANGUAGE: string;
    /**
     * Set of available consent languages published by the IAB
     */
    static readonly consentLanguages: ConsentLanguages;
    private static baseUrl_;
    /**
     * baseUrl - Entities using the vendor-list.json are required by the iab to
     * host their own copy of it to reduce the load on the iab's infrastructure
     * so a 'base' url must be set to be put together with the versioning scheme
     * of the filenames.
     *
     * @static
     * @param {string} url - the base url to load the vendor-list.json from.  This is
     * broken out from the filename because it follows a different scheme for
     * latest file vs versioned files.
     *
     * @throws {GVLError} - If the url is http[s]://vendorlist.consensu.org/...
     * this will throw an error.  IAB Europe requires that that CMPs and Vendors
     * cache their own copies of the GVL to minimize load on their
     * infrastructure.  For more information regarding caching of the
     * vendor-list.json, please see [the TCF documentation on 'Caching the Global
     * Vendor List'
     * ](https://github.com/InteractiveAdvertisingBureau/GDPR-Transparency-and-Consent-Framework/blob/master/TCFv2/IAB%20Tech%20Lab%20-%20Consent%20string%20and%20vendor%20list%20formats%20v2.md#caching-the-global-vendor-list)
     */
    static set baseUrl(url: string);
    /**
     * baseUrl - Entities using the vendor-list.json are required by the iab to
     * host their own copy of it to reduce the load on the iab's infrastructure
     * so a 'base' url must be set to be put together with the versioning scheme
     * of the filenames.
     *
     * @static
     * @return {string} - returns the previously set baseUrl, the default is
     * `undefined`
     */
    static get baseUrl(): string;
    /**
     * @static
     * @param {string} - the latest is assumed to be vendor-list.json because
     * that is what the iab uses, but it could be different... if you want
     */
    static latestFilename: string;
    /**
     * @static
     * @param {string} - the versioned name is assumed to be
     * vendor-list-v[VERSION].json where [VERSION] will be replaced with the
     * specified version.  But it could be different... if you want just make
     * sure to include the [VERSION] macro if you have a numbering scheme, it's a
     * simple string substitution.
     *
     * eg.
     * ```javascript
     * GVL.baseUrl = "http://www.mydomain.com/iabcmp/";
     * GVL.versionedFilename = "vendorlist?getVersion=[VERSION]";
     * ```
     */
    static versionedFilename: string;
    /**
     * @param {string} - Translations of the names and descriptions for Purposes,
     * Special Purposes, Features, and Special Features to non-English languages
     * are contained in a file where attributes containing English content
     * (except vendor declaration information) are translated.  The iab publishes
     * one following the scheme below where the LANG is the iso639-1 language
     * code.  For a list of available translations
     * [please go here](https://register.consensu.org/Translation).
     *
     * eg.
     * ```javascript
     * GVL.baseUrl = "http://www.mydomain.com/iabcmp/";
     * GVL.languageFilename = "purposes?getPurposes=[LANG]";
     * ```
     */
    static languageFilename: string;
    /**
     * @param {Promise} resolved when this GVL object is populated with the data
     * or rejected if there is an error.
     */
    readyPromise: Promise<void | GVLError>;
    /**
     * @param {number} gvlSpecificationVersion - schema version for the GVL that is used
     */
    gvlSpecificationVersion: number;
    /**
     * @param {number} incremented with each published file change
     */
    vendorListVersion: number;
    /**
     * @param {number} tcfPolicyVersion - The TCF MO will increment this value
     * whenever a GVL change (such as adding a new Purpose or Feature or a change
     * in Purpose wording) legally invalidates existing TC Strings and requires
     * CMPs to re-establish transparency and consent from users. If the policy
     * version number in the latest GVL is different from the value in your TC
     * String, then you need to re-establish transparency and consent for that
     * user. A version 1 format TC String is considered to have a version value
     * of 1.
     */
    tcfPolicyVersion: number;
    /**
     * @param {string | Date} lastUpdated - the date in which the vendor list
     * json file  was last updated.
     */
    lastUpdated: string | Date;
    /**
     * @param {IntMap<Purpose>} a collection of [[Purpose]]s
     */
    purposes: IntMap<Purpose>;
    /**
     * @param {IntMap<Purpose>} a collection of [[Purpose]]s
     */
    specialPurposes: IntMap<Purpose>;
    /**
     * @param {IntMap<Feature>} a collection of [[Feature]]s
     */
    features: IntMap<Feature>;
    /**
     * @param {IntMap<Feature>} a collection of [[Feature]]s
     */
    specialFeatures: IntMap<Feature>;
    /**
     * @param {boolean} internal reference of when the GVL is ready to be used
     */
    private isReady_;
    /**
     * @param {IntMap<Vendor>} a collection of [[Vendor]]s
     */
    private vendors_;
    vendorIds: Set<number>;
    /**
     * @param {IntMap<Vendor>} a collection of [[Vendor]]. Used as a backup if a whitelist is sets
     */
    private fullVendorList;
    /**
     * @param {ByPurposeVendorMap} vendors by purpose
     */
    private byPurposeVendorMap;
    /**
     * @param {IDSetMap} vendors by special purpose
     */
    private bySpecialPurposeVendorMap;
    /**
     * @param {IDSetMap} vendors by feature
     */
    private byFeatureVendorMap;
    /**
     * @param {IDSetMap} vendors by special feature
     */
    private bySpecialFeatureVendorMap;
    /**
     * @param {IntMap<Stack>} a collection of [[Stack]]s
     */
    stacks: IntMap<Stack>;
    private lang_;
    private isLatest;
    /**
     * @param {VersionOrVendorList} [versionOrVendorList] - can be either a
     * [[VendorList]] object or a version number represented as a string or
     * number to download.  If nothing is passed the latest version of the GVL
     * will be loaded
     */
    constructor(versionOrVendorList?: VersionOrVendorList);
    /**
     * emptyLanguageCache
     *
     * @param {string} [lang] - Optional ISO 639-1 langauge code to remove from
     * the cache.  Should be one of the languages in GVL.consentLanguages set.
     * If not then the whole cache will be deleted.
     * @return {boolean} - true if anything was deleted from the cache
     */
    static emptyLanguageCache(lang?: string): boolean;
    /**
     * emptyCache
     *
     * @param {number} [vendorListVersion] - version of the vendor list to delete
     * from the cache.  If none is specified then the whole cache is deleted.
     * @return {boolean} - true if anything was deleted from the cache
     */
    static emptyCache(vendorListVersion?: number): boolean;
    private cacheLanguage;
    private fetchJson;
    /**
     * getJson - Method for getting the JSON that was downloaded to created this
     * `GVL` object
     *
     * @return {VendorList} - The basic JSON structure without the extra
     * functionality and methods of this class.
     */
    getJson(): VendorList;
    /**
     * changeLanguage - retrieves the purpose language translation and sets the
     * internal language variable
     *
     * @param {string} lang - ISO 639-1 langauge code to change language to
     * @return {Promise<void | GVLError>} - returns the `readyPromise` and
     * resolves when this GVL is populated with the data from the language file.
     */
    changeLanguage(lang: string): Promise<void | GVLError>;
    get language(): string;
    private isVendorList;
    private populate;
    private mapVendors;
    private getFilteredVendors;
    /**
     * getVendorsWithConsentPurpose
     *
     * @param {number} purposeId
     * @return {IntMap<Vendor>} - list of vendors that have declared the consent purpose id
     */
    getVendorsWithConsentPurpose(purposeId: number): IntMap<Vendor>;
    /**
     * getVendorsWithLegIntPurpose
     *
     * @param {number} purposeId
     * @return {IntMap<Vendor>} - list of vendors that have declared the legInt (Legitimate Interest) purpose id
     */
    getVendorsWithLegIntPurpose(purposeId: number): IntMap<Vendor>;
    /**
     * getVendorsWithFlexiblePurpose
     *
     * @param {number} purposeId
     * @return {IntMap<Vendor>} - list of vendors that have declared the flexible purpose id
     */
    getVendorsWithFlexiblePurpose(purposeId: number): IntMap<Vendor>;
    /**
     * getVendorsWithSpecialPurpose
     *
     * @param {number} specialPurposeId
     * @return {IntMap<Vendor>} - list of vendors that have declared the special purpose id
     */
    getVendorsWithSpecialPurpose(specialPurposeId: number): IntMap<Vendor>;
    /**
     * getVendorsWithFeature
     *
     * @param {number} featureId
     * @return {IntMap<Vendor>} - list of vendors that have declared the feature id
     */
    getVendorsWithFeature(featureId: number): IntMap<Vendor>;
    /**
     * getVendorsWithSpecialFeature
     *
     * @param {number} specialFeatureId
     * @return {IntMap<Vendor>} - list of vendors that have declared the special feature id
     */
    getVendorsWithSpecialFeature(specialFeatureId: number): IntMap<Vendor>;
    /**
     * vendors
     *
     * @return {IntMap<Vendor>} - the list of vendors as it would on the JSON file
     * except if `narrowVendorsTo` was called, it would be that narrowed list
     */
    get vendors(): IntMap<Vendor>;
    /**
     * narrowVendorsTo - narrows vendors represented in this GVL to the list of ids passed in
     *
     * @param {number[]} vendorIds - list of ids to narrow this GVL to
     * @return {void}
     */
    narrowVendorsTo(vendorIds: number[]): void;
    /**
     * isReady - Whether or not this instance is ready to be used.  This will be
     * immediately and synchronously true if a vendorlist object is passed into
     * the constructor or once the JSON vendorllist is retrieved.
     *
     * @return {boolean} whether or not the instance is ready to be interacted
     * with and all the data is populated
     */
    get isReady(): boolean;
    /**
     * clone - overrides base `clone()` method since GVL is a special class that
     * represents a JSON structure with some additional functionality.
     *
     * @return {GVL}
     */
    clone(): GVL;
    static isInstanceOf(questionableInstance: unknown): questionableInstance is GVL;
}
