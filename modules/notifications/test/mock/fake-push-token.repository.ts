import { PushToken, PushTokenRepository } from "../../src";

export class FakePushTokenRepository implements PushTokenRepository {
  items: PushToken[];

  constructor(items: PushToken[] = []) {
    this.items = [...items];
  }

  async upsert(pushToken: PushToken): Promise<void> {
    this.items = this.items.filter((item) => item.token !== pushToken.token);
    this.items.push(pushToken);
  }

  async findByUserIds(userIds: string[]): Promise<PushToken[]> {
    return this.items.filter((item) => userIds.includes(item.userId));
  }

  async deleteByToken(token: string): Promise<void> {
    this.items = this.items.filter((item) => item.token !== token);
  }

  async deleteByTokens(tokens: string[]): Promise<void> {
    this.items = this.items.filter((item) => !tokens.includes(item.token));
  }

  async deleteForUser(userId: string, token: string): Promise<void> {
    this.items = this.items.filter(
      (item) => !(item.userId === userId && item.token === token),
    );
  }

  tokens(): string[] {
    return this.items.map((item) => item.token);
  }
}
