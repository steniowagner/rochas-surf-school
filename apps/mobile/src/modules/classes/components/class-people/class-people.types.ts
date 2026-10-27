import type { ClassState } from "@rochas-surf-school/classes";

import type {
  ClassDetailsStudent,
  ClassDetailsTeacher,
  ClassGuest,
  ClassStudent,
  Named,
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
  /** Pressing an instructor's pill: opens their person sheet. An erased instructor's pill can't be pressed. */
  onOpenInstructor?: (instructor: Named<ClassPeopleInstructor>) => void;
  /** Pressing a student's row: opens their person sheet. An erased student's row can't be pressed. */
  onOpenStudent?: (student: Named<ClassDetailsStudent>) => void;
  /**
   * Admins only, on a class that hasn't started: each student row gets a "Retirar" button that calls it, except an
   * erased student's.
   */
  onTakeOut?: (student: Named<ClassStudent>) => void;
  /** Admins only, on a class that hasn't started: each guest row gets a "Retirar" button that calls it. */
  onTakeGuestOut?: (guest: ClassGuest) => void;
};

export type UseClassPeopleProps = Omit<
  ClassPeopleProps,
  "onTakeGuestOut" | "showTrialCount"
>;

/** One of the stacked avatars: a student's photo, initials or erased icon, or a guest's person icon. */
export type ClassPeopleSeat =
  | {
      kind: "student";
      id: string;
      /** The name, or "Former student". */
      label: string;
      erased: boolean;
      photoUrl: string | null;
    }
  | { kind: "guest"; id: string };

/** An instructor's pill: an erased one reads "Former instructor" and has no `onPress`. */
export type ClassPeopleInstructorPill = {
  id: string;
  label: string;
  erased: boolean;
  isViewer: boolean;
  onPress?: () => void;
};

/** A student's row: an erased one reads "Former student" and has neither `onPress` nor `onTakeOut`. */
export type ClassPeopleStudentRow = {
  id: string;
  label: string;
  erased: boolean;
  photoUrl: string | null;
  onPress?: () => void;
  onTakeOut?: () => void;
};
