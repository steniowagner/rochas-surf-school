/** An approved student of a class. */
export interface ClassStudent {
  id: string;
  /** Null once the student's account was erased. */
  name: string | null;
  photoUrl: string | null;
  /** The student's approved enrolment in the class, which an admin can take them out of. */
  enrolmentId: string;
}

/** A trial guest of a class: the name is null once it was erased. */
export interface ClassGuest {
  id: string;
  name: string | null;
}

/** Who holds the seats of a class. */
export interface ClassRoster {
  /** All the seats taken: approved students plus guests. Never capped. */
  seatsTaken: number;
  /** The approved students, capped by the `studentsLimit` asked for. */
  students: ClassStudent[];
  /** The guests, uncapped (they are few), in the order they were added, then by id. */
  guests: ClassGuest[];
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
