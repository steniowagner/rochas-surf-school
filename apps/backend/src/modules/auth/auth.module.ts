import { Module } from '@nestjs/common';
import { DbModule } from '../../db/db.module.js';
import { AuthController } from './auth.controller.js';
import { PrismaIdentityRepository } from './identity.prisma.js';
import { PrismaUserRepository } from './user.prisma.js';

@Module({
  imports: [DbModule],
  controllers: [AuthController],
  providers: [PrismaUserRepository, PrismaIdentityRepository],
})
export class AuthModule {}
