import { SchoolClass } from "../model";

export interface SchoolClassRepository {
  /** Stores every class with its instructors in one atomic write. */
  createMany(classes: SchoolClass[]): Promise<void>;
  /** The classes whose start is at or after `from` and before `to`. */
  findStartingBetween(from: Date, to: Date): Promise<SchoolClass[]>;
  /** The class with its instructor ids, or null when there is none. */
  findById(id: string): Promise<SchoolClass | null>;
  /** Writes the class and replaces its instructors in one atomic write. */
  update(schoolClass: SchoolClass): Promise<void>;
}
