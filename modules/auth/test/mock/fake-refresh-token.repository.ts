import { RefreshToken, RefreshTokenRepository } from "../../src";

export class FakeRefreshTokenRepository implements RefreshTokenRepository {
  readonly tokens: RefreshToken[] = [];

  async create(refreshToken: RefreshToken): Promise<RefreshToken> {
    this.tokens.push(refreshToken);
    return refreshToken;
  }

  async findByTokenHash(hash: string): Promise<RefreshToken | null> {
    return this.tokens.find((item) => item.tokenHash === hash) ?? null;
  }

  async revokeIfActive(id: string, at: Date): Promise<boolean> {
    const index = this.tokens.findIndex((item) => item.id === id);
    const token = this.tokens[index];
    if (!token || token.revokedAt) return false;

    this.tokens[index] = token.clone({ revokedAt: at });
    return true;
  }

  async revokeFamily(familyId: string, at: Date): Promise<void> {
    this.tokens.forEach((token, index) => {
      if (token.familyId === familyId && !token.revokedAt) {
        this.tokens[index] = token.clone({ revokedAt: at });
      }
    });
  }
}
