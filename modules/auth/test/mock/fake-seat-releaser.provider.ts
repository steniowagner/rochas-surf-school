import { SeatReleaser } from "../../src";

export class FakeSeatReleaser implements SeatReleaser {
  readonly released: string[] = [];
  failWith: Error | null = null;
  /** What `releaseSeats` answers: the seats cancelled plus the requests withdrawn. */
  count = 0;

  async releaseSeats(userId: string): Promise<number> {
    if (this.failWith) throw this.failWith;
    this.released.push(userId);
    return this.count;
  }
}
