import {
  Entity,
  EntityState,
  InRule,
  RequiredRule,
  UuidRule,
  ValidationError,
  ValidationException,
  Validator,
} from "@rochas-surf-school/shared";

export const NOTIFICATION_TYPES = [
  "registration.pending",
  "registration.approved",
  "registration.denied",
  "class.assigned",
  "class.edited",
  "class.unassigned",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export type NotificationParams = Record<string, unknown>;

export interface NotificationState extends EntityState {
  userId: string;
  type: NotificationType;
  params: NotificationParams;
}

/** A stored notification: it holds no text, only what the app or the push needs to draw one. */
export class Notification extends Entity<NotificationState> {
  constructor(props: NotificationState) {
    super(props);
  }

  get userId(): string {
    return this.props.userId;
  }

  get type(): NotificationType {
    return this.props.type;
  }

  get params(): NotificationParams {
    return this.props.params;
  }

  public validate(): void {
    const { params } = this;
    if (typeof params !== "object" || params === null || Array.isArray(params)) {
      throw new ValidationException([
        new ValidationError("notification.params.invalid"),
      ]);
    }

    Validator.validate([
      {
        code: "notification.userId",
        value: this.userId,
        rules: [new RequiredRule(), new UuidRule()],
      },
      {
        code: "notification.type",
        value: this.type,
        rules: [new RequiredRule(), new InRule(NOTIFICATION_TYPES)],
      },
    ]);
  }
}
