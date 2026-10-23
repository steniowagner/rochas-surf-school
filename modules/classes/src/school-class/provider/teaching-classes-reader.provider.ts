export interface TeachingClassesReader {
  /**
   * The classes whose end is after `now` (cancelled ones included) where the person is one of the instructors,
   * by start, then id.
   */
  findCurrentClassIds(teacherId: string, now: Date): Promise<string[]>;
  /** Whether the person is an instructor of any class, in any state. */
  teachesAny(teacherId: string): Promise<boolean>;
}
