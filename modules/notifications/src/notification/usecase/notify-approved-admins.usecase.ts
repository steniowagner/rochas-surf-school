import { UseCase } from "@rochas-surf-school/shared";
import { RecipientsProvider } from "../provider";
import { Notify } from "./notify.usecase";

export interface NotifyApprovedAdminsIn {
  /** The name of the account that just started waiting for approval. */
  name: string;
  /** The id of that account, so its notifications can be found when it is erased. */
  userId: string;
}

/** Tells every approved admin that a new account is waiting. Nothing happens without admins. */
export class NotifyApprovedAdmins implements UseCase<NotifyApprovedAdminsIn, void> {
  constructor(
    private readonly recipientsProvider: RecipientsProvider,
    private readonly notify: Notify,
  ) {}

  async execute(input: NotifyApprovedAdminsIn): Promise<void> {
    const userIds = await this.recipientsProvider.findApprovedAdminIds();
    if (userIds.length === 0) {
      return;
    }

    await this.notify.execute({
      userIds,
      type: "registration.pending",
      params: { name: input.name, userId: input.userId },
    });
  }
}
