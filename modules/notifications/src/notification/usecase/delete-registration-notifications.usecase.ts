import { UseCase } from "@rochas-surf-school/shared";
import { NotificationRepository } from "../provider";

export interface DeleteRegistrationNotificationsIn {
  /** The ids of the accounts that were erased. */
  userIds: string[];
}

/** Deletes the admins' "new registration" notifications about the given accounts. */
export class DeleteRegistrationNotifications
  implements UseCase<DeleteRegistrationNotificationsIn, void>
{
  constructor(private readonly notificationRepository: NotificationRepository) {}

  async execute(input: DeleteRegistrationNotificationsIn): Promise<void> {
    if (input.userIds.length === 0) {
      return;
    }

    await this.notificationRepository.deleteRegistrationPending(input.userIds);
  }
}
