import type { Locale } from "@/i18n/locales";

/**
 * `edit`: the class's form with its values; `managingLocations`: scrolled to the locations being managed, the class's
 * own one since removed; `started`: only the instructors can change; `loading`: the class is on its way.
 */
export type EditClassState = "edit" | "managingLocations" | "started" | "loading";

export type EditClassScreenProps = {
  locale: Locale;
  state: EditClassState;
  /** The class's notes, as the school typed them (spec 072 D-04). */
  notes: string;
};
