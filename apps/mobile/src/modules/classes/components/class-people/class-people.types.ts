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
  /** Admins only, on a class that hasn't started: each student row gets a "Retirar" button that calls it. */
  onTakeOut?: (student: ClassStudent) => void;
};

export type UseClassPeopleProps = Omit<ClassPeopleProps, "instructors" | "onTakeOut">;
