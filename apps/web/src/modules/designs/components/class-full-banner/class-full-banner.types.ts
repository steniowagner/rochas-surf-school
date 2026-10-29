import type { Locale } from "@/i18n/locales";

export type ClassFullBannerProps = {
  locale: Locale;
  /** `open`: the student can join the waiting list; `closed`: it is closed for this class. */
  waitingList: "open" | "closed";
};
