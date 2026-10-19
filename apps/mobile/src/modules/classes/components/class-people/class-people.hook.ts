import { useState } from "react";

import { getFreeSeats, getHiddenSeats, getStudentsLabel, isClassFull } from "../../utils/occupancy";

import type { UseClassPeopleProps } from "./class-people.types";

export const CLASS_PEOPLE_AVATARS = 5;

export const useClassPeople = ({
  students,
  seatsTaken,
  capacity,
  state,
}: UseClassPeopleProps) => {
  const [expanded, setExpanded] = useState(false);
  const shown = students.slice(0, CLASS_PEOPLE_AVATARS);
  const full = isClassFull(seatsTaken, capacity);

  return {
    shown,
    hiddenSeats: getHiddenSeats(seatsTaken, shown.length),
    studentsLabel: getStudentsLabel(seatsTaken, state === "finished"),
    // Only a class with students has a list to open.
    canExpand: students.length > 0,
    expanded,
    toggle: () => setExpanded((open) => !open),
    full,
    freeSeats: getFreeSeats(seatsTaken, capacity),
    // Nothing is left to fill in a class that is over.
    showCapacityLine: state !== "finished" && state !== "cancelled",
  };
};
