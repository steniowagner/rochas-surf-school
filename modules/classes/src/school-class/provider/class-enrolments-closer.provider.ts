export interface ClassEnrolmentsCloser {
  /**
   * Ends the pending and approved enrolments of the cancelled class and returns the students who held them,
   * each once. Ended enrolments stay as they are.
   */
  closeOpenEnrolments(classId: string): Promise<string[]>;
}
