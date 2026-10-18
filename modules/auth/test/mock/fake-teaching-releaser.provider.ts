import { TeachingReleaser } from "../../src";

export class FakeTeachingReleaser implements TeachingReleaser {
  readonly released: string[] = [];
  failWith: Error | null = null;

  async releaseUpcomingClasses(userId: string): Promise<void> {
    if (this.failWith) throw this.failWith;
    this.released.push(userId);
  }
}
