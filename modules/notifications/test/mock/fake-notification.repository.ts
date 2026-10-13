import { Notification, NotificationRepository } from "../../src";

export class FakeNotificationRepository implements NotificationRepository {
  readonly items: Notification[] = [];
  failWith: Error | null = null;

  async createMany(notifications: Notification[]): Promise<void> {
    if (this.failWith) throw this.failWith;
    this.items.push(...notifications);
  }
}
