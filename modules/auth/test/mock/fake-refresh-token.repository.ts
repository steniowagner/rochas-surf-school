import { RefreshToken, RefreshTokenRepository } from "../../src";

export class FakeRefreshTokenRepository implements RefreshTokenRepository {
  readonly tokens: RefreshToken[] = [];

  async create(refreshToken: RefreshToken): Promise<RefreshToken> {
    this.tokens.push(refreshToken);
    return refreshToken;
  }
}
