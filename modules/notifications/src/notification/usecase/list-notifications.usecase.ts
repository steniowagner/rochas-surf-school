import { UseCase, ValidationError, ValidationException } from "@rochas-surf-school/shared";
import { PushLocale } from "../../push-token/model";
import { MessageSenderReader, NotificationRepository } from "../provider";
import { NotificationOut, parseLocale, toNotificationsOut } from "./notification-out";

const DEFAULT_PAGE = 1;
const DEFAULT_PER_PAGE = 20;
const MAX_PER_PAGE = 50;

export interface ListNotificationsIn {
  userId: string;
  /** Whether the caller is an approved admin, who sees a sender's unshared number. */
  viewerIsAdmin: boolean;
  page?: string;
  perPage?: string;
  locale?: string;
}

export interface ListNotificationsOut {
  items: NotificationOut[];
  page: number;
  perPage: number;
  total: number;
  /** The language the caller asked the text in; `pt-BR` when none was given. */
  locale: PushLocale;
}

function parseInteger(value: unknown, fallback: number, min: number, max: number): number | null {
  if (value === undefined) return fallback;
  if (typeof value !== "string" || !/^\d+$/.test(value)) return null;

  const parsed = Number(value);

  return parsed >= min && parsed <= max ? parsed : null;
}

/** One page of the caller's own notifications, newest first, whatever the account's status. */
export class ListNotifications implements UseCase<ListNotificationsIn, ListNotificationsOut> {
  constructor(
    private readonly notificationRepository: NotificationRepository,
    private readonly messageSenderReader: MessageSenderReader,
  ) {}

  async execute(input: ListNotificationsIn): Promise<ListNotificationsOut> {
    const errors: ValidationError[] = [];

    const page = parseInteger(input.page, DEFAULT_PAGE, 1, Number.MAX_SAFE_INTEGER);
    if (page === null) errors.push(new ValidationError("notifications.page.invalid"));

    const perPage = parseInteger(input.perPage, DEFAULT_PER_PAGE, 1, MAX_PER_PAGE);
    if (perPage === null) errors.push(new ValidationError("notifications.perPage.invalid"));

    const locale = parseLocale(input.locale);
    if (locale === null) errors.push(new ValidationError("notifications.locale.invalid"));

    if (errors.length > 0) throw new ValidationException(errors);

    const result = await this.notificationRepository.findPage(
      input.userId,
      page as number,
      perPage as number,
    );

    return {
      items: await toNotificationsOut(result.items, this.messageSenderReader, input.viewerIsAdmin),
      page: page as number,
      perPage: perPage as number,
      total: result.total,
      locale: locale as PushLocale,
    };
  }
}
