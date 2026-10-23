import { UseCase } from "@rochas-surf-school/shared";
import { NotificationRepository } from "../provider";

export interface CountUnreadNotificationsIn {
  userId: string;
}

export interface CountUnreadNotificationsOut {
  count: number;
}

/** How many of the caller's own notifications are still unread. */
export class CountUnreadNotifications
  implements UseCase<CountUnreadNotificationsIn, CountUnreadNotificationsOut>
{
  constructor(private readonly notificationRepository: NotificationRepository) {}

  async execute(input: CountUnreadNotificationsIn): Promise<CountUnreadNotificationsOut> {
    return { count: await this.notificationRepository.countUnread(input.userId) };
  }
}
