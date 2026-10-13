import { ClockProvider } from "../../src";

export class FakeClockProvider implements ClockProvider {
  constructor(private current: Date) {}

  now(): Date {
    return new Date(this.current.getTime());
  }
}
