import { ClassActor, SeatCounter, assertCanReadClasses } from "@rochas-surf-school/classes";
import {
  DomainError,
  ForbiddenError,
  NotFoundError,
  UseCase,
  UuidRule,
} from "@rochas-surf-school/shared";
import { Enrolment } from "../model";
import {
  ClockProvider,
  EnrolmentClass,
  EnrolmentClassReader,
  EnrolmentNotifier,
  EnrolmentRepository,
  StudentNameReader,
  WaitingListSetting,
} from "../provider";
import { EnrolmentOut, toEnrolmentOut } from "./enrolment.out";

export interface RequestSeatIn {
  actor: ClassActor;
  classId: string;
  /** Required to be `true` only when the class's discipline has a cancellation rule. */
  acceptCancellationRule?: unknown;
}

const uuidRule = new UuidRule();

function isUuid(value: unknown): value is string {
  return typeof value === "string" && uuidRule.validate(value) === null;
}

export class RequestSeat implements UseCase<RequestSeatIn, EnrolmentOut> {
  constructor(
    private readonly enrolmentRepository: EnrolmentRepository,
    private readonly classReader: EnrolmentClassReader,
    private readonly studentNameReader: StudentNameReader,
    private readonly enrolmentNotifier: EnrolmentNotifier,
    private readonly clockProvider: ClockProvider,
    private readonly waitingListSetting: WaitingListSetting,
    private readonly seatCounter: SeatCounter,
  ) {}

  async execute(input: RequestSeatIn): Promise<EnrolmentOut> {
    assertCanReadClasses(input.actor);

    if (input.actor.role !== "student") {
      throw new ForbiddenError("enrolment.role.notStudent");
    }

    const found = isUuid(input.classId) ? await this.classReader.findById(input.classId) : null;

    if (!found) {
      throw new NotFoundError("class.notFound");
    }

    const now = this.clockProvider.now();

    if (found.cancelledAt) {
      throw new DomainError("class.cancelled", 409);
    }

    if (now.getTime() >= found.startsAt.getTime()) {
      throw new DomainError("class.started", 409);
    }

    if (!(await this.waitingListSetting.isEnabled())) {
      const seatsTaken = await this.seatCounter.countSeatsTaken(found.id);

      if (seatsTaken >= found.capacity) {
        throw new DomainError("enrolment.waitingList.closed", 409);
      }
    }

    if (found.hasCancellationRule && input.acceptCancellationRule !== true) {
      throw new DomainError("enrolment.rule.notAccepted", 422);
    }

    const stored = await this.enrolmentRepository.create(
      new Enrolment({
        classId: found.id,
        studentId: input.actor.id,
        status: "pending",
        requestedAt: now,
        ruleAcceptedAt: found.hasCancellationRule ? now : null,
      }),
    );

    await this.notify(found, input.actor.id);

    return toEnrolmentOut(stored);
  }

  /** A failed notification never changes the answer; the adapter logs it. */
  private async notify(found: EnrolmentClass, studentId: string): Promise<void> {
    try {
      const studentName = await this.studentNameReader.findName(studentId);

      if (studentName === null) return;

      await this.enrolmentNotifier.seatRequested({
        classId: found.id,
        studentId,
        studentName,
        discipline: found.discipline,
        startsAt: found.startsAt,
        instructorIds: found.instructorIds,
      });
    } catch {
      // swallowed on purpose
    }
  }
}
