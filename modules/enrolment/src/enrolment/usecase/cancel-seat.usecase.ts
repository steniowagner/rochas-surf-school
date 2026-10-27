import { ClassActor, assertCanReadClasses } from "@rochas-surf-school/classes";
import { DomainError, NotFoundError, UseCase, UuidRule } from "@rochas-surf-school/shared";
import {
  ClockProvider,
  EnrolmentClass,
  EnrolmentClassReader,
  EnrolmentNotifier,
  EnrolmentRepository,
  StudentNameReader,
} from "../provider";
import { EnrolmentOut, toEnrolmentOut } from "./enrolment.out";

export interface CancelSeatIn {
  actor: ClassActor;
  id: string;
}

const uuidRule = new UuidRule();

function isUuid(value: unknown): value is string {
  return typeof value === "string" && uuidRule.validate(value) === null;
}

export class CancelSeat implements UseCase<CancelSeatIn, EnrolmentOut> {
  constructor(
    private readonly enrolmentRepository: EnrolmentRepository,
    private readonly classReader: EnrolmentClassReader,
    private readonly studentNameReader: StudentNameReader,
    private readonly enrolmentNotifier: EnrolmentNotifier,
    private readonly clockProvider: ClockProvider,
  ) {}

  async execute(input: CancelSeatIn): Promise<EnrolmentOut> {
    assertCanReadClasses(input.actor);

    const stored = isUuid(input.id) ? await this.enrolmentRepository.findById(input.id) : null;

    if (!stored || stored.studentId !== input.actor.id) {
      throw new NotFoundError("enrolment.notFound");
    }

    const found = await this.classReader.findById(stored.classId);

    if (!found) {
      throw new NotFoundError("enrolment.notFound");
    }

    const now = this.clockProvider.now();
    const cancelled = stored.cancel(now);

    this.assertCancellable(found, now);

    if (!(await this.enrolmentRepository.cancel(stored.id, now))) {
      throw new DomainError("enrolment.notApproved", 409);
    }

    await this.notify(found, input.actor.id);

    return toEnrolmentOut(cancelled);
  }

  /** The deadline is exclusive: at it the seat is no longer cancellable. */
  private assertCancellable(found: EnrolmentClass, now: Date): void {
    if (now.getTime() >= found.startsAt.getTime()) {
      throw new DomainError("class.started", 409);
    }

    if (!found.cancellationDeadline) {
      throw new DomainError("enrolment.deadline.missing", 409);
    }

    if (now.getTime() >= found.cancellationDeadline.getTime()) {
      throw new DomainError("enrolment.deadline.passed", 409);
    }
  }

  /** A failed notification never undoes the cancellation; the adapter logs it. */
  private async notify(found: EnrolmentClass, studentId: string): Promise<void> {
    try {
      const studentName = await this.studentNameReader.findName(studentId);

      if (studentName === null) return;

      await this.enrolmentNotifier.seatCancelled({
        classId: found.id,
        studentId,
        studentName,
        discipline: found.discipline,
        startsAt: found.startsAt,
        waitingCount: await this.enrolmentRepository.countPendingForClass(found.id),
        instructorIds: found.instructorIds,
      });
    } catch {
      // swallowed on purpose
    }
  }
}
