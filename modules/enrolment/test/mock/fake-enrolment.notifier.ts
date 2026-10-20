import {
  EnrolmentNotifier,
  RequestDecided,
  RequestDenied,
  RequestExpired,
  SeatCancelled,
  SeatRequested,
  StudentEnrolled,
} from "../../src";

export class FakeEnrolmentNotifier implements EnrolmentNotifier {
  readonly requestedEvents: SeatRequested[] = [];
  readonly expiredEvents: RequestExpired[] = [];
  readonly approvedEvents: RequestDecided[] = [];
  readonly deniedEvents: RequestDenied[] = [];
  readonly cancelledEvents: SeatCancelled[] = [];
  readonly enrolledEvents: StudentEnrolled[] = [];
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

  async requestApproved(event: RequestDecided): Promise<void> {
    if (this.error) throw this.error;
    this.approvedEvents.push(event);
  }

  async requestDenied(event: RequestDenied): Promise<void> {
    if (this.error) throw this.error;
    this.deniedEvents.push(event);
  }

  async seatCancelled(event: SeatCancelled): Promise<void> {
    if (this.error) throw this.error;
    this.cancelledEvents.push(event);
  }

  async studentEnrolled(event: StudentEnrolled): Promise<void> {
    if (this.error) throw this.error;
    this.enrolledEvents.push(event);
  }
}
