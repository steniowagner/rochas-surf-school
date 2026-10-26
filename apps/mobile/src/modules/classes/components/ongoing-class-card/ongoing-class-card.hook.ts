import {
  getHiddenSeats,
  getOccupancyPercent,
  getStudentsLabel,
  isClassFull,
} from "../../utils/occupancy";
import { schoolTimeOf } from "../../utils/week";
import { CLASS_CARD_AVATARS } from "../class-card/class-card.hook";

import type {
  UseOngoingClassCardProps,
  UseOngoingClassCardResult,
} from "./ongoing-class-card.types";

export const useOngoingClassCard = ({
  item,
}: UseOngoingClassCardProps): UseOngoingClassCardResult => {
  const avatars = item.students.slice(0, CLASS_CARD_AVATARS);

  return {
    timeRange: `${schoolTimeOf(item.startsAt)} – ${schoolTimeOf(item.endsAt)}`,
    occupancyPercent: getOccupancyPercent(item.seatsTaken, item.capacity),
    full: isClassFull(item.seatsTaken, item.capacity),
    avatars,
    hiddenSeats: getHiddenSeats(item.seatsTaken, avatars.length),
    studentsLabel: getStudentsLabel(item.seatsTaken, false),
  };
};
