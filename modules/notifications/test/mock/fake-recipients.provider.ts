import { RecipientsProvider } from "../../src";

export class FakeRecipientsProvider implements RecipientsProvider {
  constructor(private readonly adminIds: string[] = []) {}

  async findApprovedAdminIds(): Promise<string[]> {
    return [...this.adminIds];
  }
}
