import type { ReactNode } from "react";

import type { Locale } from "@/i18n/locales";

export type SiteShellProps = {
  locale: Locale;
  /** `narrow` is the 640 px column of the legal pages; `wide` is for the design pages. */
  width: "narrow" | "wide";
  children: ReactNode;
};
