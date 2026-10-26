import { UseCase } from "@rochas-surf-school/shared";
import { BroadcastAudience, RecipientsProvider } from "../provider";
import {
  assertCanBroadcast,
  BroadcastActor,
  normalizeBroadcastText,
  validateAudience,
  validateBroadcastText,
} from "./broadcast-access";
import { Notify } from "./notify.usecase";

export interface SendBroadcastIn {
  actor: BroadcastActor;
  audience: unknown;
  title: unknown;
  message: unknown;
}

/** Sends an admin's notice, as written, to every approved user of the audience. Nothing happens without any. */
export class SendBroadcast implements UseCase<SendBroadcastIn, void> {
  constructor(
    private readonly recipientsProvider: RecipientsProvider,
    private readonly notify: Notify,
  ) {}

  async execute(input: SendBroadcastIn): Promise<void> {
    assertCanBroadcast(input.actor);
    validateAudience(input.audience);
    const title = normalizeBroadcastText(input.title);
    const message = normalizeBroadcastText(input.message);
    validateBroadcastText(title, message);

    const userIds = await this.recipientsProvider.findApprovedUserIdsByAudience(
      input.audience as BroadcastAudience,
    );

    await this.notify.execute({ userIds, type: "broadcast", params: { title, message } });
  }
}
