import { Module } from '@nestjs/common';
import { DbModule } from '../../db/db.module.js';
import { AuthController } from './auth.controller.js';
import { PrismaIdentityRepository } from './identity.prisma.js';
import { PrismaRefreshTokenRepository } from './refresh-token.prisma.js';
import { PrismaSignInCodeRepository } from './sign-in-code.prisma.js';
import { PrismaUserRepository } from './user.prisma.js';

@Module({
  imports: [DbModule],
  controllers: [AuthController],
  providers: [
    PrismaUserRepository,
    PrismaIdentityRepository,
    PrismaSignInCodeRepository,
    PrismaRefreshTokenRepository,
  ],
})
export class AuthModule {}
