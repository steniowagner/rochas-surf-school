import { NotFoundError, RequiredRule, UseCase, UuidRule } from "@rochas-surf-school/shared";
import { ClockProvider, NotificationRepository } from "../provider";

export interface MarkNotificationReadIn {
  userId: string;
  notificationId: string;
}

const ID_RULES = [new RequiredRule(), new UuidRule()];

/**
 * Marks one of the caller's own notifications read; one already read keeps when it was first read. An id that
 * isn't a UUID, is unknown or belongs to someone else is not found, so another account's notification stays hidden.
 */
export class MarkNotificationRead implements UseCase<MarkNotificationReadIn, void> {
  constructor(
    private readonly notificationRepository: NotificationRepository,
    private readonly clock: ClockProvider,
  ) {}

  async execute(input: MarkNotificationReadIn): Promise<void> {
    const id = input.notificationId;
    if (ID_RULES.some((rule) => rule.validate(id) !== null)) {
      throw new NotFoundError("notification.notFound");
    }

    const found = await this.notificationRepository.markRead(input.userId, id, this.clock.now());
    if (!found) throw new NotFoundError("notification.notFound");
  }
}
