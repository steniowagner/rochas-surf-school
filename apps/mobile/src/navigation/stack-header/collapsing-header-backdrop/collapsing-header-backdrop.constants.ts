/** How strong the backdrop is behind the header, from 0 (none) to 1 (solid page color). The fade below scales with it. */
export const BACKDROP_OPACITY = 0.7;

const BAND_COUNT = 12;

/** The height of each band of the fade below the header: 12 bands of 2pt, a 24pt fade. */
export const FADE_BAND_HEIGHT = 2;

/** The opacity of each band, top to bottom: from almost the backdrop's own opacity to almost clear. */
export const FADE_BANDS = Array.from(
  { length: BAND_COUNT },
  (_, index) => BACKDROP_OPACITY * (1 - (index + 1) / (BAND_COUNT + 1)),
);
