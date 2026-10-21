import type { ClassState } from "@rochas-surf-school/classes";

import type { ClassGuest, ClassStudent } from "../../classes.types";

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
  /** The trial guests: the name is `null` ("Trial") for who may not see it. */
  guests: ClassGuest[];
  /** Admins only: the capacity line says how many seats are trial guests. */
  showTrialCount?: boolean;
  /** Students plus guests. */
  seatsTaken: number;
  capacity: number;
  state: ClassState;
  /** Admins only, on a class that hasn't started: each student row gets a "Retirar" button that calls it. */
  onTakeOut?: (student: ClassStudent) => void;
  /** Admins only, on a class that hasn't started: each guest row gets a "Retirar" button that calls it. */
  onTakeGuestOut?: (guest: ClassGuest) => void;
};

export type UseClassPeopleProps = Omit<
  ClassPeopleProps,
  "instructors" | "onTakeOut" | "onTakeGuestOut" | "showTrialCount"
>;
