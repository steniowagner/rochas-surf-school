import { UseCase } from "@rochas-surf-school/shared";
import { PushTicket, PushTicketRepository, PushTokenRepository } from "../../push-token";
import { Notification, NotificationParams, NotificationType } from "../model";
import {
  ClockProvider,
  DEVICE_NOT_REGISTERED,
  NotificationRepository,
  PushMessage,
  PushProvider,
} from "../provider";

export interface NotifyIn {
  userIds: string[];
  type: NotificationType;
  params: NotificationParams;
}

/**
 * Stores one notification per user, all of them before any push, then pushes each to every device of its user.
 * A user without devices keeps the stored notification only.
 */
export class Notify implements UseCase<NotifyIn, void> {
  constructor(
    private readonly notificationRepository: NotificationRepository,
    private readonly pushTokenRepository: PushTokenRepository,
    private readonly pushTicketRepository: PushTicketRepository,
    private readonly pushProvider: PushProvider,
    private readonly clock: ClockProvider,
  ) {}

  async execute(input: NotifyIn): Promise<void> {
    const userIds = [...new Set(input.userIds)];
    if (userIds.length === 0) {
      return;
    }

    const notifications = userIds.map((userId) => {
      const notification = new Notification({
        userId,
        type: input.type,
        params: input.params,
      });
      notification.validate();
      return notification;
    });
    await this.notificationRepository.createMany(notifications);

    const notificationByUser = new Map(
      notifications.map((notification) => [notification.userId, notification]),
    );
    const pushTokens = await this.pushTokenRepository.findByUserIds(userIds);
    const messages: PushMessage[] = pushTokens.map((pushToken) => ({
      token: pushToken.token,
      locale: pushToken.locale,
      type: input.type,
      params: input.params,
      notificationId: notificationByUser.get(pushToken.userId)!.id,
    }));
    if (messages.length === 0) {
      return;
    }

    const results = await this.pushProvider.send(messages);

    const unregistered: string[] = [];
    const tickets: PushTicket[] = [];
    const now = this.clock.now();
    results.forEach((result, index) => {
      const token = messages[index]!.token;
      if (result.status === "ok") {
        tickets.push({ id: result.id, token, createdAt: now });
      } else if (result.details?.error === DEVICE_NOT_REGISTERED) {
        unregistered.push(token);
      }
    });

    if (unregistered.length > 0) {
      await this.pushTokenRepository.deleteByTokens(unregistered);
    }
    if (tickets.length > 0) {
      await this.pushTicketRepository.createMany(tickets);
    }
  }
}
