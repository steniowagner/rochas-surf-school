import { createHash } from "node:crypto";
import {
  AccessTokenSubject,
  ClockProvider,
  GeneratedRefreshToken,
  SignedAccessToken,
  TokenProvider,
} from "../../src";

/** Signs `access:<id>` tokens valid 15 minutes and numbered refresh tokens hashed with SHA-256. */
export class FakeTokenProvider implements TokenProvider {
  private issued = 0;

  constructor(private readonly clock: ClockProvider) {}

  signAccessToken(subject: AccessTokenSubject): SignedAccessToken {
    return {
      token: `access:${subject.id}`,
      expiresAt: new Date(this.clock.now().getTime() + 15 * 60 * 1000),
    };
  }

  generateRefreshToken(): GeneratedRefreshToken {
    this.issued++;
    const token = `refresh-${this.issued}`;
    return { token, hash: this.hashRefreshToken(token) };
  }

  hashRefreshToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }
}
