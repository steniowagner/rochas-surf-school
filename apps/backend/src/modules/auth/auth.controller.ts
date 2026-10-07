import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  RequestSignInCode,
  RequestSignInCodeIn,
  RequestSignInCodeOut,
} from '@rochas-surf-school/auth';
import { Public } from '../../shared/decorators/public.decorator.js';
import { AuthConfig } from './auth.config.js';
import { HmacSignInCodeProvider } from './hmac.sign-in-code.js';
import { ResendEmailProvider } from './resend.email.js';
import { PrismaSignInCodeRepository } from './sign-in-code.prisma.js';
import { SystemClockProvider } from './system.clock.js';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authConfig: AuthConfig,
    private readonly signInCodeRepository: PrismaSignInCodeRepository,
    private readonly signInCodeProvider: HmacSignInCodeProvider,
    private readonly emailProvider: ResendEmailProvider,
    private readonly clock: SystemClockProvider,
  ) {}

  @Public()
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
}
