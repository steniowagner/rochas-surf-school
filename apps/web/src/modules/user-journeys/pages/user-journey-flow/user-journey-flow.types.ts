import type { Dictionary } from "@/i18n/dictionary.types";
import type { Locale } from "@/i18n/locales";

import type { UserJourneyFlowSlug } from "../../data/user-journey-flows";

export type UserJourneyFlowPageProps = {
  locale: Locale;
  flow: UserJourneyFlowSlug;
  text: Dictionary["userJourneys"];
  siteName: string;
};
