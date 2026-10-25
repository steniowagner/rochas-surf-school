const BAND_COUNT = 12;

/** The height of each band of the fade below the header: 12 bands of 2pt, a 24pt fade. */
export const FADE_BAND_HEIGHT = 2;

/** The opacity of each band, top to bottom: from almost solid to almost clear. */
export const FADE_BANDS = Array.from(
  { length: BAND_COUNT },
  (_, index) => 1 - (index + 1) / (BAND_COUNT + 1),
);
