export interface PendingRequestCounter {
  /** The enrolment requests of the class that are still waiting for an answer. */
  countPendingRequests(classId: string): Promise<number>;
}
