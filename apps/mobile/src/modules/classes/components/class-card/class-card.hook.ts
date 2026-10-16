import { getClassState } from "@rochas-surf-school/classes";

import { schoolTimeOf } from "../../utils/week";

import type { UseClassCardProps, UseClassCardResult } from "./class-card.types";

const SHOWN_INSTRUCTORS = 2;

export const useClassCard = ({
  item,
  now,
}: UseClassCardProps): UseClassCardResult => {
  const names = item.instructors.map((instructor) => instructor.name);
  const hidden = names.length - SHOWN_INSTRUCTORS;
  const shown = names.slice(0, SHOWN_INSTRUCTORS).join(" · ");

  return {
    state: getClassState(new Date(item.startsAt), new Date(item.endsAt), now),
    timeRange: `${schoolTimeOf(item.startsAt)} – ${schoolTimeOf(item.endsAt)}`,
    instructors: hidden > 0 ? `${shown} +${hidden}` : shown,
  };
};
