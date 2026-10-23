import { ClassDiscipline, SchoolClass } from "../model";

export interface SchoolClassUpdateOptions {
  /** Clears the cancellation deadline (no deadline, no attempts, due now) and bumps its revision. */
  clearDeadline?: boolean;
  /** Clears the reminder mark, so the new start is reminded. */
  clearReminder?: boolean;
}

export interface SchoolClassRepository {
  /** Stores every class with its instructors in one atomic write. */
  createMany(classes: SchoolClass[]): Promise<void>;
  /** The classes whose start is at or after `from` and before `to`. */
  findStartingBetween(from: Date, to: Date): Promise<SchoolClass[]>;
  /** The class with its instructor ids, or null when there is none. */
  findById(id: string): Promise<SchoolClass | null>;
  /**
   * Writes the class and replaces its instructors in one atomic write; the options clear the deadline and the
   * reminder mark in that same write. The stored reminder mark is never written from `schoolClass`. Returns
   * `false`, writing nothing, when the stored class is cancelled.
   */
  update(schoolClass: SchoolClass, options: SchoolClassUpdateOptions): Promise<boolean>;
  /**
   * Marks the class as cancelled at `at`, with the message (or none). Returns `true` when it cancelled the
   * class and `false` when it was already cancelled (or is gone): of two simultaneous cancels exactly one wins.
   */
  cancel(id: string, at: Date, message: string | null): Promise<boolean>;
  /**
   * Deletes the class (its instructor rows go with it) only while it isn't cancelled and starts after `now`.
   * Returns `true` when it deleted the class and `false` otherwise (cancelled, started or gone): of two
   * simultaneous deletes exactly one wins.
   */
  delete(id: string, now: Date): Promise<boolean>;
  /**
   * The classes with `userId` among their instructors that start after `now` and aren't cancelled, sorted by
   * `startsAt` then `id`.
   */
  findUpcomingTaughtBy(userId: string, now: Date): Promise<SchoolClass[]>;
  /**
   * Takes `userId` off the instructors of those classes in one atomic write, leaving the other instructors.
   * An empty list writes nothing.
   */
  removeInstructor(userId: string, classIds: string[]): Promise<void>;
  /**
   * At most `limit` classes of those `disciplines` that start after `now`, aren't cancelled, have no deadline
   * and whose next attempt is due (none, or at or before `now`): the never-tried ones first, then by `startsAt`,
   * then `id`.
   */
  findNeedingDeadline(query: {
    now: Date;
    disciplines: ClassDiscipline[];
    limit: number;
  }): Promise<SchoolClass[]>;
  /**
   * Stores the worked-out deadline (and resets the attempts) only if the class is still at `revision` and not
   * cancelled. Returns whether it wrote.
   */
  saveDeadline(id: string, revision: number, deadline: Date): Promise<boolean>;
  /**
   * Records a failed attempt (the attempt count and when the next one is due) under the same conditions as
   * `saveDeadline`. Returns whether it wrote.
   */
  recordDeadlineFailure(
    id: string,
    revision: number,
    attempts: number,
    nextAttemptAt: Date,
  ): Promise<boolean>;
}
