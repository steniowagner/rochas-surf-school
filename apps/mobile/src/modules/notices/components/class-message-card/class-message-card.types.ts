import type { ClassDetailsPerson } from "@/modules/classes/screens/class-details.screen.types";

import type { ClassMessageView } from "../../notices.types";

export type ClassMessageCardProps = {
  view: ClassMessageView;
  /** The chevron of a person's row: opens their person sheet. */
  onOpenPerson: (person: ClassDetailsPerson) => void;
};
