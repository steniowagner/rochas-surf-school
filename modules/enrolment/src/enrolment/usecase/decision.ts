import { DomainError, NotFoundError, UuidRule } from "@rochas-surf-school/shared";
import { Enrolment } from "../model";
import { ClockProvider, EnrolmentClass, EnrolmentClassReader, EnrolmentRepository } from "../provider";

const uuidRule = new UuidRule();

function isUuid(value: unknown): value is string {
  return typeof value === "string" && uuidRule.validate(value) === null;
}

export interface DecisionTarget {
  enrolment: Enrolment;
  found: EnrolmentClass;
}

/** The enrolment and its class, or a 404 `enrolment.notFound` when either is missing. */
export async function findDecisionTarget(
  id: unknown,
  enrolmentRepository: EnrolmentRepository,
  classReader: EnrolmentClassReader,
): Promise<DecisionTarget> {
  const enrolment = isUuid(id) ? await enrolmentRepository.findById(id) : null;
  const found = enrolment ? await classReader.findById(enrolment.classId) : null;

  if (!enrolment || !found) {
    throw new NotFoundError("enrolment.notFound");
  }

  return { enrolment, found };
}

export function assertNotStarted(found: EnrolmentClass, clockProvider: ClockProvider): Date {
  const now = clockProvider.now();

  if (now.getTime() >= found.startsAt.getTime()) {
    throw new DomainError("class.started", 409);
  }

  return now;
}
