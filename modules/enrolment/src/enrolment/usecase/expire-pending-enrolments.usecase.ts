import { UseCase } from "@rochas-surf-school/shared";
import { ClockProvider, EnrolmentNotifier, EnrolmentRepository, ExpirableEnrolment } from "../provider";

export interface ExpirePendingEnrolmentsOut {
  expired: number;
}

export class ExpirePendingEnrolments implements UseCase<void, ExpirePendingEnrolmentsOut> {
  constructor(
    private readonly enrolmentRepository: EnrolmentRepository,
    private readonly enrolmentNotifier: EnrolmentNotifier,
    private readonly clockProvider: ClockProvider,
  ) {}

  async execute(): Promise<ExpirePendingEnrolmentsOut> {
    const now = this.clockProvider.now();
    const expirable = await this.enrolmentRepository.findExpirable(now);
    let expired = 0;

    for (const item of expirable) {
      if (!(await this.enrolmentRepository.expire(item.enrolment.id, now))) continue;

      expired += 1;
      await this.notify(item);
    }

    return { expired };
  }

  /** A failed notification never undoes the expiry; the adapter logs it. */
  private async notify(item: ExpirableEnrolment): Promise<void> {
    try {
      await this.enrolmentNotifier.requestExpired({
        studentId: item.enrolment.studentId,
        classId: item.enrolment.classId,
        discipline: item.discipline,
        startsAt: item.startsAt,
      });
    } catch {
      // swallowed on purpose
    }
  }
}
