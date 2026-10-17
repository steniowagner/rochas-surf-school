import { SeatCounter } from "../../src";

export class FakeSeatCounter implements SeatCounter {
  constructor(private seatsTaken = 0) {}

  async countSeatsTaken(): Promise<number> {
    return this.seatsTaken;
  }
}
