import { UseCase } from "@rochas-surf-school/shared";
import { NotificationRepository } from "../provider";

export interface DeleteNotificationsAboutIn {
  /** The ids of the accounts that are being erased. */
  userIds: string[];
}

/**
 * Deletes the notifications about the given people in anyone's inbox: `registration.pending` and
 * `reactivation.requested` (`params.userId`), and `enrolment.requested` and `enrolment.cancelled`
 * (`params.studentId`).
 */
export class DeleteNotificationsAbout implements UseCase<DeleteNotificationsAboutIn, void> {
  constructor(private readonly notificationRepository: NotificationRepository) {}

  async execute(input: DeleteNotificationsAboutIn): Promise<void> {
    if (input.userIds.length === 0) {
      return;
    }

    await this.notificationRepository.deleteAbout(input.userIds);
  }
}
