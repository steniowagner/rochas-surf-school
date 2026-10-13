import { Notification, NotificationRepository } from "../../src";

export class FakeNotificationRepository implements NotificationRepository {
  items: Notification[] = [];
  failWith: Error | null = null;

  async createMany(notifications: Notification[]): Promise<void> {
    if (this.failWith) throw this.failWith;
    this.items.push(...notifications);
  }

  async deleteRegistrationPending(userIds: string[]): Promise<void> {
    this.items = this.items.filter(
      (item) =>
        !(
          item.type === "registration.pending" &&
          typeof item.params.userId === "string" &&
          userIds.includes(item.params.userId)
        ),
    );
  }
}
