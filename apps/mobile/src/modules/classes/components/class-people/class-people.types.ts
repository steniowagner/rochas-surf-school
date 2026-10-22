import type { ClassState } from "@rochas-surf-school/classes";

import type {
  ClassDetailsStudent,
  ClassDetailsTeacher,
  ClassGuest,
  ClassStudent,
} from "../../classes.types";

export type ClassPeopleInstructor = ClassDetailsTeacher & {
  /** The signed-in viewer teaches the class: shown as "You". */
  isViewer: boolean;
};

export type ClassPeopleProps = {
  instructors: ClassPeopleInstructor[];
  /** All the approved students of the class. */
  students: ClassDetailsStudent[];
  /** The trial guests: the name is `null` ("Trial") for who may not see it. */
  guests: ClassGuest[];
  /** Admins only: the capacity line says how many seats are trial guests. */
  showTrialCount?: boolean;
  /** Students plus guests. */
  seatsTaken: number;
  capacity: number;
  state: ClassState;
  /** Pressing an instructor's pill: opens their person sheet. */
  onOpenInstructor?: (instructor: ClassPeopleInstructor) => void;
  /** Pressing a student's row: opens their person sheet. */
  onOpenStudent?: (student: ClassDetailsStudent) => void;
  /** Admins only, on a class that hasn't started: each student row gets a "Retirar" button that calls it. */
  onTakeOut?: (student: ClassStudent) => void;
  /** Admins only, on a class that hasn't started: each guest row gets a "Retirar" button that calls it. */
  onTakeGuestOut?: (guest: ClassGuest) => void;
};

export type UseClassPeopleProps = Omit<
  ClassPeopleProps,
  | "instructors"
  | "onOpenInstructor"
  | "onOpenStudent"
  | "onTakeOut"
  | "onTakeGuestOut"
  | "showTrialCount"
>;

/** One of the stacked avatars: a student's photo or initials, or a guest's person icon. */
export type ClassPeopleSeat =
  | { kind: "student"; id: string; name: string; photoUrl: string | null }
  | { kind: "guest"; id: string };
