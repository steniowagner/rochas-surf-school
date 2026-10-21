/** One page of the classes a student took, newest start first, with how many there are in all. */
export interface MyClassHistoryPage {
  ids: string[];
  total: number;
}

export interface MyClassesReader {
  /** The classes whose end is after `now` (cancelled ones included) where the student has any enrolment. */
  findCurrentClassIds(studentId: string, now: Date): Promise<string[]>;
  /**
   * The classes that ended at or before `now`, aren't cancelled, and where the student's latest enrolment is
   * `approved`, newest start first (then id), one page of them.
   */
  findHistoryClassIds(
    studentId: string,
    now: Date,
    page: number,
    perPage: number,
  ): Promise<MyClassHistoryPage>;
}
