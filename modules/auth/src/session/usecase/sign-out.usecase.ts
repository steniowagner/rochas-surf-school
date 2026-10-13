import { UseCase } from "@rochas-surf-school/shared";
import { ClockProvider } from "../../sign-in-code/provider";
import {
  PushTokenRemover,
  RefreshTokenRepository,
  TokenProvider,
} from "../provider";
import { requireRefreshToken } from "./refresh-token-input";

export interface SignOutIn {
  refreshToken: string;
  /** The device's push token; typed `unknown` because it comes straight from the request body. */
  pushToken?: unknown;
}

/**
 * Ends one sign-in (the family of its current token) and, when the request names the device's push token, stops
 * pushing to it. Idempotent: an unknown, expired or revoked token changes nothing in the family; the push token of
 * a known refresh token is removed whatever its state, since it proves whose device it is.
 */
export class SignOut implements UseCase<SignOutIn, void> {
  constructor(
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly tokenProvider: TokenProvider,
    private readonly clock: ClockProvider,
    private readonly pushTokenRemover: PushTokenRemover,
  ) {}

  async execute(input: SignOutIn): Promise<void> {
    const plaintext = requireRefreshToken(input?.refreshToken);

    const token = await this.refreshTokenRepository.findByTokenHash(
      this.tokenProvider.hashRefreshToken(plaintext),
    );
    if (!token) {
      return;
    }

    if (typeof input.pushToken === "string" && input.pushToken !== "") {
      await this.pushTokenRemover.remove(token.userId, input.pushToken);
    }

    const now = this.clock.now();
    if (token.revokedAt || now.getTime() >= token.expiresAt.getTime()) {
      return;
    }

    await this.refreshTokenRepository.revokeFamily(token.familyId, now);
  }
}
