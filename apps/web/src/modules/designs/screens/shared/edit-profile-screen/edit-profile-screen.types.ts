import type { Locale } from "@/i18n/locales";

export type EditProfileState = "idle" | "invalidName" | "saving";

export type EditProfileScreenProps = {
  locale: Locale;
  state: EditProfileState;
};
