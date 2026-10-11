import { Module } from '@nestjs/common';
import { DbModule } from '../../db/db.module.js';
import { SystemClockProvider } from '../auth/system.clock.js';
import { PrismaUserRepository } from '../auth/user.prisma.js';
import { SchoolRulesController } from './school-rules.controller.js';
import { PrismaSchoolRuleRepository } from './school-rule.prisma.js';

@Module({
  imports: [DbModule],
  controllers: [SchoolRulesController],
  providers: [PrismaSchoolRuleRepository, PrismaUserRepository, SystemClockProvider],
})
export class SchoolRulesModule {}
