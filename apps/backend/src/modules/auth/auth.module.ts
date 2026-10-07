import { Module } from '@nestjs/common';
import { DbModule } from '../../db/db.module.js';
import { JwtAuthModule } from '../../shared/auth/jwt-auth.module.js';
import { AuthConfig } from './auth.config.js';
import { AuthController } from './auth.controller.js';
import { HmacSignInCodeProvider } from './hmac.sign-in-code.js';
import { PrismaIdentityRepository } from './identity.prisma.js';
import { JwtTokenProvider } from './jwt.token.js';
import { PrismaRefreshTokenRepository } from './refresh-token.prisma.js';
import { ResendEmailProvider } from './resend.email.js';
import { PrismaSignInCodeRepository } from './sign-in-code.prisma.js';
import { SystemClockProvider } from './system.clock.js';
import { PrismaUserRepository } from './user.prisma.js';

@Module({
  imports: [DbModule, JwtAuthModule],
  controllers: [AuthController],
  providers: [
    AuthConfig,
    PrismaUserRepository,
    PrismaIdentityRepository,
    PrismaSignInCodeRepository,
    PrismaRefreshTokenRepository,
    HmacSignInCodeProvider,
    SystemClockProvider,
    JwtTokenProvider,
    ResendEmailProvider,
  ],
})
export class AuthModule {}
