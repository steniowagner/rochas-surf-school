export interface StudentNameReader {
  /** The student's name, or null when there is no such user. */
  findName(studentId: string): Promise<string | null>;
}
