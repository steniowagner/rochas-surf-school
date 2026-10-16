import { ClassDiscipline, ClassLevel } from "../model";

export interface ClassViewLocation {
  id: string;
  name: string;
  address: string;
}

export interface ClassViewInstructor {
  id: string;
  name: string;
}

/** A class as people see it: with its location and the names of its instructors. */
export interface ClassView {
  id: string;
  discipline: ClassDiscipline;
  level: ClassLevel;
  startsAt: Date;
  endsAt: Date;
  capacity: number;
  notes: string | null;
  location: ClassViewLocation;
  instructors: ClassViewInstructor[];
}

export interface ClassViewReader {
  /** The classes whose start is at or after `from` and before `to`. */
  findStartingBetween(from: Date, to: Date): Promise<ClassView[]>;
  findById(id: string): Promise<ClassView | null>;
}
