import { ClassActor, ClassDiscipline, assertCanManageClasses } from "@rochas-surf-school/classes";
import { DomainError, UseCase } from "@rochas-surf-school/shared";
import { ClockProvider, EnrolmentClassReader, EnrolmentNotifier, EnrolmentRepository } from "../provider";
import { assertNotStarted, findDecisionTarget } from "./decision";
import { EnrolmentOut, toEnrolmentOut } from "./enrolment.out";

export interface ApproveRequestIn {
  actor: ClassActor;
  id: string;
}

export class ApproveRequest implements UseCase<ApproveRequestIn, EnrolmentOut> {
  constructor(
    private readonly enrolmentRepository: EnrolmentRepository,
    private readonly classReader: EnrolmentClassReader,
    private readonly enrolmentNotifier: EnrolmentNotifier,
    private readonly clockProvider: ClockProvider,
  ) {}

  async execute(input: ApproveRequestIn): Promise<EnrolmentOut> {
    assertCanManageClasses(input.actor);

    const { enrolment, found } = await findDecisionTarget(
      input.id,
      this.enrolmentRepository,
      this.classReader,
    );
    const now = this.clockProvider.now();
    const approved = enrolment.approve(now);

    assertNotStarted(found, this.clockProvider);

    const result = await this.enrolmentRepository.approve(enrolment.id, now);

    if (result === "full") {
      throw new DomainError("enrolment.class.full", 409);
    }

    if (result === "notPending") {
      throw new DomainError("enrolment.notPending", 409);
    }

    await this.notify(approved.studentId, found.id, found.discipline, found.startsAt);

    return toEnrolmentOut(approved);
  }

  /** A failed notification never undoes the approval; the adapter logs it. */
  private async notify(
    studentId: string,
    classId: string,
    discipline: ClassDiscipline,
    startsAt: Date,
  ): Promise<void> {
    try {
      await this.enrolmentNotifier.requestApproved({ studentId, classId, discipline, startsAt });
    } catch {
      // swallowed on purpose
    }
  }
}
