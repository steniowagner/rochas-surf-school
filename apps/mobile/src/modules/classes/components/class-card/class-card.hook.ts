import { getClassState, isWithoutDeadline, isWithoutInstructor } from "@rochas-surf-school/classes";

import {
  getHiddenSeats,
  getOccupancyPercent,
  getOccupancyTone,
  getStudentsLabel,
  isClassFull,
} from "../../utils/occupancy";
import { schoolTimeOf } from "../../utils/week";

import type { UseClassCardProps, UseClassCardResult } from "./class-card.types";

export const CLASS_CARD_AVATARS = 4;

export const useClassCard = ({
  item,
  now,
}: UseClassCardProps): UseClassCardResult => {
  const names = item.instructors.map((instructor) => instructor.name);

  const state = getClassState(
    new Date(item.startsAt),
    new Date(item.endsAt),
    now,
    item.cancelledAt ? new Date(item.cancelledAt) : null,
  );

  const avatars = item.students.slice(0, CLASS_CARD_AVATARS);
  const full = isClassFull(item.seatsTaken, item.capacity);

  return {
    state,
    timeRange: `${schoolTimeOf(item.startsAt)} – ${schoolTimeOf(item.endsAt)}`,
    showOccupancy: state === "not-started" || state === "started",
    occupancyPercent: getOccupancyPercent(item.seatsTaken, item.capacity),
    occupancyTone: getOccupancyTone(item.seatsTaken, item.capacity, item.discipline),
    full,
    showFullChip: full && state === "not-started",
    showFooter: state !== "cancelled",
    avatars,
    hiddenSeats: getHiddenSeats(item.seatsTaken, avatars.length),
    studentsLabel: getStudentsLabel(item.seatsTaken, state === "finished"),
    withoutInstructor: isWithoutInstructor(names.length, state),
    withoutDeadline: isWithoutDeadline(item.cancellationDeadline, state),
  };
};
