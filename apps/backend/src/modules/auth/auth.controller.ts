import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Post, Put, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard, seconds } from '@nestjs/throttler';
import {
  GetCurrentUser,
  GetCurrentUserOut,
  RefreshSession,
  RefreshSessionIn,
  RefreshSessionOut,
  RequestReactivation,
  RequestReactivationOut,
  DeleteAccount,
  SetName,
  SetNameIn,
  SetNameOut,
  SetWhatsapp,
  SetWhatsappIn,
  SetWhatsappOut,
  SignInWithGoogle,
  SignInWithGoogleIn,
  SignInWithGoogleOut,
  SignOut,
  SignOutIn,
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
import { GoogleAuthIdTokenProvider } from './google.id-token.js';
import { HmacSignInCodeProvider } from './hmac.sign-in-code.js';
import { PrismaIdentityRepository } from './identity.prisma.js';
import { JwtTokenProvider } from './jwt.token.js';
import { PrismaRefreshTokenRepository } from './refresh-token.prisma.js';
import { ResendEmailProvider } from './resend.email.js';
import { PrismaRulesVersionProvider } from './rules-version.prisma.js';
import { PrismaSignInCodeRepository } from './sign-in-code.prisma.js';
import { SystemClockProvider } from './system.clock.js';
import { NotificationsPushTokenRemover } from '../notifications/notifications.push-token-remover.js';
import { NotificationsRegistrationNotifier } from '../notifications/notifications.registration-notifier.js';
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
    private readonly rulesVersionProvider: PrismaRulesVersionProvider,
    private readonly googleIdTokenProvider: GoogleAuthIdTokenProvider,
    private readonly registrationNotifier: NotificationsRegistrationNotifier,
    private readonly pushTokenRemover: NotificationsPushTokenRemover,
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
      this.rulesVersionProvider,
      this.registrationNotifier,
    );
    return useCase.execute({
      email: body?.email as string,
      code: body?.code as string,
      name: body?.name,
    });
  }

  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: seconds(60) } })
  @Post('google')
  @HttpCode(HttpStatus.OK)
  signInWithGoogle(@Body() body: SignInWithGoogleIn | undefined): Promise<SignInWithGoogleOut> {
    const startSession = new StartSession(
      this.refreshTokenRepository,
      this.tokenProvider,
      this.clock,
    );
    const useCase = new SignInWithGoogle(
      this.googleIdTokenProvider,
      this.userRepository,
      this.identityRepository,
      startSession,
      this.authConfig.refreshTokenTtlDays,
      this.rulesVersionProvider,
      this.registrationNotifier,
    );
    return useCase.execute({ idToken: body?.idToken as string, name: body?.name });
  }

  @Get('me')
  me(@CurrentUser('id') id: string): Promise<GetCurrentUserOut> {
    return new GetCurrentUser(this.userRepository, this.rulesVersionProvider).execute({ id });
  }

  @Delete('me')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteAccount(@CurrentUser('id') id: string): Promise<void> {
    return new DeleteAccount(this.userRepository, this.clock).execute({ userId: id });
  }

  @Put('me/name')
  @HttpCode(HttpStatus.OK)
  setName(
    @CurrentUser('id') id: string,
    @Body() body: Partial<Pick<SetNameIn, 'name'>> | undefined,
  ): Promise<SetNameOut> {
    return new SetName(this.userRepository, this.rulesVersionProvider).execute({
      userId: id,
      name: body?.name as string,
    });
  }

  @Put('me/whatsapp')
  @HttpCode(HttpStatus.OK)
  setWhatsapp(
    @CurrentUser('id') id: string,
    @Body() body: Partial<Pick<SetWhatsappIn, 'whatsappNumber' | 'whatsappVisible'>> | undefined,
  ): Promise<SetWhatsappOut> {
    return new SetWhatsapp(this.userRepository, this.rulesVersionProvider).execute({
      userId: id,
      whatsappNumber: body?.whatsappNumber as string,
      whatsappVisible: body?.whatsappVisible as boolean,
    });
  }

  @Post('me/reactivation-request')
  @HttpCode(HttpStatus.OK)
  requestReactivation(@CurrentUser('id') id: string): Promise<RequestReactivationOut> {
    return new RequestReactivation(this.userRepository, this.rulesVersionProvider, this.clock).execute({
      userId: id,
    });
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
      this.rulesVersionProvider,
    );
    return useCase.execute({ refreshToken: body?.refreshToken as string });
  }

  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: seconds(60) } })
  @Post('sign-out')
  @HttpCode(HttpStatus.NO_CONTENT)
  signOut(@Body() body: SignOutIn | undefined): Promise<void> {
    return new SignOut(
      this.refreshTokenRepository,
      this.tokenProvider,
      this.clock,
      this.pushTokenRemover,
    ).execute({
      refreshToken: body?.refreshToken as string,
      pushToken: body?.pushToken,
    });
  }
}
