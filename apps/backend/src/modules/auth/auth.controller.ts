import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard, seconds } from '@nestjs/throttler';
import {
  GetCurrentUser,
  GetCurrentUserOut,
  RefreshSession,
  RefreshSessionIn,
  RefreshSessionOut,
  RequestSignInCode,
  RequestSignInCodeIn,
  RequestSignInCodeOut,
  StartSession,
  VerifySignInCode,
  VerifySignInCodeIn,
  VerifySignInCodeOut,
} from '@rochas-surf-school/auth';
import { CurrentUser } from '../../shared/decorators/current-user.decorator.js';
import { Public } from '../../shared/decorators/public.decorator.js';
import { AuthConfig } from './auth.config.js';
import { HmacSignInCodeProvider } from './hmac.sign-in-code.js';
import { PrismaIdentityRepository } from './identity.prisma.js';
import { JwtTokenProvider } from './jwt.token.js';
import { PrismaRefreshTokenRepository } from './refresh-token.prisma.js';
import { ResendEmailProvider } from './resend.email.js';
import { PrismaSignInCodeRepository } from './sign-in-code.prisma.js';
import { SystemClockProvider } from './system.clock.js';
import { PrismaUserRepository } from './user.prisma.js';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authConfig: AuthConfig,
    private readonly signInCodeRepository: PrismaSignInCodeRepository,
    private readonly signInCodeProvider: HmacSignInCodeProvider,
    private readonly emailProvider: ResendEmailProvider,
    private readonly clock: SystemClockProvider,
    private readonly userRepository: PrismaUserRepository,
    private readonly identityRepository: PrismaIdentityRepository,
    private readonly refreshTokenRepository: PrismaRefreshTokenRepository,
    private readonly tokenProvider: JwtTokenProvider,
  ) {}

  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: seconds(60) } })
  @Post('email/code')
  @HttpCode(HttpStatus.ACCEPTED)
  requestSignInCode(@Body() body: RequestSignInCodeIn | undefined): Promise<RequestSignInCodeOut> {
    const useCase = new RequestSignInCode(
      this.signInCodeRepository,
      this.signInCodeProvider,
      this.emailProvider,
      this.clock,
      this.authConfig.reviewCodes,
    );
    return useCase.execute({ email: body?.email as string, locale: body?.locale });
  }

  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: seconds(60) } })
  @Post('email/verify')
  @HttpCode(HttpStatus.OK)
  verifySignInCode(@Body() body: VerifySignInCodeIn | undefined): Promise<VerifySignInCodeOut> {
    const startSession = new StartSession(
      this.refreshTokenRepository,
      this.tokenProvider,
      this.clock,
    );
    const useCase = new VerifySignInCode(
      this.signInCodeRepository,
      this.userRepository,
      this.identityRepository,
      this.signInCodeProvider,
      this.clock,
      startSession,
      this.authConfig.refreshTokenTtlDays,
    );
    return useCase.execute({
      email: body?.email as string,
      code: body?.code as string,
      name: body?.name,
    });
  }

  @Get('me')
  me(@CurrentUser('id') id: string): Promise<GetCurrentUserOut> {
    return new GetCurrentUser(this.userRepository).execute({ id });
  }

  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: seconds(60) } })
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refreshSession(@Body() body: RefreshSessionIn | undefined): Promise<RefreshSessionOut> {
    const useCase = new RefreshSession(
      this.refreshTokenRepository,
      this.userRepository,
      this.tokenProvider,
      this.clock,
      this.authConfig.refreshTokenTtlDays,
    );
    return useCase.execute({ refreshToken: body?.refreshToken as string });
  }
}
