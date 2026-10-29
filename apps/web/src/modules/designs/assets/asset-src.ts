type Asset = string | { src: string };

/** The URL of an imported image: Next gives an object with `src`, the test runner gives the URL itself. */
export const assetSrc = (asset: Asset): string => (typeof asset === "string" ? asset : asset.src);
