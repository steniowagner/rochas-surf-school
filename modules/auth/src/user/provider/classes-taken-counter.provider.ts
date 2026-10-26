/** Counts the classes people took; implemented by the backend module that owns enrolments. */
export interface ClassesTakenCounter {
  /**
   * For each user, how many classes ended, weren't cancelled and kept an approved seat for them as of `now`. Every
   * id is present in the answer, 0 by default.
   */
  countTaken(userIds: string[], now: Date): Promise<Record<string, number>>;
}
