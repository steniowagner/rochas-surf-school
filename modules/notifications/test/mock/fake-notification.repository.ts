import { Notification, NotificationPage, NotificationRepository, NotificationType } from "../../src";

/** The param that names the person a notification is about, per type `deleteAbout` deletes. */
const ABOUT_PARAM: Partial<Record<NotificationType, string>> = {
  "registration.pending": "userId",
  "reactivation.requested": "userId",
  "enrolment.requested": "studentId",
  "enrolment.cancelled": "studentId",
};

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

  async deleteAbout(userIds: string[]): Promise<void> {
    if (this.failWith) throw this.failWith;
    this.items = this.items.filter((item) => {
      const key = ABOUT_PARAM[item.type];
      const id = key === undefined ? undefined : item.params[key];
      return !(typeof id === "string" && userIds.includes(id));
    });
  }

  async findPage(userId: string, page: number, perPage: number): Promise<NotificationPage> {
    const own = this.items
      .filter((item) => item.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime() || b.id.localeCompare(a.id));
    const start = (page - 1) * perPage;

    return { items: own.slice(start, start + perPage), total: own.length };
  }

  async countUnread(userId: string): Promise<number> {
    return this.items.filter((item) => item.userId === userId && item.readAt === null).length;
  }

  async markRead(userId: string, id: string, at: Date): Promise<boolean> {
    const index = this.items.findIndex((item) => item.id === id && item.userId === userId);
    if (index === -1) return false;
    if (this.items[index].readAt === null) {
      this.items[index] = this.items[index].clone({ readAt: at });
    }
    return true;
  }

  async markAllRead(userId: string, at: Date): Promise<void> {
    this.items = this.items.map((item) =>
      item.userId === userId && item.readAt === null ? item.clone({ readAt: at }) : item,
    );
  }
}
