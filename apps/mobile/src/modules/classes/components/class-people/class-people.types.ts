import type { ClassState } from "@rochas-surf-school/classes";

import type { ClassStudent } from "../../classes.types";

export type ClassPeopleInstructor = {
  id: string;
  name: string;
  /** The signed-in viewer teaches the class: shown as "You". */
  isViewer: boolean;
};

export type ClassPeopleProps = {
  instructors: ClassPeopleInstructor[];
  /** All the approved students of the class. */
  students: ClassStudent[];
  /** Students plus guests. */
  seatsTaken: number;
  capacity: number;
  state: ClassState;
};

export type UseClassPeopleProps = Omit<ClassPeopleProps, "instructors">;
