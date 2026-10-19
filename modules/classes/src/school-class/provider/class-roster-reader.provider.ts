/** An approved student of a class. */
export interface ClassStudent {
  id: string;
  name: string;
  photoUrl: string | null;
}

/** Who holds the seats of a class. */
export interface ClassRoster {
  /** All the seats taken: approved students plus guests. Never capped. */
  seatsTaken: number;
  /** The approved students, capped by the `studentsLimit` asked for. */
  students: ClassStudent[];
}

/** How many students the week list carries per class (the card shows 4 avatars). */
export const CLASS_CARD_STUDENTS_LIMIT = 4;

export interface ClassRosterReader {
  /**
   * The roster of each class id, in one read. A class missing from the answer has no seats taken.
   * Students come in the order they were approved, then by user id; `studentsLimit` keeps the first
   * ones of that order and never changes `seatsTaken`.
   */
  findRosters(
    classIds: string[],
    studentsLimit?: number,
  ): Promise<Map<string, ClassRoster>>;
}
