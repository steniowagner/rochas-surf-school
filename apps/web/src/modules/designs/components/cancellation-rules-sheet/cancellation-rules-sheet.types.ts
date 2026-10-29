import type { Locale } from "@/i18n/locales";

export type CancellationRulesSheetProps = {
  locale: Locale;
  status: "ready" | "loading" | "error";
  /** The rule of each sport, as the school wrote it; `null` for a sport without one. */
  rules?: { surf: string | null; skate: string | null };
};
