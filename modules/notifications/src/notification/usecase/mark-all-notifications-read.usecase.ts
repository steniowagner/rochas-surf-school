import { UseCase } from "@rochas-surf-school/shared";
import { ClockProvider, NotificationRepository } from "../provider";

export interface MarkAllNotificationsReadIn {
  userId: string;
}

/** Marks every unread notification of the caller read; those already read keep when they were first read. */
export class MarkAllNotificationsRead implements UseCase<MarkAllNotificationsReadIn, void> {
  constructor(
    private readonly notificationRepository: NotificationRepository,
    private readonly clock: ClockProvider,
  ) {}

  async execute(input: MarkAllNotificationsReadIn): Promise<void> {
    await this.notificationRepository.markAllRead(input.userId, this.clock.now());
  }
}
