import { ClockProvider } from "@rochas-surf-school/auth";

export class FakeClockProvider implements ClockProvider {
  constructor(private readonly current: Date) {}

  now(): Date {
    return new Date(this.current.getTime());
  }
}
