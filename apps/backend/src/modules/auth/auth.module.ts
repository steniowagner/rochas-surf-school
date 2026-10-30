import { Module } from '@nestjs/common';
import { ThrottlerModule, seconds } from '@nestjs/throttler';
import { DbModule } from '../../db/db.module.js';
import { JwtAuthModule } from '../../shared/auth/jwt-auth.module.js';
import { ClassesModule } from '../classes/classes.module.js';
import { EnrolmentModule } from '../enrolment/enrolment.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { AccountErasureJob } from './account-erasure.job.js';
import { AuthConfig } from './auth.config.js';
import { AuthController } from './auth.controller.js';
import { GoogleAuthIdTokenProvider } from './google.id-token.js';
import { HmacSignInCodeProvider } from './hmac.sign-in-code.js';
import { PrismaIdentityRepository } from './identity.prisma.js';
import { JwtTokenProvider } from './jwt.token.js';
import { PrismaRefreshTokenRepository } from './refresh-token.prisma.js';
import { ResendEmailProvider } from './resend.email.js';
import { PrismaRulesVersionProvider } from './rules-version.prisma.js';
import { SignInCodeCleanupJob } from './sign-in-code-cleanup.job.js';
import { PrismaSignInCodeRepository } from './sign-in-code.prisma.js';
import { SystemClockProvider } from './system.clock.js';
import { PeopleController } from './people.controller.js';
import { ReactivationRequestsController } from './reactivation-requests.controller.js';
import { RegistrationsController } from './registrations.controller.js';
import { PrismaUserRepository } from './user.prisma.js';

@Module({
  imports: [
    DbModule,
    JwtAuthModule,
    NotificationsModule,
    ClassesModule,
    EnrolmentModule,
    // In-memory, by client IP: the backend runs as one instance (D-13). Routes opt in with
    // @UseGuards(ClientIpThrottlerGuard).
    ThrottlerModule.forRoot({
      errorMessage: 'request.rate.limited',
      throttlers: [{ ttl: seconds(60), limit: 10 }],
    }),
  ],
  controllers: [AuthController, RegistrationsController, ReactivationRequestsController, PeopleController],
  providers: [
    AuthConfig,
    PrismaUserRepository,
    PrismaRulesVersionProvider,
    PrismaIdentityRepository,
    PrismaSignInCodeRepository,
    PrismaRefreshTokenRepository,
    HmacSignInCodeProvider,
    SystemClockProvider,
    JwtTokenProvider,
    ResendEmailProvider,
    GoogleAuthIdTokenProvider,
    SignInCodeCleanupJob,
    AccountErasureJob,
  ],
})
export class AuthModule {}
