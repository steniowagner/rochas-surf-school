import { useState } from "react";
import { useTranslation } from "react-i18next";

import {
  getFreeSeats,
  getHiddenSeats,
  getStudentsLabel,
  isClassFull,
} from "../../utils/occupancy";
import { personLabel } from "../../utils/person-label";

import type {
  ClassPeopleInstructorPill,
  ClassPeopleSeat,
  ClassPeopleStudentRow,
  UseClassPeopleProps,
} from "./class-people.types";

export const CLASS_PEOPLE_AVATARS = 5;

export const useClassPeople = ({
  instructors,
  students,
  guests,
  seatsTaken,
  capacity,
  state,
  onOpenInstructor,
  onOpenStudent,
  onTakeOut,
}: UseClassPeopleProps) => {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  // The first seats, students first and then guests; "+N" counts the others.
  const shown: ClassPeopleSeat[] = [
    ...students.map((student) => ({
      kind: "student" as const,
      id: student.id,
      label: personLabel(student.name, "student", t),
      erased: student.name === null,
      photoUrl: student.photoUrl,
    })),
    ...guests.map((guest) => ({ kind: "guest" as const, id: guest.id })),
  ].slice(0, CLASS_PEOPLE_AVATARS);
  const full = isClassFull(seatsTaken, capacity);

  // An erased person (no name) has no sheet to open and no seat to take out.
  const instructorPills: ClassPeopleInstructorPill[] = instructors.map(
    (instructor) => {
      const { name } = instructor;

      return {
        id: instructor.id,
        label: personLabel(name, "instructor", t),
        erased: name === null,
        photoUrl: instructor.photoUrl,
        isViewer: instructor.isViewer,
        onPress:
          name === null
            ? undefined
            : () => onOpenInstructor?.({ ...instructor, name }),
      };
    },
  );
  const studentRows: ClassPeopleStudentRow[] = students.map((student) => {
    const { name } = student;

    return {
      id: student.id,
      label: personLabel(name, "student", t),
      erased: name === null,
      photoUrl: student.photoUrl,
      onPress:
        name === null ? undefined : () => onOpenStudent?.({ ...student, name }),
      onTakeOut:
        name === null || !onTakeOut
          ? undefined
          : () => onTakeOut({ ...student, name }),
    };
  });

  return {
    instructorPills,
    studentRows,
    shown,
    hiddenSeats: getHiddenSeats(seatsTaken, shown.length),
    studentsLabel: getStudentsLabel(seatsTaken, state === "finished"),
    // Only a class with students or guests has a list to open.
    canExpand: students.length > 0 || guests.length > 0,
    expanded,
    toggle: () => setExpanded((open) => !open),
    full,
    freeSeats: getFreeSeats(seatsTaken, capacity),
    // Nothing is left to fill in a class that is over.
    showCapacityLine: state !== "finished" && state !== "cancelled",
  };
};
