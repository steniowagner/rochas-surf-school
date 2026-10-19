import { EnrolmentNotifier, RequestExpired, SeatRequested } from "../../src";

export class FakeEnrolmentNotifier implements EnrolmentNotifier {
  readonly requestedEvents: SeatRequested[] = [];
  readonly expiredEvents: RequestExpired[] = [];
  /** Set to make every notification fail. */
  error: Error | null = null;

  async seatRequested(event: SeatRequested): Promise<void> {
    if (this.error) throw this.error;
    this.requestedEvents.push(event);
  }

  async requestExpired(event: RequestExpired): Promise<void> {
    if (this.error) throw this.error;
    this.expiredEvents.push(event);
  }
}
