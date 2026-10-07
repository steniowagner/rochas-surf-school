import { UseCase } from "@rochas-surf-school/shared";
import { ClockProvider } from "../../sign-in-code/provider";
import { RefreshToken } from "../model";
import {
  AccessTokenSubject,
  RefreshTokenRepository,
  TokenProvider,
} from "../provider";

const DAY_MS = 24 * 60 * 60 * 1000;

export interface StartSessionIn {
  user: AccessTokenSubject;
  refreshTokenTtlDays: number;
}

export interface StartSessionOut {
  accessToken: string;
  accessTokenExpiresAt: Date;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
}

export class StartSession implements UseCase<StartSessionIn, StartSessionOut> {
  constructor(
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly tokenProvider: TokenProvider,
    private readonly clock: ClockProvider,
  ) {}

  async execute(input: StartSessionIn): Promise<StartSessionOut> {
    const accessToken = this.tokenProvider.signAccessToken(input.user);
    const refreshToken = this.tokenProvider.generateRefreshToken();
    const refreshTokenExpiresAt = new Date(
      this.clock.now().getTime() + input.refreshTokenTtlDays * DAY_MS,
    );

    const entity = new RefreshToken({
      userId: input.user.id,
      tokenHash: refreshToken.hash,
      familyId: crypto.randomUUID(),
      expiresAt: refreshTokenExpiresAt,
    });
    entity.validate();
    await this.refreshTokenRepository.create(entity);

    return {
      accessToken: accessToken.token,
      accessTokenExpiresAt: accessToken.expiresAt,
      refreshToken: refreshToken.token,
      refreshTokenExpiresAt,
    };
  }
}
