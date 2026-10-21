export interface StudentLookup {
  /** Whether the user is an approved account with the student role. */
  isApprovedStudent(studentId: string): Promise<boolean>;
}
