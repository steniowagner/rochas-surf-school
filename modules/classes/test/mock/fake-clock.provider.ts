import { ClockProvider } from "../../src";

export class FakeClockProvider implements ClockProvider {
  constructor(private readonly current: Date) {}

  now(): Date {
    return new Date(this.current.getTime());
  }
}
