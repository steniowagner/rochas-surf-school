export interface TeachingClassesReader {
  /**
   * The classes whose end is after `now` (cancelled ones included) where the person is one of the instructors,
   * by start, then id.
   */
  findCurrentClassIds(teacherId: string, now: Date): Promise<string[]>;
  /**
   * The classes the person taught: where they are one of the instructors, the end is at or before `now`, not
   * cancelled, and the start is in `[from, to)`. Newest first (start, then id, descending).
   */
  findHistoryClassIds(teacherId: string, now: Date, from: Date, to: Date): Promise<string[]>;
  /** Whether the person is an instructor of any class, in any state. */
  teachesAny(teacherId: string): Promise<boolean>;
}
