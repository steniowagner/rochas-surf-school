import { Notification } from "../model";

export interface NotificationRepository {
  createMany(notifications: Notification[]): Promise<void>;
}
