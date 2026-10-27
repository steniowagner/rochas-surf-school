import { useTranslation } from "react-i18next";

import {
  getHiddenSeats,
  getOccupancyPercent,
  getStudentsLabel,
  isClassFull,
} from "../../utils/occupancy";
import { personLabel } from "../../utils/person-label";
import { schoolTimeOf } from "../../utils/week";
import { CLASS_CARD_AVATARS } from "../class-card/class-card.hook";

import type {
  UseOngoingClassCardProps,
  UseOngoingClassCardResult,
} from "./ongoing-class-card.types";

export const useOngoingClassCard = ({
  item,
}: UseOngoingClassCardProps): UseOngoingClassCardResult => {
  const { t } = useTranslation();
  const avatars = item.students.slice(0, CLASS_CARD_AVATARS).map((student) => ({
    id: student.id,
    label: personLabel(student.name, "student", t),
    erased: student.name === null,
    photoUrl: student.photoUrl,
  }));

  return {
    timeRange: `${schoolTimeOf(item.startsAt)} – ${schoolTimeOf(item.endsAt)}`,
    occupancyPercent: getOccupancyPercent(item.seatsTaken, item.capacity),
    full: isClassFull(item.seatsTaken, item.capacity),
    avatars,
    hiddenSeats: getHiddenSeats(item.seatsTaken, avatars.length),
    studentsLabel: getStudentsLabel(item.seatsTaken, false),
  };
};
