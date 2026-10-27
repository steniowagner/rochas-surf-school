import {
  getClassState,
  isWithoutDeadline,
  isWithoutInstructor,
} from "@rochas-surf-school/classes";
import { useTranslation } from "react-i18next";

import { getEnrolmentDisplay } from "../../../enrolment/utils/enrolment-status";
import {
  getHiddenSeats,
  getOccupancyPercent,
  getOccupancyTone,
  getStudentsLabel,
  isClassFull,
} from "../../utils/occupancy";
import { personLabel } from "../../utils/person-label";
import { schoolTimeOf } from "../../utils/week";

import type { UseClassCardProps, UseClassCardResult } from "./class-card.types";

export const CLASS_CARD_AVATARS = 4;

export const useClassCard = ({
  item,
  now,
  showEnrolment,
  isNext,
}: UseClassCardProps): UseClassCardResult => {
  const { t } = useTranslation();
  // An erased instructor still counts: the class isn't "without instructor".
  const names = item.instructors.map((instructor) => instructor.name);

  const state = getClassState(
    new Date(item.startsAt),
    new Date(item.endsAt),
    now,
    item.cancelledAt ? new Date(item.cancelledAt) : null,
  );

  const avatars = item.students.slice(0, CLASS_CARD_AVATARS).map((student) => ({
    id: student.id,
    label: personLabel(student.name, "student", t),
    erased: student.name === null,
    photoUrl: student.photoUrl,
  }));
  const full = isClassFull(item.seatsTaken, item.capacity);
  // The started, finished and cancelled chips win over the viewer's enrolment.
  const enrolment =
    showEnrolment && state === "not-started"
      ? getEnrolmentDisplay(item.myEnrolment, full)
      : null;

  return {
    state,
    next: !!isNext && state === "not-started",
    timeRange: `${schoolTimeOf(item.startsAt)} – ${schoolTimeOf(item.endsAt)}`,
    showOccupancy: state === "not-started" || state === "started",
    occupancyPercent: getOccupancyPercent(item.seatsTaken, item.capacity),
    occupancyTone: getOccupancyTone(
      item.seatsTaken,
      item.capacity,
      item.discipline,
    ),
    full,
    showFullChip: full && state === "not-started" && enrolment === null,
    enrolment,
    showFooter: state !== "cancelled",
    avatars,
    hiddenSeats: getHiddenSeats(item.seatsTaken, avatars.length),
    studentsLabel: getStudentsLabel(item.seatsTaken, state === "finished"),
    withoutInstructor: isWithoutInstructor(names.length, state),
    withoutDeadline: isWithoutDeadline(item.cancellationDeadline, state),
  };
};
