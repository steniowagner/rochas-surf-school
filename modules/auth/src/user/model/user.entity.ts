import {
  DateRule,
  EmailRule,
  Entity,
  EntityState,
  InRule,
  IntegerRule,
  MaxLengthRule,
  MinLengthRule,
  PersonNameRule,
  PhoneRule,
  PositiveRule,
  RequiredRule,
  UniqueItemsRule,
  UrlRule,
  Validator,
} from "@rochas-surf-school/shared";

export const USER_ROLES = ["student", "instructor", "admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const USER_STATUSES = [
  "pending",
  "approved",
  "denied",
  "deleted",
  "removed",
] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export const USER_REACTIVATION_STATUSES = ["requested", "denied"] as const;
export type UserReactivationStatus =
  (typeof USER_REACTIVATION_STATUSES)[number];

export interface RulesAcceptance {
  version: number;
  acceptedAt: Date;
}

export interface UserState extends EntityState {
  name: string;
  email: string;
  photoUrl?: string;
  whatsappNumber?: string;
  whatsappVisible: boolean;
  role: UserRole;
  status: UserStatus;
  denialReason?: string;
  deniedAt?: Date;
  removedAt?: Date;
  reactivationStatus?: UserReactivationStatus;
  rulesAcceptances?: RulesAcceptance[];
}

export class User extends Entity<UserState> {
  constructor(props: UserState) {
    super(props);
  }

  get name(): string {
    return this.props.name;
  }

  get email(): string {
    return this.props.email;
  }

  get photoUrl(): string | undefined {
    return this.props.photoUrl;
  }

  get whatsappNumber(): string | undefined {
    return this.props.whatsappNumber;
  }

  get whatsappVisible(): boolean {
    return this.props.whatsappVisible;
  }

  get role(): UserRole {
    return this.props.role;
  }

  get status(): UserStatus {
    return this.props.status;
  }

  get denialReason(): string | undefined {
    return this.props.denialReason;
  }

  get deniedAt(): Date | undefined {
    return this.props.deniedAt;
  }

  get removedAt(): Date | undefined {
    return this.props.removedAt;
  }

  get reactivationStatus(): UserReactivationStatus | undefined {
    return this.props.reactivationStatus;
  }

  get rulesAcceptances(): RulesAcceptance[] {
    return this.props.rulesAcceptances ?? [];
  }

  hasAcceptedRules(version: number): boolean {
    return this.rulesAcceptances.some((item) => item.version === version);
  }

  public validate(): void {
    Validator.validate([
      {
        code: "user.name",
        value: this.name,
        rules: [
          new RequiredRule(),
          new MinLengthRule(3),
          new MaxLengthRule(80),
          new PersonNameRule(),
        ],
      },
      {
        code: "user.email",
        value: this.email,
        rules: [new RequiredRule(), new EmailRule()],
      },
      {
        code: "user.photoUrl",
        value: this.photoUrl,
        rules: [new UrlRule()],
      },
      {
        code: "user.whatsappNumber",
        value: this.whatsappNumber,
        rules: [new PhoneRule()],
      },
      {
        code: "user.whatsappVisible",
        value: this.whatsappVisible,
        rules: [new RequiredRule(), new InRule([true, false])],
      },
      {
        code: "user.role",
        value: this.role,
        rules: [new RequiredRule(), new InRule(USER_ROLES)],
      },
      {
        code: "user.status",
        value: this.status,
        rules: [new RequiredRule(), new InRule(USER_STATUSES)],
      },
      {
        code: "user.denialReason",
        value: this.denialReason,
        rules: [new MaxLengthRule(500)],
      },
      {
        code: "user.deniedAt",
        value: this.deniedAt,
        rules: [new DateRule()],
      },
      {
        code: "user.removedAt",
        value: this.removedAt,
        rules: [new DateRule()],
      },
      {
        code: "user.reactivationStatus",
        value: this.reactivationStatus,
        rules: [new InRule(USER_REACTIVATION_STATUSES)],
      },
      {
        code: "user.rulesAcceptances.version",
        value: this.rulesAcceptances.map((item) => item.version),
        rules: [new IntegerRule(), new PositiveRule(), new UniqueItemsRule()],
      },
      ...this.rulesAcceptances.map((item) => ({
        code: "user.rulesAcceptances.acceptedAt",
        value: item.acceptedAt,
        rules: [new RequiredRule(), new DateRule()],
      })),
    ]);
  }
}
