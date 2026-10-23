export interface MyClassesReader {
  /** The classes whose end is after `now` (cancelled ones included) where the student has any enrolment. */
  findCurrentClassIds(studentId: string, now: Date): Promise<string[]>;
  /**
   * The classes that ended at or before `now`, aren't cancelled, and where the student's latest enrolment is
   * `approved`, whose start is at or after `from` and before `to`, newest start first (then id).
   */
  findHistoryClassIds(studentId: string, now: Date, from: Date, to: Date): Promise<string[]>;
}
