import { UseCase } from "@rochas-surf-school/shared";
import { BroadcastAudience, RecipientsProvider } from "../provider";
import { assertCanBroadcast, BroadcastActor, validateAudience } from "./broadcast-access";

export interface CountBroadcastRecipientsIn {
  actor: BroadcastActor;
  audience: unknown;
}

export interface CountBroadcastRecipientsOut {
  count: number;
}

/** How many approved users a notice to an audience would reach. Advisory: sending resolves them again. */
export class CountBroadcastRecipients
  implements UseCase<CountBroadcastRecipientsIn, CountBroadcastRecipientsOut>
{
  constructor(private readonly recipientsProvider: RecipientsProvider) {}

  async execute(input: CountBroadcastRecipientsIn): Promise<CountBroadcastRecipientsOut> {
    assertCanBroadcast(input.actor);
    validateAudience(input.audience);

    const userIds = await this.recipientsProvider.findApprovedUserIdsByAudience(
      input.audience as BroadcastAudience,
    );

    return { count: new Set(userIds).size };
  }
}
