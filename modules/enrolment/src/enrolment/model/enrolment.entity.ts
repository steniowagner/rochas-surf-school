import {
  DomainError,
  Entity,
  EntityState,
  InRule,
  MaxLengthRule,
  RequiredRule,
  UuidRule,
  Validator,
} from "@rochas-surf-school/shared";

export const ENROLMENT_STATUSES = [
  "pending",
  "approved",
  "denied",
  "withdrawn",
  "expired",
  "cancelled",
  "takenOut",
  "classCancelled",
] as const;

export type EnrolmentStatus = (typeof ENROLMENT_STATUSES)[number];

/** The statuses that count as the student's one open enrolment in a class. */
export const OPEN_ENROLMENT_STATUSES: readonly EnrolmentStatus[] = ["pending", "approved"];

export const ENROLMENT_REASON_MAX = 500;

export interface EnrolmentState extends EntityState {
  classId: string;
  studentId: string;
  status: EnrolmentStatus;
  requestedAt: Date;
  /** When the student accepted the cancellation rule; null when the discipline has none. */
  ruleAcceptedAt?: Date | null;
  decidedAt?: Date | null;
  reason?: string | null;
  endedAt?: Date | null;
}

function copyDate(value: Date | null | undefined): Date | null {
  return value ? new Date(value.getTime()) : null;
}

export class Enrolment extends Entity<EnrolmentState> {
  constructor(props: EnrolmentState) {
    super({
      ...props,
      requestedAt: new Date(props.requestedAt.getTime()),
      ruleAcceptedAt: copyDate(props.ruleAcceptedAt),
      decidedAt: copyDate(props.decidedAt),
      reason: props.reason ?? null,
      endedAt: copyDate(props.endedAt),
    });
  }

  get classId(): string {
    return this.props.classId;
  }

  get studentId(): string {
    return this.props.studentId;
  }

  get status(): EnrolmentStatus {
    return this.props.status;
  }

  get requestedAt(): Date {
    return new Date(this.props.requestedAt.getTime());
  }

  get ruleAcceptedAt(): Date | null {
    return copyDate(this.props.ruleAcceptedAt);
  }

  get decidedAt(): Date | null {
    return copyDate(this.props.decidedAt);
  }

  get reason(): string | null {
    return this.props.reason ?? null;
  }

  get endedAt(): Date | null {
    return copyDate(this.props.endedAt);
  }

  get isOpen(): boolean {
    return OPEN_ENROLMENT_STATUSES.includes(this.status);
  }

  /** An admin approves a pending request. */
  approve(now: Date): Enrolment {
    return this.decide("approved", null, now);
  }

  /** An admin denies a pending request; `reason` is already trimmed, null when there is none. */
  deny(reason: string | null, now: Date): Enrolment {
    return this.decide("denied", reason, now);
  }

  /** The student takes back a pending request. */
  withdraw(now: Date): Enrolment {
    return this.end("withdrawn", ["pending"], now, "enrolment.notPending");
  }

  /** The student gives up an approved seat. */
  cancel(now: Date): Enrolment {
    return this.end("cancelled", ["approved"], now, "enrolment.notApproved");
  }

  /** The class started while the request was still pending. */
  expire(now: Date): Enrolment {
    return this.end("expired", ["pending"], now, "enrolment.notPending");
  }

  /** The class was cancelled while the enrolment was pending or approved. */
  closeForCancelledClass(now: Date): Enrolment {
    return this.end("classCancelled", OPEN_ENROLMENT_STATUSES, now, "enrolment.notOpen");
  }

  public validate(): void {
    Validator.validate([
      {
        code: "enrolment.classId",
        value: this.classId,
        rules: [new RequiredRule(), new UuidRule()],
      },
      {
        code: "enrolment.studentId",
        value: this.studentId,
        rules: [new RequiredRule(), new UuidRule()],
      },
      {
        code: "enrolment.status",
        value: this.status,
        rules: [new RequiredRule(), new InRule(ENROLMENT_STATUSES)],
      },
      {
        code: "enrolment.reason",
        value: this.reason,
        rules: [new MaxLengthRule(ENROLMENT_REASON_MAX)],
      },
    ]);
  }

  private decide(status: EnrolmentStatus, reason: string | null, now: Date): Enrolment {
    if (this.status !== "pending") {
      throw new DomainError("enrolment.notPending", 409);
    }

    return this.clone({
      status,
      reason,
      decidedAt: new Date(now.getTime()),
      updatedAt: new Date(now.getTime()),
    });
  }

  private end(
    status: EnrolmentStatus,
    allowedFrom: readonly EnrolmentStatus[],
    now: Date,
    errorCode: string,
  ): Enrolment {
    if (!allowedFrom.includes(this.status)) {
      throw new DomainError(errorCode, 409);
    }

    return this.clone({ status, endedAt: new Date(now.getTime()), updatedAt: new Date(now.getTime()) });
  }
}
