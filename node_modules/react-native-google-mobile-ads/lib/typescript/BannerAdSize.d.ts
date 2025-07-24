export declare enum BannerAdSize {
    /**
     * Mobile Marketing Association (MMA) banner ad size (320x50 density-independent pixels).
     */
    BANNER = "BANNER",
    /**
     * Interactive Advertising Bureau (IAB) full banner ad size (468x60 density-independent pixels).
     */
    FULL_BANNER = "FULL_BANNER",
    /**
     * Large banner ad size (320x100 density-independent pixels).
     */
    LARGE_BANNER = "LARGE_BANNER",
    /**
     * Interactive Advertising Bureau (IAB) leaderboard ad size (728x90 density-independent pixels).
     */
    LEADERBOARD = "LEADERBOARD",
    /**
     * Interactive Advertising Bureau (IAB) medium rectangle ad size (300x250 density-independent pixels).
     */
    MEDIUM_RECTANGLE = "MEDIUM_RECTANGLE",
    /**
     * @deprecated Use `ANCHORED_ADAPTIVE_BANNER` instead.
     */
    ADAPTIVE_BANNER = "ADAPTIVE_BANNER",
    /**
     * A (next generation) dynamically sized banner that is full-width and auto-height.
     */
    ANCHORED_ADAPTIVE_BANNER = "ANCHORED_ADAPTIVE_BANNER",
    /**
     * Inline adaptive banners are larger, taller banners compared to anchored adaptive banners. They are of variable height, and can be as tall as the device screen.
     * They are intended to be placed in scrolling content.
     */
    INLINE_ADAPTIVE_BANNER = "INLINE_ADAPTIVE_BANNER",
    /**
     * IAB wide skyscraper ad size (160x600 density-independent pixels). This size is currently not supported by the Google Mobile Ads network; this is intended for mediation ad networks only.
     */
    WIDE_SKYSCRAPER = "WIDE_SKYSCRAPER"
}
export declare const GAMBannerAdSize: {
    /**
     * A dynamically sized banner that matches its parent's width and expands/contracts its height to match the ad's content after loading completes.
     */
    readonly FLUID: "FLUID";
    /**
     * Mobile Marketing Association (MMA) banner ad size (320x50 density-independent pixels).
     */
    readonly BANNER: BannerAdSize.BANNER;
    /**
     * Interactive Advertising Bureau (IAB) full banner ad size (468x60 density-independent pixels).
     */
    readonly FULL_BANNER: BannerAdSize.FULL_BANNER;
    /**
     * Large banner ad size (320x100 density-independent pixels).
     */
    readonly LARGE_BANNER: BannerAdSize.LARGE_BANNER;
    /**
     * Interactive Advertising Bureau (IAB) leaderboard ad size (728x90 density-independent pixels).
     */
    readonly LEADERBOARD: BannerAdSize.LEADERBOARD;
    /**
     * Interactive Advertising Bureau (IAB) medium rectangle ad size (300x250 density-independent pixels).
     */
    readonly MEDIUM_RECTANGLE: BannerAdSize.MEDIUM_RECTANGLE;
    /**
     * @deprecated Use `ANCHORED_ADAPTIVE_BANNER` instead.
     */
    readonly ADAPTIVE_BANNER: BannerAdSize.ADAPTIVE_BANNER;
    /**
     * A (next generation) dynamically sized banner that is full-width and auto-height.
     */
    readonly ANCHORED_ADAPTIVE_BANNER: BannerAdSize.ANCHORED_ADAPTIVE_BANNER;
    /**
     * Inline adaptive banners are larger, taller banners compared to anchored adaptive banners. They are of variable height, and can be as tall as the device screen.
     * They are intended to be placed in scrolling content.
     */
    readonly INLINE_ADAPTIVE_BANNER: BannerAdSize.INLINE_ADAPTIVE_BANNER;
    /**
     * IAB wide skyscraper ad size (160x600 density-independent pixels). This size is currently not supported by the Google Mobile Ads network; this is intended for mediation ad networks only.
     */
    readonly WIDE_SKYSCRAPER: BannerAdSize.WIDE_SKYSCRAPER;
};
//# sourceMappingURL=BannerAdSize.d.ts.map