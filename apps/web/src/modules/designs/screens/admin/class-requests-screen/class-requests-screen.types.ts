import type { Locale } from "@/i18n/locales";

/**
 * `ready`: the intro and every class's requests; `fullClass`: scrolled to the full class's group; `filtered`: surf
 * only; `denySheet` and `approved` (its toast) over the list; `emptyFiltered`: no surf request (only a skate class waits);
 * `empty`, `loading` and `error` keep the title in the header.
 */
export type ClassRequestsState = "ready" | "fullClass" | "filtered" | "denySheet" | "approved" | "empty" | "emptyFiltered" | "loading" | "error";

export type ClassRequestsScreenProps = {
  locale: Locale;
  state: ClassRequestsState;
};
