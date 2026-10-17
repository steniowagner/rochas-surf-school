import { SchoolClass } from "../model";

export interface SchoolClassRepository {
  /** Stores every class with its instructors in one atomic write. */
  createMany(classes: SchoolClass[]): Promise<void>;
  /** The classes whose start is at or after `from` and before `to`. */
  findStartingBetween(from: Date, to: Date): Promise<SchoolClass[]>;
  /** The class with its instructor ids, or null when there is none. */
  findById(id: string): Promise<SchoolClass | null>;
  /**
   * Writes the class and replaces its instructors in one atomic write. Returns `false`, writing nothing,
   * when the stored class is cancelled.
   */
  update(schoolClass: SchoolClass): Promise<boolean>;
  /**
   * Marks the class as cancelled at `at`, with the message (or none). Returns `true` when it cancelled the
   * class and `false` when it was already cancelled (or is gone): of two simultaneous cancels exactly one wins.
   */
  cancel(id: string, at: Date, message: string | null): Promise<boolean>;
}
