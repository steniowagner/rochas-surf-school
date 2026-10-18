import {
  DateRule,
  Entity,
  EntityState,
  InRule,
  IntegerRule,
  MaxLengthRule,
  MinItemsRule,
  RangeValueRule,
  RequiredRule,
  UuidRule,
  Validator,
} from "@rochas-surf-school/shared";
import {
  CLASS_CAPACITY_MAX,
  CLASS_CANCELLATION_MESSAGE_MAX,
  CLASS_CAPACITY_MIN,
  CLASS_DISCIPLINES,
  CLASS_LEVELS,
  CLASS_NOTES_MAX,
  ClassDiscipline,
  ClassLevel,
} from "./class-limits";

export interface SchoolClassState extends EntityState {
  discipline: ClassDiscipline;
  level: ClassLevel;
  startsAt: Date;
  endsAt: Date;
  locationId: string;
  instructorIds: string[];
  capacity: number;
  notes?: string | null;
  createdBy: string;
  cancelledAt?: Date | null;
  cancellationMessage?: string | null;
  cancellationDeadline?: Date | null;
  /** Bumped every time the deadline is cleared; a result is stored only for the revision it was worked out for. */
  deadlineRevision?: number;
  /** Consecutive failed attempts to work the deadline out. */
  deadlineAttempts?: number;
  /** When the next attempt is due; none means due now. */
  deadlineNextAttemptAt?: Date | null;
}

export class SchoolClass extends Entity<SchoolClassState> {
  constructor(props: SchoolClassState) {
    super({
      ...props,
      startsAt: new Date(props.startsAt.getTime()),
      endsAt: new Date(props.endsAt.getTime()),
      instructorIds: [...props.instructorIds],
      cancelledAt: props.cancelledAt ? new Date(props.cancelledAt.getTime()) : null,
      cancellationDeadline: props.cancellationDeadline
        ? new Date(props.cancellationDeadline.getTime())
        : null,
      deadlineRevision: props.deadlineRevision ?? 0,
      deadlineAttempts: props.deadlineAttempts ?? 0,
      deadlineNextAttemptAt: props.deadlineNextAttemptAt
        ? new Date(props.deadlineNextAttemptAt.getTime())
        : null,
    });
  }

  get discipline(): ClassDiscipline {
    return this.props.discipline;
  }

  get level(): ClassLevel {
    return this.props.level;
  }

  get startsAt(): Date {
    return new Date(this.props.startsAt.getTime());
  }

  get endsAt(): Date {
    return new Date(this.props.endsAt.getTime());
  }

  get locationId(): string {
    return this.props.locationId;
  }

  get instructorIds(): string[] {
    return [...this.props.instructorIds];
  }

  get capacity(): number {
    return this.props.capacity;
  }

  get notes(): string | null {
    return this.props.notes ?? null;
  }

  get createdBy(): string {
    return this.props.createdBy;
  }

  get cancelledAt(): Date | null {
    return this.props.cancelledAt ? new Date(this.props.cancelledAt.getTime()) : null;
  }

  get cancellationMessage(): string | null {
    return this.props.cancellationMessage ?? null;
  }

  get cancellationDeadline(): Date | null {
    return this.props.cancellationDeadline
      ? new Date(this.props.cancellationDeadline.getTime())
      : null;
  }

  get deadlineRevision(): number {
    return this.props.deadlineRevision ?? 0;
  }

  get deadlineAttempts(): number {
    return this.props.deadlineAttempts ?? 0;
  }

  get deadlineNextAttemptAt(): Date | null {
    return this.props.deadlineNextAttemptAt
      ? new Date(this.props.deadlineNextAttemptAt.getTime())
      : null;
  }

  public validate(): void {
    Validator.validate([
      {
        code: "class.discipline",
        value: this.discipline,
        rules: [new RequiredRule(), new InRule(CLASS_DISCIPLINES)],
      },
      {
        code: "class.level",
        value: this.level,
        rules: [new RequiredRule(), new InRule(CLASS_LEVELS)],
      },
      {
        code: "class.startsAt",
        value: this.startsAt,
        rules: [new RequiredRule(), new DateRule()],
      },
      {
        code: "class.endsAt",
        value: this.endsAt,
        rules: [
          new RequiredRule(),
          new DateRule(),
          {
            validate: (value: unknown) =>
              value instanceof Date && value.getTime() > this.startsAt.getTime()
                ? null
                : "after.start",
          },
        ],
      },
      {
        code: "class.location",
        value: this.locationId,
        rules: [new RequiredRule(), new UuidRule()],
      },
      {
        code: "class.instructors",
        value: this.instructorIds,
        rules: [new RequiredRule(), new MinItemsRule(1), new UuidRule()],
      },
      {
        code: "class.capacity",
        value: this.capacity,
        rules: [
          new RequiredRule(),
          new IntegerRule(),
          new RangeValueRule(CLASS_CAPACITY_MIN, CLASS_CAPACITY_MAX),
        ],
      },
      {
        code: "class.notes",
        value: this.notes,
        rules: [new MaxLengthRule(CLASS_NOTES_MAX)],
      },
      {
        code: "class.cancellationMessage",
        value: this.cancellationMessage,
        rules: [new MaxLengthRule(CLASS_CANCELLATION_MESSAGE_MAX)],
      },
      {
        code: "class.createdBy",
        value: this.createdBy,
        rules: [new RequiredRule(), new UuidRule()],
      },
    ]);
  }
}
