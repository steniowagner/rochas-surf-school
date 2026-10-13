import { Notification } from "../model";

export interface NotificationRepository {
  createMany(notifications: Notification[]): Promise<void>;
  /** Deletes every `registration.pending` notification about one of these accounts (`params.userId`). */
  deleteRegistrationPending(userIds: string[]): Promise<void>;
}
