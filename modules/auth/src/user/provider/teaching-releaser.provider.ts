/**
 * Takes a person off every class of theirs that hasn't started; implemented by the backend module that owns
 * classes, so auth doesn't depend on it. Releasing twice changes nothing more.
 */
export interface TeachingReleaser {
  releaseUpcomingClasses(userId: string): Promise<void>;
}
