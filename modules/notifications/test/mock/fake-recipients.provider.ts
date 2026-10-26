import { BroadcastAudience, RecipientsProvider } from "../../src";

export class FakeRecipientsProvider implements RecipientsProvider {
  constructor(
    private readonly adminIds: string[] = [],
    private readonly audiences: Partial<Record<BroadcastAudience, string[]>> = {},
  ) {}

  async findApprovedAdminIds(): Promise<string[]> {
    return [...this.adminIds];
  }

  async findApprovedUserIdsByAudience(audience: BroadcastAudience): Promise<string[]> {
    return [...(this.audiences[audience] ?? [])];
  }
}
