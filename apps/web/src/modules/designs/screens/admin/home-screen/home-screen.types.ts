import type { Locale } from "@/i18n/locales";

/** `notTeaching`: an admin without the instructor flag, with nothing waiting. `loading`: no counts yet (or they failed). */
export type AdminHomeState = "home" | "notTeaching" | "loading";

export type HomeScreenProps = {
  locale: Locale;
  state: AdminHomeState;
  /** A toast over the top, after a form that went back to the home: the app message's key and its values. */
  toast?: { key: string; params?: Record<string, string | number> };
};
