import { ClassActor, assertCanManageClasses } from "@rochas-surf-school/classes";
import { DomainError, UseCase, ValidationError, ValidationException } from "@rochas-surf-school/shared";
import { ENROLMENT_REASON_MAX } from "../model";
import {
  ClockProvider,
  EnrolmentClass,
  EnrolmentClassReader,
  EnrolmentNotifier,
  EnrolmentRepository,
} from "../provider";
import { assertNotStarted, findDecisionTarget } from "./decision";
import { EnrolmentOut, toEnrolmentOut } from "./enrolment.out";

export interface DenyRequestIn {
  actor: ClassActor;
  id: string;
  reason?: unknown;
}

export class DenyRequest implements UseCase<DenyRequestIn, EnrolmentOut> {
  constructor(
    private readonly enrolmentRepository: EnrolmentRepository,
    private readonly classReader: EnrolmentClassReader,
    private readonly enrolmentNotifier: EnrolmentNotifier,
    private readonly clockProvider: ClockProvider,
  ) {}

  async execute(input: DenyRequestIn): Promise<EnrolmentOut> {
    assertCanManageClasses(input.actor);

    const { enrolment, found } = await findDecisionTarget(
      input.id,
      this.enrolmentRepository,
      this.classReader,
    );
    const reason = this.toReason(input.reason);
    const now = this.clockProvider.now();
    const denied = enrolment.deny(reason, now);

    assertNotStarted(found, this.clockProvider);

    if (!(await this.enrolmentRepository.deny(enrolment.id, reason, now))) {
      throw new DomainError("enrolment.notPending", 409);
    }

    await this.notify(denied.studentId, found.id, found.discipline, found.startsAt, reason);

    return toEnrolmentOut(denied);
  }

  /** The trimmed reason; blank or missing is none, anything else but a string within the limit is a 422. */
  private toReason(reason: unknown): string | null {
    if (reason === undefined || reason === null) return null;

    if (typeof reason !== "string" || reason.trim().length > ENROLMENT_REASON_MAX) {
      throw new ValidationException([new ValidationError("enrolment.reason.max.length")]);
    }

    return reason.trim() || null;
  }

  /** A failed notification never undoes the denial; the adapter logs it. */
  private async notify(
    studentId: string,
    classId: string,
    discipline: EnrolmentClass["discipline"],
    startsAt: Date,
    reason: string | null,
  ): Promise<void> {
    try {
      await this.enrolmentNotifier.requestDenied({
        studentId,
        classId,
        discipline,
        startsAt,
        ...(reason ? { reason } : {}),
      });
    } catch {
      // swallowed on purpose
    }
  }
}
