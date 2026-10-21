import {
  Entity,
  EntityState,
  MaxLengthRule,
  MinLengthRule,
  PersonNameRule,
  PhoneNumberRule,
  RequiredRule,
  UuidRule,
  ValidationError,
  ValidationException,
  Validator,
} from "@rochas-surf-school/shared";

export const GUEST_NAME_MIN = 3;
export const GUEST_NAME_MAX = 80;

export interface GuestState extends EntityState {
  classId: string;
  /** Null once the guest's data was erased. */
  name: string | null;
  /** E.164; null once the guest's data was erased. Only kept for the school's records. */
  whatsappNumber: string | null;
  /** The admin who added the guest; null when that account is gone. */
  createdBy?: string | null;
  erasedAt?: Date | null;
}

function copyDate(value: Date | null | undefined): Date | null {
  return value ? new Date(value.getTime()) : null;
}

/** Someone without an account trying a class: takes a seat and is never linked to a user. */
export class Guest extends Entity<GuestState> {
  constructor(props: GuestState) {
    super({
      ...props,
      createdBy: props.createdBy ?? null,
      erasedAt: copyDate(props.erasedAt),
    });
  }

  get classId(): string {
    return this.props.classId;
  }

  get name(): string | null {
    return this.props.name;
  }

  get whatsappNumber(): string | null {
    return this.props.whatsappNumber;
  }

  get createdBy(): string | null {
    return this.props.createdBy ?? null;
  }

  get erasedAt(): Date | null {
    return copyDate(this.props.erasedAt);
  }

  get isErased(): boolean {
    return this.erasedAt !== null;
  }

  /** Drops the name and the number for good. */
  erase(now: Date): Guest {
    return this.clone({
      name: null,
      whatsappNumber: null,
      erasedAt: new Date(now.getTime()),
      updatedAt: new Date(now.getTime()),
    });
  }

  /** Reports every problem together; an erased guest has nothing left to check. */
  public validate(): void {
    const errors: ValidationError[] = [];

    try {
      Validator.validate([
        {
          code: "guest.classId",
          value: this.classId,
          rules: [new RequiredRule(), new UuidRule()],
        },
        {
          code: "guest.createdBy",
          value: this.createdBy,
          rules: [new UuidRule()],
        },
        ...(this.isErased
          ? []
          : [
              {
                code: "guest.name",
                value: this.name,
                rules: [
                  new RequiredRule(),
                  new MinLengthRule(GUEST_NAME_MIN),
                  new MaxLengthRule(GUEST_NAME_MAX),
                  new PersonNameRule(),
                ],
              },
            ]),
      ]);
    } catch (error) {
      if (!(error instanceof ValidationException)) throw error;
      errors.push(...error.errors);
    }

    if (!this.isErased && !this.hasValidNumber()) {
      errors.push(new ValidationError("guest.whatsappNumber.invalid"));
    }

    if (errors.length > 0) {
      throw new ValidationException(errors);
    }
  }

  private hasValidNumber(): boolean {
    return (
      new RequiredRule().validate(this.whatsappNumber) === null &&
      new PhoneNumberRule().validate(this.whatsappNumber) === null
    );
  }
}
