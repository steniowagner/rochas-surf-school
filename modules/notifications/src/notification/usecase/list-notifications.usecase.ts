import { UseCase, ValidationError, ValidationException } from "@rochas-surf-school/shared";
import { PUSH_LOCALES, PushLocale } from "../../push-token/model";
import { NotificationParams, NotificationType } from "../model";
import { NotificationRepository } from "../provider";

const DEFAULT_PAGE = 1;
const DEFAULT_PER_PAGE = 20;
const MAX_PER_PAGE = 50;
const DEFAULT_LOCALE: PushLocale = "pt-BR";

export interface ListNotificationsIn {
  userId: string;
  page?: string;
  perPage?: string;
  locale?: string;
}

export interface NotificationOut {
  id: string;
  type: NotificationType;
  params: NotificationParams;
  createdAt: string;
  read: boolean;
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

function parseLocale(value: unknown): PushLocale | null {
  if (value === undefined) return DEFAULT_LOCALE;

  return (PUSH_LOCALES as readonly unknown[]).includes(value) ? (value as PushLocale) : null;
}

/** One page of the caller's own notifications, newest first, whatever the account's status. */
export class ListNotifications implements UseCase<ListNotificationsIn, ListNotificationsOut> {
  constructor(private readonly notificationRepository: NotificationRepository) {}

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
      items: result.items.map((notification) => ({
        id: notification.id,
        type: notification.type,
        params: notification.params,
        createdAt: notification.createdAt.toISOString(),
        read: notification.readAt !== null,
      })),
      page: page as number,
      perPage: perPage as number,
      total: result.total,
      locale: locale as PushLocale,
    };
  }
}
