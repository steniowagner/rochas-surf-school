import type { Locale } from "@/i18n/locales";

export type ClassFullBannerProps = {
  locale: Locale;
  /** `open`: the student can join the waiting list; `closed`: it is closed for this class. Without it, the title only (the instructor's). */
  waitingList?: "open" | "closed";
  /** The admin's line: new requests go to the waiting list, or it is off and nobody can ask. */
  adminLine?: "newRequestsWait" | "waitingListOff";
};
