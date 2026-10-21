import { ClassActor, assertCanManageClasses } from "@rochas-surf-school/classes";
import { DomainError, NotFoundError, UseCase, UuidRule } from "@rochas-surf-school/shared";
import { Enrolment } from "../model";
import {
  ClockProvider,
  EnrolmentClass,
  EnrolmentClassReader,
  EnrolmentNotifier,
  EnrolmentRepository,
  StudentLookup,
} from "../provider";
import { EnrolmentOut, toEnrolmentOut } from "./enrolment.out";

export interface EnrolStudentIn {
  actor: ClassActor;
  classId: string;
  studentId: unknown;
}

export interface EnrolStudentOut {
  enrolment: EnrolmentOut;
  /** Whether a new enrolment was stored (`false` when the student's pending request was approved). */
  created: boolean;
}

const uuidRule = new UuidRule();

function isUuid(value: unknown): value is string {
  return typeof value === "string" && uuidRule.validate(value) === null;
}

export class EnrolStudent implements UseCase<EnrolStudentIn, EnrolStudentOut> {
  constructor(
    private readonly enrolmentRepository: EnrolmentRepository,
    private readonly classReader: EnrolmentClassReader,
    private readonly studentLookup: StudentLookup,
    private readonly enrolmentNotifier: EnrolmentNotifier,
    private readonly clockProvider: ClockProvider,
  ) {}

  async execute(input: EnrolStudentIn): Promise<EnrolStudentOut> {
    assertCanManageClasses(input.actor);

    const found = isUuid(input.classId) ? await this.classReader.findById(input.classId) : null;

    if (!found) {
      throw new NotFoundError("class.notFound");
    }

    const studentId = input.studentId;

    if (!isUuid(studentId) || !(await this.studentLookup.isApprovedStudent(studentId))) {
      throw new DomainError("enrolment.student.invalid", 422);
    }

    const now = this.clockProvider.now();

    if (found.cancelledAt) {
      throw new DomainError("class.cancelled", 409);
    }

    if (now.getTime() >= found.startsAt.getTime()) {
      throw new DomainError("class.started", 409);
    }

    const outcome = await this.enrolmentRepository.enrolDirectly(
      new Enrolment({
        classId: found.id,
        studentId,
        status: "approved",
        requestedAt: now,
        decidedAt: now,
      }),
      now,
    );

    if (outcome.result === "alreadyApproved") {
      throw new DomainError("enrolment.alreadyApproved", 409);
    }

    if (outcome.result === "full") {
      throw new DomainError("enrolment.class.full", 409);
    }

    await this.notify(found, studentId, outcome.result);

    return { enrolment: toEnrolmentOut(outcome.enrolment), created: outcome.result === "enrolled" };
  }

  /** A failed notification never changes the answer; the adapter logs it. */
  private async notify(
    found: EnrolmentClass,
    studentId: string,
    result: "enrolled" | "approved",
  ): Promise<void> {
    const event = { studentId, classId: found.id, discipline: found.discipline, startsAt: found.startsAt };

    try {
      if (result === "approved") {
        await this.enrolmentNotifier.requestApproved(event);
      } else {
        await this.enrolmentNotifier.studentEnrolled(event);
      }
    } catch {
      // swallowed on purpose
    }
  }
}
