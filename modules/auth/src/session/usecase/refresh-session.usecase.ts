import { UnauthorizedError, UseCase } from "@rochas-surf-school/shared";
import { ClockProvider } from "../../sign-in-code/provider";
import { UserRepository } from "../../user/provider";
import { GetCurrentUserOut } from "../../user/usecase/get-current-user.usecase";
import { RefreshToken } from "../model";
import { RefreshTokenRepository, TokenProvider } from "../provider";
import { requireRefreshToken } from "./refresh-token-input";
import { StartSessionOut } from "./start-session.usecase";

const DAY_MS = 24 * 60 * 60 * 1000;
const INVALID = "auth.refreshToken.invalid";

export interface RefreshSessionIn {
  refreshToken: string;
}

export interface RefreshSessionOut extends StartSessionOut {
  user: GetCurrentUserOut;
}

export class RefreshSession
  implements UseCase<RefreshSessionIn, RefreshSessionOut>
{
  constructor(
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly userRepository: UserRepository,
    private readonly tokenProvider: TokenProvider,
    private readonly clock: ClockProvider,
    private readonly refreshTokenTtlDays: number,
  ) {}

  async execute(input: RefreshSessionIn): Promise<RefreshSessionOut> {
    const plaintext = requireRefreshToken(input?.refreshToken);
    const now = this.clock.now();

    const current = await this.refreshTokenRepository.findByTokenHash(
      this.tokenProvider.hashRefreshToken(plaintext),
    );
    if (!current) {
      throw new UnauthorizedError(INVALID);
    }
    if (current.revokedAt) {
      return this.rejectReuse(current, now);
    }
    if (now.getTime() >= current.expiresAt.getTime()) {
      throw new UnauthorizedError(INVALID);
    }

    const user = await this.userRepository.findById(current.userId);
    if (!user) {
      throw new UnauthorizedError(INVALID);
    }

    const rotated = await this.refreshTokenRepository.revokeIfActive(current.id, now);
    if (!rotated) {
      return this.rejectReuse(current, now);
    }

    const accessToken = this.tokenProvider.signAccessToken({
      id: user.id,
      email: user.email,
    });
    const refreshToken = this.tokenProvider.generateRefreshToken();
    const refreshTokenExpiresAt = new Date(
      now.getTime() + this.refreshTokenTtlDays * DAY_MS,
    );
    const next = new RefreshToken({
      userId: user.id,
      tokenHash: refreshToken.hash,
      familyId: current.familyId,
      expiresAt: refreshTokenExpiresAt,
    });
    next.validate();
    await this.refreshTokenRepository.create(next);

    return {
      accessToken: accessToken.token,
      accessTokenExpiresAt: accessToken.expiresAt,
      refreshToken: refreshToken.token,
      refreshTokenExpiresAt,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt,
      },
    };
  }

  /** A token that was already used: the whole sign-in (family) can't be trusted any more. */
  private async rejectReuse(token: RefreshToken, now: Date): Promise<never> {
    await this.refreshTokenRepository.revokeFamily(token.familyId, now);
    throw new UnauthorizedError(INVALID);
  }
}
