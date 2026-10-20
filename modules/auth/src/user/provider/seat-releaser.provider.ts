/**
 * Gives up every seat and request of a person that hasn't started: upcoming seats are cancelled (the school is told)
 * and pending requests are withdrawn. Implemented by the backend module that owns enrolments, so auth doesn't
 * depend on it. Releasing twice changes nothing more.
 */
export interface SeatReleaser {
  releaseSeats(userId: string): Promise<void>;
}
