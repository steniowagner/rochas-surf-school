import type { Locale } from "@/i18n/locales";

export type DisciplineFilterValue = "all" | "surf" | "skate";

export type DisciplineFilterProps = {
  locale: Locale;
  value: DisciplineFilterValue;
  /** The options are drawn over a scrim that dims the whole frame, as the button is open. */
  open?: boolean;
};
