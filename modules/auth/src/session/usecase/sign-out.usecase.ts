import { UseCase } from "@rochas-surf-school/shared";
import { ClockProvider } from "../../sign-in-code/provider";
import { RefreshTokenRepository, TokenProvider } from "../provider";
import { requireRefreshToken } from "./refresh-token-input";

export interface SignOutIn {
  refreshToken: string;
}

/** Ends one sign-in (the token's family). Idempotent: an unknown, expired or revoked token changes nothing. */
export class SignOut implements UseCase<SignOutIn, void> {
  constructor(
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly tokenProvider: TokenProvider,
    private readonly clock: ClockProvider,
  ) {}

  async execute(input: SignOutIn): Promise<void> {
    const plaintext = requireRefreshToken(input?.refreshToken);

    const token = await this.refreshTokenRepository.findByTokenHash(
      this.tokenProvider.hashRefreshToken(plaintext),
    );
    if (!token) {
      return;
    }

    await this.refreshTokenRepository.revokeFamily(token.familyId, this.clock.now());
  }
}
