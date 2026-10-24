/**
 * Takes a person off every class of theirs that hasn't started; implemented by the backend module that owns
 * classes, so auth doesn't depend on it. Releasing twice changes nothing more.
 */
export interface TeachingReleaser {
  /**
   * `actorId` is the admin who caused the release (a demotion), left out of the "class without an instructor"
   * notice. Returns how many classes the person was taken off.
   */
  releaseUpcomingClasses(userId: string, actorId?: string): Promise<number>;
}
