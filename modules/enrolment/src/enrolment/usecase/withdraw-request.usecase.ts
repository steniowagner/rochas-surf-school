import { ClassActor, assertCanReadClasses } from "@rochas-surf-school/classes";
import { DomainError, NotFoundError, UseCase, UuidRule } from "@rochas-surf-school/shared";
import { ClockProvider, EnrolmentClassReader, EnrolmentRepository } from "../provider";
import { EnrolmentOut, toEnrolmentOut } from "./enrolment.out";

export interface WithdrawRequestIn {
  actor: ClassActor;
  id: string;
}

const uuidRule = new UuidRule();

function isUuid(value: unknown): value is string {
  return typeof value === "string" && uuidRule.validate(value) === null;
}

export class WithdrawRequest implements UseCase<WithdrawRequestIn, EnrolmentOut> {
  constructor(
    private readonly enrolmentRepository: EnrolmentRepository,
    private readonly classReader: EnrolmentClassReader,
    private readonly clockProvider: ClockProvider,
  ) {}

  async execute(input: WithdrawRequestIn): Promise<EnrolmentOut> {
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
    const withdrawn = stored.withdraw(now);

    if (now.getTime() >= found.startsAt.getTime()) {
      throw new DomainError("class.started", 409);
    }

    if (!(await this.enrolmentRepository.withdraw(stored.id, now))) {
      throw new DomainError("enrolment.notPending", 409);
    }

    return toEnrolmentOut(withdrawn);
  }
}
