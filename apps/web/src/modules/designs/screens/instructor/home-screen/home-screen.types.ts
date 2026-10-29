import type { Locale } from "@/i18n/locales";

export type HomeState = "home" | "noneAssigned" | "loading";

export type HomeScreenProps = {
  locale: Locale;
  state: HomeState;
};
