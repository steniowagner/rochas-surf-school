import { TeachingReleaser } from "../../src";

export class FakeTeachingReleaser implements TeachingReleaser {
  readonly released: string[] = [];
  /** The actor of each release, in the same order as `released`. */
  readonly actors: (string | undefined)[] = [];
  failWith: Error | null = null;
  /** What `releaseUpcomingClasses` answers: the classes released. */
  count = 0;

  async releaseUpcomingClasses(userId: string, actorId?: string): Promise<number> {
    if (this.failWith) throw this.failWith;
    this.released.push(userId);
    this.actors.push(actorId);
    return this.count;
  }
}
