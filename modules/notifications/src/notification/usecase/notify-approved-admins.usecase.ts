import { UseCase } from "@rochas-surf-school/shared";
import { RecipientsProvider } from "../provider";
import { Notify } from "./notify.usecase";

export interface NotifyApprovedAdminsIn {
  /** The name of the account that just started waiting for approval. */
  name: string;
  /** The id of that account, so its notifications can be found when it is erased. */
  userId: string;
  /** What the admins are told; a new registration unless said otherwise. */
  type?: "registration.pending" | "reactivation.requested";
}

/** Tells every approved admin that an account is waiting (a registration or a reactivation). Nothing happens without admins. */
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
      type: input.type ?? "registration.pending",
      params: { name: input.name, userId: input.userId },
    });
  }
}
