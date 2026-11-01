import {
  NotFoundError,
  RequiredRule,
  UseCase,
  UuidRule,
  ValidationError,
  ValidationException,
} from "@rochas-surf-school/shared";
import { PushLocale } from "../../push-token/model";
import { MessageSenderReader, NotificationRepository } from "../provider";
import { NotificationOut, parseLocale, toNotificationsOut } from "./notification-out";

export interface GetNotificationIn {
  userId: string;
  notificationId: string;
  /** Whether the caller is an approved admin, who sees a sender's unshared number. */
  viewerIsAdmin: boolean;
  locale?: string;
}

export interface GetNotificationOut {
  item: NotificationOut;
  /** The language the caller asked the text in; `pt-BR` when none was given. */
  locale: PushLocale;
}

const ID_RULES = [new RequiredRule(), new UuidRule()];

/**
 * One of the caller's own notifications, without marking it read. An id that isn't a UUID, is unknown or belongs
 * to someone else is not found, so another account's notification stays hidden.
 */
export class GetNotification implements UseCase<GetNotificationIn, GetNotificationOut> {
  constructor(
    private readonly notificationRepository: NotificationRepository,
    private readonly messageSenderReader: MessageSenderReader,
  ) {}

  async execute(input: GetNotificationIn): Promise<GetNotificationOut> {
    const locale = parseLocale(input.locale);
    if (locale === null) {
      throw new ValidationException([new ValidationError("notifications.locale.invalid")]);
    }

    const id = input.notificationId;
    const notification = ID_RULES.some((rule) => rule.validate(id) !== null)
      ? null
      : await this.notificationRepository.findById(input.userId, id);

    if (!notification) throw new NotFoundError("notification.notFound");

    const [item] = await toNotificationsOut([notification], this.messageSenderReader, input.viewerIsAdmin);

    return { item: item!, locale };
  }
}
