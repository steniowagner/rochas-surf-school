import { Notification } from "../model";

export interface NotificationPage {
  items: Notification[];
  total: number;
}

export interface NotificationRepository {
  createMany(notifications: Notification[]): Promise<void>;
  /** Deletes every `registration.pending` notification about one of these accounts (`params.userId`). */
  deleteRegistrationPending(userIds: string[]): Promise<void>;
  /**
   * Deletes every notification about one of these people: `registration.pending` and `reactivation.requested`
   * whose `params.userId` is in the list, and `enrolment.requested` and `enrolment.cancelled` whose
   * `params.studentId` is.
   */
  deleteAbout(userIds: string[]): Promise<void>;
  /** One page of the user's notifications, newest first (`createdAt`, then `id`, descending); `page` starts at 1. */
  findPage(userId: string, page: number, perPage: number): Promise<NotificationPage>;
  countUnread(userId: string): Promise<number>;
  /**
   * Sets `readAt` of the user's notification `id` when it is still unread (a read one keeps its first `readAt`).
   * Answers whether the user has a notification with that id.
   */
  markRead(userId: string, id: string, at: Date): Promise<boolean>;
  /** Sets `readAt` of every unread notification of the user. */
  markAllRead(userId: string, at: Date): Promise<void>;
}
