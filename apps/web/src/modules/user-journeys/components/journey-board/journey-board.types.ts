import type { Dictionary } from "@/i18n/dictionary.types";
import type { Locale } from "@/i18n/locales";

import type { UserJourneyFlowSlug } from "../../data/user-journey-flows";
import type { JourneyBoardGroup } from "../../utils/journey-groups";

export type JourneyBoardProps = {
  flow: UserJourneyFlowSlug;
  locale: Locale;
  groups: JourneyBoardGroup[];
  labels: Dictionary["userJourneys"]["labels"];
  /** The first line of the copied summary: the site's name, "User journeys" and the flow's title. */
  siteName: string;
  heading: string;
  flowTitle: string;
};

export type UseJourneyBoardProps = Pick<JourneyBoardProps, "flow" | "groups" | "labels" | "siteName" | "heading" | "flowTitle">;
