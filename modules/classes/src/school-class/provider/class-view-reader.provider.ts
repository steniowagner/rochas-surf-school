import { ClassDiscipline, ClassLevel } from "../model";

export interface ClassViewLocation {
  id: string;
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
}

export interface ClassViewInstructor {
  id: string;
  /** Null once the person's account was erased. */
  name: string | null;
  photoUrl: string | null;
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
  cancelledAt: Date | null;
  cancellationMessage: string | null;
  cancellationDeadline: Date | null;
  location: ClassViewLocation;
  instructors: ClassViewInstructor[];
}

export interface ClassViewReader {
  /** The classes whose start is at or after `from` and before `to`. */
  findStartingBetween(from: Date, to: Date): Promise<ClassView[]>;
  findById(id: string): Promise<ClassView | null>;
  /** The classes with these ids, in no particular order; an id with no class is left out. */
  findByIds(ids: string[]): Promise<ClassView[]>;
}
