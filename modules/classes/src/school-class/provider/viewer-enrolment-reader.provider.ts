/** The caller's latest enrolment in a class. */
export interface ViewerEnrolment {
  id: string;
  /** The enrolment status as stored, for example `pending`. */
  status: string;
  requestedAt: Date;
  /** The denial reason (or the take-out reason), when one was written. */
  reason?: string | null;
}

export interface ViewerEnrolmentReader {
  /**
   * The viewer's latest enrolment (by `requestedAt`, then `id`) in each of the classes, in one read. A class
   * where the viewer has none is missing from the answer.
   */
  findLatest(viewerId: string, classIds: string[]): Promise<Map<string, ViewerEnrolment>>;
}
