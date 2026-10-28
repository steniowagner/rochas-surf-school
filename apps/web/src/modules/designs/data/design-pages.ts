/** The design pages that exist. A later spec adds its page here, in its dictionary and in `src/app/[lang]/designs/`. */
export const designPages = [{ slug: "design-system", dictionaryKey: "designSystem" }] as const;

export type DesignPage = (typeof designPages)[number];
