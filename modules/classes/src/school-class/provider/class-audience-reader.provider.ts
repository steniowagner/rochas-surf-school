/** A person who holds a seat or a pending request in a location's upcoming classes. */
export interface LocationAudienceMember {
  userId: string;
  /** How many of the location's upcoming classes the person is in. */
  count: number;
}

export interface ClassAudienceReader {
  /** The students with an approved or pending enrolment in the class, each person once. */
  findClassAudience(classId: string): Promise<string[]>;
  /**
   * The same people for the location's classes that start after `now` and aren't cancelled, each with
   * how many of those classes they are in.
   */
  findLocationAudience(locationId: string, now: Date): Promise<LocationAudienceMember[]>;
}
