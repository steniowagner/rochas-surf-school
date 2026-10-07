import { ClockProvider } from "../../src";

export class FakeClockProvider implements ClockProvider {
  private current: Date;

  constructor(start: Date = new Date("2026-10-07T12:00:00.000Z")) {
    this.current = new Date(start.getTime());
  }

  now(): Date {
    return new Date(this.current.getTime());
  }

  set(date: Date): void {
    this.current = new Date(date.getTime());
  }

  advance(ms: number): void {
    this.current = new Date(this.current.getTime() + ms);
  }
}
