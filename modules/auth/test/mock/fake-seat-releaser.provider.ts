import { SeatReleaser } from "../../src";

export class FakeSeatReleaser implements SeatReleaser {
  readonly released: string[] = [];
  failWith: Error | null = null;

  async releaseSeats(userId: string): Promise<void> {
    if (this.failWith) throw this.failWith;
    this.released.push(userId);
  }
}
